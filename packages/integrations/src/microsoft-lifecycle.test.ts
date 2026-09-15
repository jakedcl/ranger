import { describe, expect, it } from "vitest";
import { ConnectionFailed } from "./errors.ts";
import { graphGroupMemberRefUrl } from "./lifecycle.ts";
import { MicrosoftLifecycleProvider } from "./microsoft-lifecycle.ts";

describe("Microsoft lifecycle URLs", () => {
  it("removes members with /$ref and never a bare member object URL", () => {
    const url = graphGroupMemberRefUrl("https://graph.microsoft.com/v1.0", "group-1", "user-9");
    expect(url).toBe("https://graph.microsoft.com/v1.0/groups/group-1/members/user-9/$ref");
    expect(url.endsWith("/$ref")).toBe(true);
    expect(url.includes("/members/user-9/$ref")).toBe(true);
  });

  it("refuses live writes without credentials", async () => {
    const provider = new MicrosoftLifecycleProvider();
    await expect(provider.disableAccount("user-1")).rejects.toBeInstanceOf(ConnectionFailed);
  });

  it("DELETE uses the /$ref URL when credentials/token are injected", async () => {
    const calls: string[] = [];
    const provider = new MicrosoftLifecycleProvider({
      credentials: { tenantId: "t", clientId: "c", clientSecret: "s" },
      getAccessToken: async () => "token",
      fetch: async (input, init) => {
        calls.push(`${init?.method} ${String(input)}`);
        return new Response(null, { status: 204 });
      },
    });
    await provider.removeGroupMember("g1", "u1");
    expect(calls[0]).toBe("DELETE https://graph.microsoft.com/v1.0/groups/g1/members/u1/$ref");
  });
});
