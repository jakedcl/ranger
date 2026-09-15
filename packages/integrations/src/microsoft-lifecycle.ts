import { ConnectionFailed } from "./errors.ts";
import {
  assertLifecycleCredentials,
  graphGroupMemberRefUrl,
  type LifecycleActionResult,
  type LifecycleProvider,
  type LifecycleUserInput,
} from "./lifecycle.ts";
import type { FetchLike, MicrosoftClientCredentials } from "./microsoft-provider.ts";

/**
 * Microsoft Graph lifecycle writes (M3). Live calls require authorized credentials.
 * Group member removal always uses DELETE /groups/{id}/members/{id}/$ref.
 */
export class MicrosoftLifecycleProvider implements LifecycleProvider {
  readonly kind = "microsoft" as const;
  readonly label = "Microsoft Graph lifecycle (live only with authorized credentials)";

  private readonly credentials: MicrosoftClientCredentials | null;
  private readonly fetchImpl: FetchLike;
  private readonly graphBaseUrl: string;
  private readonly getAccessToken?: () => Promise<string>;

  constructor(options: {
    credentials?: MicrosoftClientCredentials | null;
    fetch?: FetchLike;
    graphBaseUrl?: string;
    getAccessToken?: () => Promise<string>;
  } = {}) {
    this.credentials = options.credentials ?? null;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.graphBaseUrl = (options.graphBaseUrl ?? "https://graph.microsoft.com/v1.0").replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
  }

  private ensureLive(action: string): void {
    assertLifecycleCredentials(Boolean(this.credentials) || Boolean(this.getAccessToken), action);
  }

  private async token(): Promise<string> {
    if (this.getAccessToken) return this.getAccessToken();
    throw new ConnectionFailed("Token acquisition is not configured for Microsoft lifecycle writes");
  }

  private async graph(path: string, init: RequestInit): Promise<Response> {
    this.ensureLive(path);
    const token = await this.token();
    return this.fetchImpl(`${this.graphBaseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  }

  memberRefUrl(groupId: string, userId: string): string {
    return graphGroupMemberRefUrl(this.graphBaseUrl, groupId, userId);
  }

  async createUser(input: LifecycleUserInput): Promise<LifecycleActionResult> {
    const response = await this.graph("/users", {
      method: "POST",
      body: JSON.stringify({
        accountEnabled: input.accountEnabled !== false,
        displayName: input.displayName,
        mailNickname: input.mailNickname,
        userPrincipalName: input.userPrincipalName,
        usageLocation: input.usageLocation,
        passwordProfile: { forceChangePasswordNextSignIn: true, password: crypto.randomUUID() },
      }),
    });
    if (!response.ok) {
      throw new ConnectionFailed(`Graph createUser failed (${response.status})`);
    }
    const body = (await response.json()) as { id?: string };
    return {
      accepted: true,
      verified: false,
      externalId: body.id ?? null,
      evidence: "Graph accepted POST /users (verification is a later observation)",
    };
  }

  async findUserByUpn(upn: string): Promise<{ id: string; userPrincipalName: string } | null> {
    this.ensureLive("findUserByUpn");
    const filter = encodeURIComponent(`userPrincipalName eq '${upn.replaceAll("'", "''")}'`);
    const response = await this.graph(`/users?$filter=${filter}&$select=id,userPrincipalName`, { method: "GET" });
    if (!response.ok) return null;
    const body = (await response.json()) as { value?: Array<{ id: string; userPrincipalName: string }> };
    return body.value?.[0] ?? null;
  }

  async addGroupMember(groupId: string, userId: string): Promise<LifecycleActionResult> {
    const response = await this.graph(`/groups/${encodeURIComponent(groupId)}/members/$ref`, {
      method: "POST",
      body: JSON.stringify({
        "@odata.id": `${this.graphBaseUrl}/directoryObjects/${userId}`,
      }),
    });
    if (!response.ok) throw new ConnectionFailed(`Graph add member failed (${response.status})`);
    return { accepted: true, verified: false, externalId: userId, evidence: "Graph accepted POST members/$ref" };
  }

  async removeGroupMember(groupId: string, userId: string): Promise<LifecycleActionResult> {
    const url = this.memberRefUrl(groupId, userId);
    this.ensureLive("removeGroupMember");
    const token = await this.token();
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new ConnectionFailed(`Graph remove member failed (${response.status})`);
    return {
      accepted: true,
      verified: false,
      externalId: userId,
      evidence: `Graph accepted DELETE ${url}`,
    };
  }

  async assignLicense(userId: string, skuId: string): Promise<LifecycleActionResult> {
    const response = await this.graph(`/users/${encodeURIComponent(userId)}/assignLicense`, {
      method: "POST",
      body: JSON.stringify({ addLicenses: [{ skuId, disabledPlans: [] }], removeLicenses: [] }),
    });
    if (!response.ok) throw new ConnectionFailed(`Graph assignLicense failed (${response.status})`);
    return { accepted: true, verified: false, externalId: skuId, evidence: "Graph accepted assignLicense add" };
  }

  async removeLicense(userId: string, skuId: string): Promise<LifecycleActionResult> {
    const response = await this.graph(`/users/${encodeURIComponent(userId)}/assignLicense`, {
      method: "POST",
      body: JSON.stringify({ addLicenses: [], removeLicenses: [skuId] }),
    });
    if (!response.ok) throw new ConnectionFailed(`Graph assignLicense remove failed (${response.status})`);
    return { accepted: true, verified: false, externalId: skuId, evidence: "Graph accepted assignLicense remove" };
  }

  async disableAccount(userId: string): Promise<LifecycleActionResult> {
    const response = await this.graph(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ accountEnabled: false }),
    });
    if (!response.ok) throw new ConnectionFailed(`Graph disable failed (${response.status})`);
    return { accepted: true, verified: false, externalId: userId, evidence: "Graph accepted PATCH accountEnabled=false" };
  }

  async revokeSessions(userId: string): Promise<LifecycleActionResult> {
    const response = await this.graph(`/users/${encodeURIComponent(userId)}/revokeSignInSessions`, {
      method: "POST",
      body: "{}",
    });
    if (!response.ok) throw new ConnectionFailed(`Graph revokeSignInSessions failed (${response.status})`);
    return {
      accepted: true,
      verified: false,
      externalId: userId,
      evidence:
        "Graph accepted revokeSignInSessions; this is not proof every session everywhere ended instantly",
    };
  }
}
