import { describe, expect, it } from "vitest";
import { DemoLifecycleProvider } from "./demo-lifecycle.ts";

describe("Demo lifecycle provider", () => {
  it("createUser is idempotent by UPN (reconciliation, not a second account)", async () => {
    const demo = new DemoLifecycleProvider();
    const first = await demo.createUser({
      userPrincipalName: "casey@harbor.example",
      displayName: "Casey Nguyen",
      mailNickname: "casey",
      usageLocation: "US",
    });
    const second = await demo.createUser({
      userPrincipalName: "casey@harbor.example",
      displayName: "Casey Nguyen",
      mailNickname: "casey",
      usageLocation: "US",
    });
    expect(first.externalId).toBe(second.externalId);
    expect(second.verified).toBe(true);
  });

  it("can fail license assignment without losing the created user", async () => {
    const demo = new DemoLifecycleProvider({ failOn: "assignLicense" });
    const user = await demo.createUser({
      userPrincipalName: "casey@harbor.example",
      displayName: "Casey Nguyen",
      mailNickname: "casey",
      usageLocation: "US",
    });
    await expect(demo.assignLicense(user.externalId!, "sku")).rejects.toThrow(/assignLicense/);
    expect(await demo.findUserByUpn("casey@harbor.example")).not.toBeNull();
  });
});
