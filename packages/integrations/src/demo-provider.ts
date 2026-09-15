import { buildInventoryCapabilities } from "./capabilities.ts";
import { ConnectionFailed, UnauthorizedCollection } from "./errors.ts";
import { loadFixtureJson } from "./fixtures.ts";
import {
  parseGroupMemberPage,
  parseGroupPage,
  parseSkuPage,
  parseUserPage,
} from "./parse.ts";
import { CAPABILITY_IDS, type CapabilityState, type InventoryProvider, type ListPageOptions, type PageResult, type ObservedGroup, type ObservedGroupMember, type ObservedSku, type ObservedUser } from "./types.ts";

export type DemoInventoryProviderOptions = {
  /**
   * When true, every read throws ConnectionFailed (deterministic failure mode).
   * Toggle false to recover without reconstructing fixtures.
   */
  connectionFailed?: boolean;
  /**
   * When true, listGroups / listGroupMembers throw UnauthorizedCollection
   * and groupsRead capability is granted=false.
   */
  groupsUnauthorized?: boolean;
  /**
   * Partial group membership sync: only these group IDs return members.
   * Other groups return an empty page (does not imply empty membership in the tenant).
   * Default: all fixture groups.
   */
  memberSyncGroupIds?: readonly string[] | "all" | "none";
  /** Optional lastTestedAt for capability rows (ISO string). */
  lastTestedAt?: string | null;
};

const DEMO_USERS_PAGE2_TOKEN = "demo://users?page=2";

type GroupMembersFixture = Record<string, { value: unknown[] }>;

/**
 * Deterministic **demo / fixture** inventory provider for Northstar Harbor scenarios.
 * Not a live Microsoft tenant. SketchUp is manual — Microsoft SKUs use O365_BUSINESS_PREMIUM.
 */
export class DemoInventoryProvider implements InventoryProvider {
  readonly kind = "demo" as const;
  readonly label = "Demo inventory (synthetic Harbor fixtures — not live Microsoft)";

  private connectionFailed: boolean;
  private groupsUnauthorized: boolean;
  private memberSyncGroupIds: readonly string[] | "all" | "none";
  private lastTestedAt: string | null;

  constructor(options: DemoInventoryProviderOptions = {}) {
    this.connectionFailed = options.connectionFailed ?? false;
    this.groupsUnauthorized = options.groupsUnauthorized ?? false;
    this.memberSyncGroupIds = options.memberSyncGroupIds ?? "all";
    this.lastTestedAt = options.lastTestedAt ?? "2026-09-30T12:00:00.000Z";
  }

  /** Toggle connection failure without rebuilding fixtures (spec §M2.3 recover path). */
  setConnectionFailed(value: boolean): void {
    this.connectionFailed = value;
  }

  setGroupsUnauthorized(value: boolean): void {
    this.groupsUnauthorized = value;
  }

  setMemberSyncGroupIds(value: readonly string[] | "all" | "none"): void {
    this.memberSyncGroupIds = value;
  }

  async listCapabilities(): Promise<CapabilityState[]> {
    return buildInventoryCapabilities({
      granted: !this.connectionFailed,
      availableInTenant: !this.connectionFailed,
      lastTestedAt: this.lastTestedAt,
      overrides: this.groupsUnauthorized
        ? {
            [CAPABILITY_IDS.groupsRead]: { granted: false },
            [CAPABILITY_IDS.groupMembersRead]: { granted: false },
          }
        : undefined,
    });
  }

  async listUsers(options?: ListPageOptions): Promise<PageResult<ObservedUser>> {
    this.assertConnected("users");
    if (!options?.nextLink) {
      const page = parseUserPage(loadFixtureJson("users-page1"));
      return { items: page.items, nextLink: DEMO_USERS_PAGE2_TOKEN };
    }
    if (options.nextLink === DEMO_USERS_PAGE2_TOKEN || options.nextLink.includes("demo-page-2")) {
      return parseUserPage(loadFixtureJson("users-page2"));
    }
    throw new ConnectionFailed(`Demo provider: unrecognized users nextLink ${options.nextLink}`);
  }

  async listGroups(options?: ListPageOptions): Promise<PageResult<ObservedGroup>> {
    this.assertConnected("groups");
    this.assertGroupsAuthorized("groups");
    if (options?.nextLink) {
      throw new ConnectionFailed(`Demo provider: groups pagination not used (${options.nextLink})`);
    }
    return parseGroupPage(loadFixtureJson("groups"));
  }

  async listGroupMembers(
    groupId: string,
    options?: ListPageOptions,
  ): Promise<PageResult<ObservedGroupMember>> {
    this.assertConnected("group_members");
    this.assertGroupsAuthorized("group_members");
    if (options?.nextLink) {
      throw new ConnectionFailed(
        `Demo provider: group member pagination not used (${options.nextLink})`,
      );
    }

    if (!this.shouldSyncMembersFor(groupId)) {
      return { items: [], nextLink: null };
    }

    const all = loadFixtureJson<GroupMembersFixture>("group-members");
    const page = all[groupId];
    if (!page) {
      return { items: [], nextLink: null };
    }
    return parseGroupMemberPage(page);
  }

  async listSubscribedSkus(options?: ListPageOptions): Promise<PageResult<ObservedSku>> {
    this.assertConnected("subscribed_skus");
    if (options?.nextLink) {
      throw new ConnectionFailed(`Demo provider: SKU pagination not used (${options.nextLink})`);
    }
    return parseSkuPage(loadFixtureJson("skus"));
  }

  private shouldSyncMembersFor(groupId: string): boolean {
    if (this.memberSyncGroupIds === "all") return true;
    if (this.memberSyncGroupIds === "none") return false;
    return this.memberSyncGroupIds.includes(groupId);
  }

  private assertConnected(collection: string): void {
    if (this.connectionFailed) {
      throw new ConnectionFailed(
        `Demo provider: connection failure simulated for ${collection}. Toggle setConnectionFailed(false) to recover.`,
      );
    }
  }

  private assertGroupsAuthorized(collection: string): void {
    if (this.groupsUnauthorized) {
      throw new UnauthorizedCollection(
        `Demo provider: ${collection} inaccessible — capability denied (synthetic UnauthorizedCollection mode).`,
        collection,
      );
    }
  }
}

/** Well-known demo group IDs from fixtures (Harbor). */
export const DEMO_GROUP_IDS = {
  designSecurity: "bbbbbbbb-0002-4000-8000-000000000001",
  studioM365: "bbbbbbbb-0002-4000-8000-000000000002",
  allStaff: "bbbbbbbb-0002-4000-8000-000000000003",
  opsMes: "bbbbbbbb-0002-4000-8000-000000000004",
  contractorsDynamic: "bbbbbbbb-0002-4000-8000-000000000005",
} as const;

/** Microsoft 365 Business Premium SKU id used in demo fixtures (not SketchUp). */
export const DEMO_M365_BUSINESS_PREMIUM_SKU_ID = "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46";
