import type {
  LifecycleActionResult,
  LifecycleProvider,
  LifecycleUserInput,
} from "./lifecycle.ts";

export type DemoLifecycleFailure = "assignLicense" | "createUser" | "addGroupMember" | null;

export class DemoLifecycleProvider implements LifecycleProvider {
  readonly kind = "demo" as const;
  readonly label = "Demo Microsoft lifecycle (synthetic; not live Graph)";

  private readonly users = new Map<string, { id: string; userPrincipalName: string; enabled: boolean }>();
  private readonly members = new Map<string, Set<string>>();
  private readonly licenses = new Map<string, Set<string>>();
  private failOn: DemoLifecycleFailure;

  constructor(options: { failOn?: DemoLifecycleFailure } = {}) {
    this.failOn = options.failOn ?? null;
  }

  setFailOn(failOn: DemoLifecycleFailure): void {
    this.failOn = failOn;
  }

  private ok(externalId: string | null, evidence: string, verified = false): LifecycleActionResult {
    return { accepted: true, verified, externalId, evidence };
  }

  async createUser(input: LifecycleUserInput): Promise<LifecycleActionResult> {
    if (this.failOn === "createUser") {
      throw new Error("Demo provider refused createUser");
    }
    const existing = [...this.users.values()].find((u) => u.userPrincipalName === input.userPrincipalName);
    if (existing) {
      return this.ok(existing.id, `Reconciled existing demo user ${existing.userPrincipalName}`, true);
    }
    const id = `demo-user-${this.users.size + 1}`;
    this.users.set(id, {
      id,
      userPrincipalName: input.userPrincipalName,
      enabled: input.accountEnabled !== false,
    });
    return this.ok(id, `Demo accepted createUser ${input.userPrincipalName} usageLocation=${input.usageLocation ?? "unset"}`);
  }

  async findUserByUpn(upn: string): Promise<{ id: string; userPrincipalName: string } | null> {
    return [...this.users.values()].find((u) => u.userPrincipalName.toLowerCase() === upn.toLowerCase()) ?? null;
  }

  async addGroupMember(groupId: string, userId: string): Promise<LifecycleActionResult> {
    if (this.failOn === "addGroupMember") {
      throw new Error("Demo provider refused addGroupMember");
    }
    const set = this.members.get(groupId) ?? new Set();
    set.add(userId);
    this.members.set(groupId, set);
    return this.ok(userId, `Demo accepted add member ${userId} → ${groupId}`);
  }

  async removeGroupMember(groupId: string, userId: string): Promise<LifecycleActionResult> {
    this.members.get(groupId)?.delete(userId);
    return this.ok(userId, `Demo accepted DELETE members/$ref for ${userId} in ${groupId}`);
  }

  async assignLicense(userId: string, skuId: string): Promise<LifecycleActionResult> {
    if (this.failOn === "assignLicense") {
      throw new Error("Demo provider refused assignLicense (capacity or SKU)");
    }
    const set = this.licenses.get(userId) ?? new Set();
    set.add(skuId);
    this.licenses.set(userId, set);
    return this.ok(skuId, `Demo accepted license ${skuId} for ${userId}`);
  }

  async removeLicense(userId: string, skuId: string): Promise<LifecycleActionResult> {
    this.licenses.get(userId)?.delete(skuId);
    return this.ok(skuId, `Demo accepted license removal ${skuId} for ${userId}`);
  }

  async disableAccount(userId: string): Promise<LifecycleActionResult> {
    const user = this.users.get(userId);
    if (user) user.enabled = false;
    return this.ok(userId, `Demo accepted disable ${userId}`);
  }

  async revokeSessions(userId: string): Promise<LifecycleActionResult> {
    return this.ok(
      userId,
      "Demo accepted revokeSignInSessions; this records provider acceptance, not instant end of every session",
    );
  }
}
