import { describe, expect, it } from "vitest";
import {
  CAPABILITY_IDS,
  ConnectionFailed,
  DEMO_GROUP_IDS,
  DEMO_M365_BUSINESS_PREMIUM_SKU_ID,
  DemoInventoryProvider,
  UnauthorizedCollection,
} from "./index.ts";

describe("DemoInventoryProvider", () => {
  it("labels itself as synthetic demo (not live Microsoft)", async () => {
    const provider = new DemoInventoryProvider();
    expect(provider.kind).toBe("demo");
    expect(provider.label.toLowerCase()).toMatch(/demo|synthetic/);
    expect(provider.label.toLowerCase()).toMatch(/not live/);
  });

  it("paginates users across at least two pages via nextLink", async () => {
    const provider = new DemoInventoryProvider();
    const page1 = await provider.listUsers();
    expect(page1.items.length).toBeGreaterThanOrEqual(5);
    expect(page1.nextLink).toBeTruthy();
    expect(page1.items.some((u) => u.displayName === "Alex Rivera")).toBe(true);
    expect(
      page1.items.find((u) => u.displayName === "Alex Rivera")?.assignedLicenses[0]?.skuId,
    ).toBe(DEMO_M365_BUSINESS_PREMIUM_SKU_ID);

    const page2 = await provider.listUsers({ nextLink: page1.nextLink });
    expect(page2.items.length).toBeGreaterThanOrEqual(1);
    expect(page2.nextLink).toBeNull();
    expect(page2.items.some((u) => u.displayName === "Riley Quinn")).toBe(true);

    const ids = new Set([...page1.items, ...page2.items].map((u) => u.id));
    expect(ids.size).toBe(page1.items.length + page2.items.length);
  });

  it("exposes M365 Business Premium SKU — not SketchUp", async () => {
    const provider = new DemoInventoryProvider();
    const skus = await provider.listSubscribedSkus();
    expect(skus.items.some((s) => s.skuPartNumber === "O365_BUSINESS_PREMIUM")).toBe(true);
    expect(skus.items.every((s) => !/sketchup/i.test(s.skuPartNumber))).toBe(true);
  });

  it("throws UnauthorizedCollection when groups capability is denied", async () => {
    const provider = new DemoInventoryProvider({ groupsUnauthorized: true });
    const caps = await provider.listCapabilities();
    expect(caps.find((c) => c.id === CAPABILITY_IDS.groupsRead)?.granted).toBe(false);

    await expect(provider.listGroups()).rejects.toBeInstanceOf(UnauthorizedCollection);
    await expect(provider.listGroupMembers(DEMO_GROUP_IDS.designSecurity)).rejects.toBeInstanceOf(
      UnauthorizedCollection,
    );

    // Users still work
    const users = await provider.listUsers();
    expect(users.items.length).toBeGreaterThan(0);
  });

  it("simulates connection failure and recovers when toggled off", async () => {
    const provider = new DemoInventoryProvider({ connectionFailed: true });
    await expect(provider.listUsers()).rejects.toBeInstanceOf(ConnectionFailed);
    await expect(provider.listSubscribedSkus()).rejects.toBeInstanceOf(ConnectionFailed);

    const capsDown = await provider.listCapabilities();
    expect(capsDown.every((c) => c.granted === false)).toBe(true);

    provider.setConnectionFailed(false);
    const users = await provider.listUsers();
    expect(users.items[0]?.userPrincipalName).toContain("@harbor.example");

    const capsUp = await provider.listCapabilities();
    expect(capsUp.every((c) => c.granted === true)).toBe(true);
  });

  it("supports partial group member sync for only some groups", async () => {
    const provider = new DemoInventoryProvider({
      memberSyncGroupIds: [DEMO_GROUP_IDS.designSecurity],
    });

    const synced = await provider.listGroupMembers(DEMO_GROUP_IDS.designSecurity);
    expect(synced.items.length).toBeGreaterThan(0);
    expect(synced.items.every((m) => m.userId.startsWith("aaaaaaaa-"))).toBe(true);

    const skipped = await provider.listGroupMembers(DEMO_GROUP_IDS.studioM365);
    expect(skipped.items).toEqual([]);

    const none = new DemoInventoryProvider({ memberSyncGroupIds: "none" });
    expect((await none.listGroupMembers(DEMO_GROUP_IDS.allStaff)).items).toEqual([]);
  });

  it("lists Harbor-style groups including dynamic membership rule", async () => {
    const provider = new DemoInventoryProvider();
    const groups = await provider.listGroups();
    const dynamic = groups.items.find((g) => g.id === DEMO_GROUP_IDS.contractorsDynamic);
    expect(dynamic?.membershipRule).toContain("department");
    expect(dynamic?.groupTypes).toContain("DynamicMembership");
  });
});
