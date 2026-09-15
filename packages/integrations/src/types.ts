/** Provider adapter kind. Demo is synthetic; microsoft is Graph-oriented (live or fixture-backed). */
export type ProviderKind = "microsoft" | "demo";

export type CapabilityAccess = "read" | "write";
export type CapabilityExecutionMethod = "graph" | "manual" | "unsupported";

/**
 * Capability vocabulary (spec §7.2).
 * Enablement is derived from implemented ∧ granted ∧ availableInTenant.
 */
export type CapabilityState = {
  id: string;
  implemented: boolean;
  granted: boolean;
  availableInTenant: boolean;
  lastTestedAt: string | null;
  access: CapabilityAccess;
  executionMethod: CapabilityExecutionMethod;
};

/** Stable capability IDs for Microsoft inventory reads (M2). */
export const CAPABILITY_IDS = {
  usersRead: "microsoft.users.read",
  groupsRead: "microsoft.groups.read",
  groupMembersRead: "microsoft.groups.members.read",
  skusRead: "microsoft.skus.read",
} as const;

export type InventoryCapabilityId = (typeof CAPABILITY_IDS)[keyof typeof CAPABILITY_IDS];

export type ObservedAssignedLicense = {
  skuId: string;
  disabledPlans: string[];
};

/**
 * Entitlement observation from Graph — not proof of historical assignment dates
 * or supplier contract prices (spec §M2.2).
 */
export type ObservedLicenseAssignmentState = {
  skuId: string;
  state: string;
  assignedByGroup?: string | null;
  error?: string | null;
};

export type ObservedUser = {
  id: string;
  userPrincipalName: string;
  mail: string | null;
  displayName: string | null;
  accountEnabled: boolean | null;
  assignedLicenses: ObservedAssignedLicense[];
  licenseAssignmentStates?: ObservedLicenseAssignmentState[];
  usageLocation?: string | null;
};

export type ObservedGroup = {
  id: string;
  displayName: string | null;
  mail: string | null;
  groupTypes: string[];
  securityEnabled: boolean | null;
  mailEnabled: boolean | null;
  membershipRule?: string | null;
};

/** Direct user membership observation (spec §7.5). */
export type ObservedGroupMember = {
  userId: string;
};

export type ObservedSkuPrepaidUnits = {
  enabled: number | null;
  suspended: number | null;
  warning: number | null;
  lockedOut?: number | null;
};

export type ObservedSku = {
  skuId: string;
  skuPartNumber: string;
  prepaidUnits: ObservedSkuPrepaidUnits;
  consumedUnits: number | null;
  capabilityStatus: string | null;
};

export type PageResult<T> = {
  items: T[];
  nextLink: string | null;
};

export type ListPageOptions = {
  /** Opaque continuation from a previous PageResult.nextLink (demo or Graph @odata.nextLink). */
  nextLink?: string | null;
};

/**
 * Inventory read surface for M2.
 * Live Microsoft success is not claimed unless smoke-verified with an authorized tenant.
 */
export interface InventoryProvider {
  readonly kind: ProviderKind;
  /** Human-readable label; demo adapters must identify as synthetic/demo. */
  readonly label: string;
  listCapabilities(): Promise<CapabilityState[]>;
  listUsers(options?: ListPageOptions): Promise<PageResult<ObservedUser>>;
  listGroups(options?: ListPageOptions): Promise<PageResult<ObservedGroup>>;
  listGroupMembers(
    groupId: string,
    options?: ListPageOptions,
  ): Promise<PageResult<ObservedGroupMember>>;
  listSubscribedSkus(options?: ListPageOptions): Promise<PageResult<ObservedSku>>;
}
