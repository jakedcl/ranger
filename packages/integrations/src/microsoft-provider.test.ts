import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ConnectionFailed,
  MicrosoftInventoryProvider,
  Throttled,
  TokenExpired,
  UnauthorizedCollection,
  USER_SELECT_FIELDS,
  fixturesDirectory,
  loadFixtureJson,
} from "./index.ts";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

function fixtureResponse(name: Parameters<typeof loadFixtureJson>[0], status = 200): Response {
  const raw = readFileSync(join(fixturesDirectory(), `${name}.json`), "utf8");
  return new Response(raw, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const testCredentials = {
  tenantId: "00000000-0000-4000-8000-000000000099",
  clientId: "test-client-id",
  clientSecret: "test-client-secret-not-real",
};

describe("MicrosoftInventoryProvider without credentials", () => {
  it("reports implemented but not granted capabilities", async () => {
    const provider = new MicrosoftInventoryProvider();
    expect(provider.hasCredentials()).toBe(false);
    const caps = await provider.listCapabilities();
    expect(caps.length).toBeGreaterThan(0);
    expect(caps.every((c) => c.implemented && !c.granted)).toBe(true);
  });

  it("refuses live Graph reads with ConnectionFailed", async () => {
    const fetchSpy = vi.fn();
    const provider = new MicrosoftInventoryProvider({ fetch: fetchSpy });
    await expect(provider.listUsers()).rejects.toBeInstanceOf(ConnectionFailed);
    await expect(provider.listGroups()).rejects.toBeInstanceOf(ConnectionFailed);
    await expect(provider.listSubscribedSkus()).rejects.toBeInstanceOf(ConnectionFailed);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("MicrosoftInventoryProvider with mock fetch", () => {
  it("parses users including @odata.nextLink pagination", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/oauth2/")) {
        return jsonResponse({ access_token: "tok", expires_in: 3600 });
      }
      if (url.includes("$skiptoken=demo-page-2") || url.includes("page=2")) {
        return fixtureResponse("users-page2");
      }
      if (url.includes("/users")) {
        return fixtureResponse("users-page1");
      }
      return new Response("not found", { status: 404 });
    });

    const provider = new MicrosoftInventoryProvider({
      credentials: testCredentials,
      fetch: fetchMock,
    });

    const page1 = await provider.listUsers();
    expect(page1.nextLink).toContain("demo-page-2");
    expect(page1.items.some((u) => u.displayName === "Alex Rivera")).toBe(true);

    const page2 = await provider.listUsers({ nextLink: page1.nextLink });
    expect(page2.nextLink).toBeNull();
    expect(page2.items.some((u) => u.userPrincipalName.includes("riley.quinn"))).toBe(true);

    const userCall = fetchMock.mock.calls.find(([u]) => String(u).includes("/users"));
    expect(String(userCall?.[0])).toContain("$select=");
    for (const field of USER_SELECT_FIELDS) {
      expect(String(userCall?.[0])).toContain(field);
    }
    expect(String(userCall?.[0])).not.toContain("licenseDetails");
  });

  it("parses groups, members, and subscribedSkus fixtures", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/oauth2/")) {
        return jsonResponse({ access_token: "tok", expires_in: 3600 });
      }
      if (url.includes("/subscribedSkus")) return fixtureResponse("skus");
      if (url.includes("/members")) {
        const members = loadFixtureJson<Record<string, unknown>>("group-members");
        const groupId = url.match(/groups\/([^/]+)\/members/)?.[1] ?? "";
        return jsonResponse(members[groupId] ?? { value: [] });
      }
      if (url.includes("/groups")) return fixtureResponse("groups");
      return new Response("not found", { status: 404 });
    });

    const provider = new MicrosoftInventoryProvider({
      credentials: testCredentials,
      fetch: fetchMock,
    });

    const groups = await provider.listGroups();
    expect(groups.items.length).toBe(5);

    const members = await provider.listGroupMembers(groups.items[0]!.id);
    expect(members.items.length).toBeGreaterThan(0);

    const skus = await provider.listSubscribedSkus();
    expect(skus.items[0]?.skuPartNumber).toBe("O365_BUSINESS_PREMIUM");
  });

  it("maps 403 to UnauthorizedCollection", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/oauth2/")) {
        return jsonResponse({ access_token: "tok", expires_in: 3600 });
      }
      return fixtureResponse("unauthorized-403", 403);
    });

    const provider = new MicrosoftInventoryProvider({
      credentials: testCredentials,
      fetch: fetchMock,
    });

    await expect(provider.listGroups()).rejects.toBeInstanceOf(UnauthorizedCollection);
  });

  it("maps 429 to Throttled with Retry-After", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/oauth2/")) {
        return jsonResponse({ access_token: "tok", expires_in: 3600 });
      }
      const body = loadFixtureJson<{ retryAfterSeconds?: number }>("throttle-429");
      return new Response(JSON.stringify(body), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(body.retryAfterSeconds ?? 10),
        },
      });
    });

    const provider = new MicrosoftInventoryProvider({
      credentials: testCredentials,
      fetch: fetchMock,
    });

    try {
      await provider.listUsers();
      expect.fail("expected Throttled");
    } catch (err) {
      expect(err).toBeInstanceOf(Throttled);
      expect((err as Throttled).retryAfterSeconds).toBe(12);
    }
  });

  it("maps 401 to TokenExpired and clears cache for retry", async () => {
    let tokenCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/oauth2/")) {
        tokenCalls += 1;
        return jsonResponse({ access_token: `tok-${tokenCalls}`, expires_in: 3600 });
      }
      if (tokenCalls === 1) {
        return new Response(JSON.stringify({ error: { code: "InvalidAuthenticationToken" } }), {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Bearer error="invalid_token", error_description="expired"',
          },
        });
      }
      return fixtureResponse("skus");
    });

    const provider = new MicrosoftInventoryProvider({
      credentials: testCredentials,
      fetch: fetchMock,
    });

    await expect(provider.listSubscribedSkus()).rejects.toBeInstanceOf(TokenExpired);

    const recovered = await provider.listSubscribedSkus();
    expect(recovered.items[0]?.skuId).toBeTruthy();
    expect(tokenCalls).toBeGreaterThanOrEqual(2);
  });

  it("does not request /users/{id}/licenseDetails", async () => {
    const urls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/oauth2/")) {
        return jsonResponse({ access_token: "tok", expires_in: 3600 });
      }
      return fixtureResponse("users-page2");
    });

    const provider = new MicrosoftInventoryProvider({
      credentials: testCredentials,
      fetch: fetchMock,
    });
    await provider.listUsers();
    expect(urls.every((u) => !u.includes("/licenseDetails"))).toBe(true);
  });
});
