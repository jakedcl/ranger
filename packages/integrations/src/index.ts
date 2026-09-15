export type {
  CapabilityAccess,
  CapabilityExecutionMethod,
  CapabilityState,
  InventoryCapabilityId,
  InventoryProvider,
  ListPageOptions,
  ObservedAssignedLicense,
  ObservedGroup,
  ObservedGroupMember,
  ObservedLicenseAssignmentState,
  ObservedSku,
  ObservedSkuPrepaidUnits,
  ObservedUser,
  PageResult,
  ProviderKind,
} from "./types.ts";
export { CAPABILITY_IDS } from "./types.ts";

export {
  ConnectionFailed,
  ProviderError,
  Throttled,
  TokenExpired,
  UnauthorizedCollection,
  isProviderError,
  type ProviderErrorCode,
} from "./errors.ts";

export {
  dedupeObservationsById,
  mergeObservationsById,
  shouldApplyObservation,
  type TimestampedObservation,
} from "./observations.ts";

export { buildInventoryCapabilities } from "./capabilities.ts";

export {
  DEMO_GROUP_IDS,
  DEMO_M365_BUSINESS_PREMIUM_SKU_ID,
  DemoInventoryProvider,
  type DemoInventoryProviderOptions,
} from "./demo-provider.ts";

export {
  MicrosoftInventoryProvider,
  type FetchLike,
  type MicrosoftClientCredentials,
  type MicrosoftInventoryProviderOptions,
} from "./microsoft-provider.ts";

export {
  GROUP_SELECT_FIELDS,
  USER_SELECT_FIELDS,
  parseGroupMemberPage,
  parseGroupPage,
  parseObservedGroup,
  parseObservedGroupMember,
  parseObservedSku,
  parseObservedUser,
  parseSkuPage,
  parseUserPage,
} from "./parse.ts";

export { fixturesDirectory, loadFixtureJson, type FixtureName } from "./fixtures.ts";

export {
  LIFECYCLE_CAPABILITY_IDS,
  graphGroupMemberRefUrl,
  type LifecycleActionResult,
  type LifecycleProvider,
  type LifecycleUserInput,
} from "./lifecycle.ts";
export { DemoLifecycleProvider, type DemoLifecycleFailure } from "./demo-lifecycle.ts";
export { MicrosoftLifecycleProvider } from "./microsoft-lifecycle.ts";
