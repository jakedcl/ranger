import type {
  ObservedAssignedLicense,
  ObservedGroup,
  ObservedGroupMember,
  ObservedLicenseAssignmentState,
  ObservedSku,
  ObservedUser,
  PageResult,
} from "./types.ts";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseAssignedLicense(raw: unknown): ObservedAssignedLicense | null {
  const row = asRecord(raw);
  const skuId = asString(row?.skuId);
  if (!skuId) return null;
  return {
    skuId,
    disabledPlans: asStringArray(row?.disabledPlans),
  };
}

function parseLicenseAssignmentState(raw: unknown): ObservedLicenseAssignmentState | null {
  const row = asRecord(raw);
  const skuId = asString(row?.skuId);
  const state = asString(row?.state);
  if (!skuId || !state) return null;
  return {
    skuId,
    state,
    assignedByGroup: asString(row?.assignedByGroup) ?? null,
    error: asString(row?.error) ?? null,
  };
}

/** Parse a Graph user object; tolerates missing optional fields. */
export function parseObservedUser(raw: unknown): ObservedUser | null {
  const row = asRecord(raw);
  const id = asString(row?.id);
  const userPrincipalName = asString(row?.userPrincipalName);
  if (!id || !userPrincipalName) return null;

  const assignedLicenses = Array.isArray(row?.assignedLicenses)
    ? row.assignedLicenses.map(parseAssignedLicense).filter((x): x is ObservedAssignedLicense => x !== null)
    : [];

  const licenseAssignmentStates = Array.isArray(row?.licenseAssignmentStates)
    ? row.licenseAssignmentStates
        .map(parseLicenseAssignmentState)
        .filter((x): x is ObservedLicenseAssignmentState => x !== null)
    : undefined;

  return {
    id,
    userPrincipalName,
    mail: asString(row?.mail),
    displayName: asString(row?.displayName),
    accountEnabled: asBoolean(row?.accountEnabled),
    assignedLicenses,
    ...(licenseAssignmentStates !== undefined ? { licenseAssignmentStates } : {}),
    usageLocation: row && "usageLocation" in row ? asString(row.usageLocation) : undefined,
  };
}

export function parseObservedGroup(raw: unknown): ObservedGroup | null {
  const row = asRecord(raw);
  const id = asString(row?.id);
  if (!id) return null;
  return {
    id,
    displayName: asString(row?.displayName),
    mail: asString(row?.mail),
    groupTypes: asStringArray(row?.groupTypes),
    securityEnabled: asBoolean(row?.securityEnabled),
    mailEnabled: asBoolean(row?.mailEnabled),
    membershipRule:
      row && "membershipRule" in row ? (asString(row.membershipRule) ?? null) : undefined,
  };
}

/**
 * Parse a Graph directoryObject member. Only user members yield ObservedGroupMember;
 * service principals and other types are skipped (ID/type-only limitation disclosure).
 */
export function parseObservedGroupMember(raw: unknown): ObservedGroupMember | null {
  const row = asRecord(raw);
  if (!row) return null;
  const odataType = asString(row["@odata.type"]);
  if (odataType && !odataType.toLowerCase().includes("user")) {
    return null;
  }
  const id = asString(row.id);
  if (!id) return null;
  return { userId: id };
}

export function parseObservedSku(raw: unknown): ObservedSku | null {
  const row = asRecord(raw);
  const skuId = asString(row?.skuId);
  const skuPartNumber = asString(row?.skuPartNumber);
  if (!skuId || !skuPartNumber) return null;
  const prepaid = asRecord(row?.prepaidUnits) ?? {};
  return {
    skuId,
    skuPartNumber,
    prepaidUnits: {
      enabled: asNumber(prepaid.enabled),
      suspended: asNumber(prepaid.suspended),
      warning: asNumber(prepaid.warning),
      lockedOut: asNumber(prepaid.lockedOut) ?? undefined,
    },
    consumedUnits: asNumber(row?.consumedUnits),
    capabilityStatus: asString(row?.capabilityStatus),
  };
}

type GraphCollection = {
  value?: unknown[];
  "@odata.nextLink"?: string;
};

function parseCollection<T>(
  body: unknown,
  parseItem: (raw: unknown) => T | null,
): PageResult<T> {
  const row = asRecord(body) as GraphCollection | null;
  const items = Array.isArray(row?.value)
    ? row.value.map(parseItem).filter((x): x is T => x !== null)
    : [];
  const nextLink = asString(row?.["@odata.nextLink"] ?? null);
  return { items, nextLink };
}

export function parseUserPage(body: unknown): PageResult<ObservedUser> {
  return parseCollection(body, parseObservedUser);
}

export function parseGroupPage(body: unknown): PageResult<ObservedGroup> {
  return parseCollection(body, parseObservedGroup);
}

export function parseGroupMemberPage(body: unknown): PageResult<ObservedGroupMember> {
  return parseCollection(body, parseObservedGroupMember);
}

export function parseSkuPage(body: unknown): PageResult<ObservedSku> {
  return parseCollection(body, parseObservedSku);
}

/** Selected properties for app-only user inventory (no /licenseDetails). */
export const USER_SELECT_FIELDS = [
  "id",
  "userPrincipalName",
  "mail",
  "displayName",
  "accountEnabled",
  "assignedLicenses",
  "licenseAssignmentStates",
  "usageLocation",
] as const;

export const GROUP_SELECT_FIELDS = [
  "id",
  "displayName",
  "mail",
  "groupTypes",
  "securityEnabled",
  "mailEnabled",
  "membershipRule",
] as const;
