import { ConnectionFailed } from "./errors.ts";

export const LIFECYCLE_CAPABILITY_IDS = {
  usersWrite: "microsoft.users.write",
  groupsMembersWrite: "microsoft.groups.members.write",
  licensesWrite: "microsoft.licenses.write",
  sessionsRevoke: "microsoft.sessions.revoke",
} as const;

export type LifecycleActionResult = {
  accepted: boolean;
  verified: boolean;
  externalId?: string | null;
  evidence: string;
};

export type LifecycleUserInput = {
  userPrincipalName: string;
  displayName: string;
  mailNickname: string;
  usageLocation?: string | null;
  accountEnabled?: boolean;
};

export interface LifecycleProvider {
  readonly kind: "demo" | "microsoft";
  readonly label: string;
  createUser(input: LifecycleUserInput): Promise<LifecycleActionResult>;
  findUserByUpn(upn: string): Promise<{ id: string; userPrincipalName: string } | null>;
  addGroupMember(groupId: string, userId: string): Promise<LifecycleActionResult>;
  /** Must DELETE .../members/{userId}/$ref — never omit /$ref. */
  removeGroupMember(groupId: string, userId: string): Promise<LifecycleActionResult>;
  assignLicense(userId: string, skuId: string): Promise<LifecycleActionResult>;
  removeLicense(userId: string, skuId: string): Promise<LifecycleActionResult>;
  disableAccount(userId: string): Promise<LifecycleActionResult>;
  revokeSessions(userId: string): Promise<LifecycleActionResult>;
}

export function graphGroupMemberRefUrl(graphBaseUrl: string, groupId: string, userId: string): string {
  const base = graphBaseUrl.replace(/\/$/, "");
  return `${base}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`;
}

export function assertLifecycleCredentials(hasCredentials: boolean, action: string): void {
  if (!hasCredentials) {
    throw new ConnectionFailed(
      `Refusing live Graph ${action}: Microsoft inventory/action credentials are not configured`,
    );
  }
}
