import { describe, expect, it } from "vitest";
import {
  buildOffboardingPlan,
  buildOnboardingPlan,
  cancelLeavesCompletedWork,
  deriveRunStatus,
  executableStepKeys,
  planIsApprovable,
} from "./workflow.ts";

const groups = [
  {
    id: "g-sec",
    displayName: "Design Security",
    groupType: "security",
    membershipCapability: "direct",
    externalId: "ext-sec",
  },
  {
    id: "g-dyn",
    displayName: "Dynamic contractors",
    groupType: "manual",
    membershipCapability: "dynamic",
  },
  {
    id: "g-dist",
    displayName: "All staff",
    groupType: "distribution",
    membershipCapability: "direct",
  },
];

const subscriptions = [
  {
    id: "sub-ok",
    productId: "p1",
    productName: "SketchUp Pro",
    purchasedQuantity: 5,
    consumedQuantity: 1,
  },
  {
    id: "sub-full",
    productId: "p2",
    productName: "Microsoft 365",
    purchasedQuantity: 2,
    consumedQuantity: 2,
  },
];

describe("onboarding plan", () => {
  it("freezes bindings, capacity, and manual mailbox as a distinct step", () => {
    const plan = buildOnboardingPlan({
      companyId: "c1",
      personId: "p1",
      personEmail: "casey@harbor.example",
      personDisplayName: "Casey Nguyen",
      templateId: "t1",
      templateVersionId: "tv1",
      templateVersionNumber: 1,
      usageLocation: "US",
      intents: [
        { key: "account", kind: "create_account" },
        { key: "group", kind: "group_membership", bindingKey: "security" },
        { key: "license", kind: "license", bindingKey: "sketchup" },
        { key: "mailbox", kind: "manual_mailbox" },
      ],
      bindings: [
        { bindingKey: "security", resourceType: "group", resourceId: "g-sec" },
        { bindingKey: "sketchup", resourceType: "subscription", resourceId: "sub-ok" },
      ],
      groups,
      subscriptions,
    });
    expect(planIsApprovable(plan)).toBe(true);
    expect(plan.templateVersionId).toBe("tv1");
    expect(plan.steps.map((s) => s.kind)).toEqual([
      "create_account",
      "add_group_membership",
      "assign_license",
      "manual_mailbox",
    ]);
    expect(plan.steps[3]?.executionMethod).toBe("manual");
  });

  it("blocks dynamic groups and full license pools before approval", () => {
    const plan = buildOnboardingPlan({
      companyId: "c1",
      personId: "p1",
      personEmail: "casey@harbor.example",
      personDisplayName: "Casey Nguyen",
      templateId: "t1",
      templateVersionId: "tv1",
      templateVersionNumber: 1,
      usageLocation: "US",
      intents: [
        { key: "account", kind: "create_account" },
        { key: "group", kind: "group_membership", bindingKey: "dyn" },
        { key: "license", kind: "license", bindingKey: "m365" },
      ],
      bindings: [
        { bindingKey: "dyn", resourceType: "group", resourceId: "g-dyn" },
        { bindingKey: "m365", resourceType: "subscription", resourceId: "sub-full" },
      ],
      groups,
      subscriptions,
    });
    expect(plan.issues.map((i) => i.code).sort()).toEqual(["insufficient_capacity", "unsupported_group"]);
    expect(planIsApprovable(plan)).toBe(false);
  });

  it("turns distribution group intents into manual steps", () => {
    const plan = buildOnboardingPlan({
      companyId: "c1",
      personId: "p1",
      personEmail: "casey@harbor.example",
      personDisplayName: "Casey Nguyen",
      templateId: "t1",
      templateVersionId: "tv1",
      templateVersionNumber: 1,
      usageLocation: "US",
      intents: [{ key: "dist", kind: "group_membership", bindingKey: "dist" }],
      bindings: [{ bindingKey: "dist", resourceType: "group", resourceId: "g-dist" }],
      groups,
      subscriptions,
    });
    expect(plan.steps[0]?.kind).toBe("manual_distribution_group");
    expect(plan.steps[0]?.executionMethod).toBe("manual");
  });
});

describe("offboarding plan", () => {
  it("does not treat inherited membership or group-assigned licenses as direct removals", () => {
    const plan = buildOffboardingPlan({
      companyId: "c1",
      personId: "p1",
      accounts: [{ id: "a1", loginName: "morgan@harbor.example", accountKind: "human", enabledState: "enabled" }],
      memberships: [
        {
          id: "m1",
          groupId: "g-sec",
          groupName: "Design Security",
          groupType: "security",
          membershipCapability: "direct",
          membershipKind: "inherited",
          accountId: "a1",
        },
      ],
      assignments: [{ id: "la1", productName: "M365", assignedByGroup: true, status: "active" }],
      mailboxAccess: [{ id: "mb1", mailboxAddress: "front-desk@harbor.example" }],
    });
    expect(plan.steps.map((s) => s.kind)).toEqual([
      "disable_account",
      "revoke_sessions",
      "manual_application",
      "manual_application",
      "manual_mailbox",
    ]);
  });
});

describe("execution helpers", () => {
  it("does not retry a step whose dependencies failed", () => {
    const keys = executableStepKeys(
      [
        { key: "a", kind: "create_account", executionMethod: "graph", dependsOn: [], summary: "", params: {} },
        { key: "b", kind: "assign_license", executionMethod: "graph", dependsOn: ["a"], summary: "", params: {} },
      ],
      { a: "failed", b: "pending" },
    );
    expect(keys).toEqual([]);
  });

  it("keeps succeeded work after cancel", () => {
    expect(cancelLeavesCompletedWork("succeeded")).toBe(true);
    expect(deriveRunStatus(["succeeded", "canceled"])).toBe("canceled");
    expect(deriveRunStatus(["succeeded", "failed"])).toBe("partial");
  });
});
