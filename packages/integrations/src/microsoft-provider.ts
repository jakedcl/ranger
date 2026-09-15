import { buildInventoryCapabilities } from "./capabilities.ts";
import {
  ConnectionFailed,
  Throttled,
  TokenExpired,
  UnauthorizedCollection,
} from "./errors.ts";
import {
  GROUP_SELECT_FIELDS,
  USER_SELECT_FIELDS,
  parseGroupMemberPage,
  parseGroupPage,
  parseSkuPage,
  parseUserPage,
} from "./parse.ts";
import type {
  CapabilityState,
  InventoryProvider,
  ListPageOptions,
  ObservedGroup,
  ObservedGroupMember,
  ObservedSku,
  ObservedUser,
  PageResult,
} from "./types.ts";

export type MicrosoftClientCredentials = {
  tenantId: string;
  clientId: string;
  /** Never log or commit. Prefer injecting via secure config at runtime. */
  clientSecret: string;
};

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MicrosoftInventoryProviderOptions = {
  /**
   * App-only client credentials. When omitted/null, the provider refuses live Graph
   * calls and read methods throw ConnectionFailed. Capabilities stay implemented=true, granted=false.
   */
  credentials?: MicrosoftClientCredentials | null;
  /** Injectable HTTP (tests / fixtures). Defaults to global fetch. */
  fetch?: FetchLike;
  graphBaseUrl?: string;
  loginBaseUrl?: string;
  /** Override token acquisition (tests). */
  getAccessToken?: () => Promise<string>;
  /** Capability grant flags when credentials are present. Default all true. */
  grantedCapabilities?: boolean;
  lastTestedAt?: string | null;
};

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

/**
 * Microsoft Graph inventory provider (app-only / client credentials pattern).
 *
 * Endpoints used:
 * - GET /users?$select=...
 * - GET /groups?$select=...
 * - GET /groups/{id}/members
 * - GET /subscribedSkus
 *
 * Does **not** call GET /users/{id}/licenseDetails (unsupported for application permissions).
 *
 * Live tenant smoke is blocked until authorized credentials are supplied externally.
 * Without credentials this adapter still reports implemented capabilities as ungranted
 * and refuses network calls.
 */
export class MicrosoftInventoryProvider implements InventoryProvider {
  readonly kind = "microsoft" as const;
  readonly label = "Microsoft Graph inventory (app-only; live only with credentials)";

  private readonly credentials: MicrosoftClientCredentials | null;
  private readonly fetchImpl: FetchLike;
  private readonly graphBaseUrl: string;
  private readonly loginBaseUrl: string;
  private readonly getAccessTokenOverride?: () => Promise<string>;
  private readonly grantedWhenConnected: boolean;
  private readonly lastTestedAt: string | null;
  private tokenCache: TokenCache | null = null;

  constructor(options: MicrosoftInventoryProviderOptions = {}) {
    this.credentials = options.credentials ?? null;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.graphBaseUrl = (options.graphBaseUrl ?? "https://graph.microsoft.com/v1.0").replace(
      /\/$/,
      "",
    );
    this.loginBaseUrl = (options.loginBaseUrl ?? "https://login.microsoftonline.com").replace(
      /\/$/,
      "",
    );
    this.getAccessTokenOverride = options.getAccessToken;
    this.grantedWhenConnected = options.grantedCapabilities ?? true;
    this.lastTestedAt = options.lastTestedAt ?? null;
  }

  hasCredentials(): boolean {
    return Boolean(
      this.credentials?.tenantId &&
        this.credentials.clientId &&
        this.credentials.clientSecret,
    );
  }

  async listCapabilities(): Promise<CapabilityState[]> {
    const connected = this.hasCredentials();
    return buildInventoryCapabilities({
      granted: connected && this.grantedWhenConnected,
      availableInTenant: connected && this.grantedWhenConnected,
      lastTestedAt: this.lastTestedAt,
    });
  }

  async listUsers(options?: ListPageOptions): Promise<PageResult<ObservedUser>> {
    const url =
      options?.nextLink ??
      `${this.graphBaseUrl}/users?$select=${USER_SELECT_FIELDS.join(",")}`;
    return parseUserPage(await this.graphGetJson(url, "users"));
  }

  async listGroups(options?: ListPageOptions): Promise<PageResult<ObservedGroup>> {
    const url =
      options?.nextLink ??
      `${this.graphBaseUrl}/groups?$select=${GROUP_SELECT_FIELDS.join(",")}`;
    return parseGroupPage(await this.graphGetJson(url, "groups"));
  }

  async listGroupMembers(
    groupId: string,
    options?: ListPageOptions,
  ): Promise<PageResult<ObservedGroupMember>> {
    const url =
      options?.nextLink ?? `${this.graphBaseUrl}/groups/${encodeURIComponent(groupId)}/members`;
    return parseGroupMemberPage(await this.graphGetJson(url, "group_members"));
  }

  async listSubscribedSkus(options?: ListPageOptions): Promise<PageResult<ObservedSku>> {
    const url = options?.nextLink ?? `${this.graphBaseUrl}/subscribedSkus`;
    return parseSkuPage(await this.graphGetJson(url, "subscribed_skus"));
  }

  /** Clear cached token (e.g. after TokenExpired so the next call re-acquires). */
  clearTokenCache(): void {
    this.tokenCache = null;
  }

  private assertCredentials(): MicrosoftClientCredentials {
    if (!this.hasCredentials() || !this.credentials) {
      throw new ConnectionFailed(
        "MicrosoftInventoryProvider: no client credentials configured. " +
          "Refusing live Graph calls. Supply tenantId/clientId/clientSecret via secure config, " +
          "or use DemoInventoryProvider / an injectable fetch for fixture tests. " +
          "Live tenant verification remains blocked until an authorized test tenant is provided.",
      );
    }
    return this.credentials;
  }

  private async graphGetJson(url: string, collection: string): Promise<unknown> {
    this.assertCredentials();
    const token = await this.acquireAccessToken();
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new ConnectionFailed(
        `Microsoft Graph request failed for ${collection}: ${detail}`,
      );
    }

    return this.handleGraphResponse(response, collection);
  }

  private async handleGraphResponse(response: Response, collection: string): Promise<unknown> {
    if (response.status === 401) {
      this.tokenCache = null;
      const body = await safeReadText(response);
      if (looksLikeTokenExpiry(body, response)) {
        throw new TokenExpired(
          `Microsoft Graph token expired or invalid for ${collection}: ${truncate(body)}`,
        );
      }
      throw new TokenExpired(
        `Microsoft Graph returned 401 for ${collection}: ${truncate(body)}`,
      );
    }

    if (response.status === 403) {
      const body = await safeReadText(response);
      throw new UnauthorizedCollection(
        `Microsoft Graph denied ${collection}: ${truncate(body)}`,
        collection,
      );
    }

    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
      const body = await safeReadText(response);
      throw new Throttled(
        `Microsoft Graph throttled ${collection}: ${truncate(body)}`,
        retryAfter,
      );
    }

    if (!response.ok) {
      const body = await safeReadText(response);
      throw new ConnectionFailed(
        `Microsoft Graph ${response.status} for ${collection}: ${truncate(body)}`,
      );
    }

    return response.json();
  }

  private async acquireAccessToken(): Promise<string> {
    if (this.getAccessTokenOverride) {
      return this.getAccessTokenOverride();
    }

    const creds = this.assertCredentials();
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAtMs > now + 60_000) {
      return this.tokenCache.accessToken;
    }

    const tokenUrl = `${this.loginBaseUrl}/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    let response: Response;
    try {
      response = await this.fetchImpl(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new ConnectionFailed(`Microsoft token request failed: ${detail}`);
    }

    if (!response.ok) {
      const text = await safeReadText(response);
      if (response.status === 401 || response.status === 400) {
        throw new TokenExpired(`Microsoft token endpoint rejected credentials: ${truncate(text)}`);
      }
      throw new ConnectionFailed(
        `Microsoft token endpoint ${response.status}: ${truncate(text)}`,
      );
    }

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      throw new ConnectionFailed("Microsoft token endpoint returned no access_token");
    }
    const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
    this.tokenCache = {
      accessToken: json.access_token,
      expiresAtMs: now + expiresIn * 1000,
    };
    return json.access_token;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function truncate(text: string, max = 400): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }
  return null;
}

function looksLikeTokenExpiry(body: string, response: Response): boolean {
  const www = response.headers.get("WWW-Authenticate") ?? "";
  const haystack = `${body} ${www}`.toLowerCase();
  return (
    haystack.includes("invalid_token") ||
    haystack.includes("expired") ||
    haystack.includes("lifetimevalidationfailed")
  );
}
