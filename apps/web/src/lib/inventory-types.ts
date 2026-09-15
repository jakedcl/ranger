/** Local M1 inventory types (camelCase JSON). Align with API contracts when shared. */

export type PersonItStatus = "planned" | "active" | "on_leave" | "departed";
export type RecordSource = "manual" | "microsoft" | "import" | "workflow" | "demo";
export type AccountKind = "human" | "guest" | "service" | "shared_mailbox_ref";
export type EnabledState = "enabled" | "disabled" | "unknown";
export type AssignmentModel = "named_user" | "shared_device" | "organization_wide";
export type SubscriptionState = "active" | "canceled" | "expired";
export type Payer = "msp" | "company";
export type LicenseAssignmentStatus = "active" | "removal_pending" | "ended";
export type GroupType =
  | "security"
  | "microsoft_365"
  | "distribution"
  | "mail_enabled_security"
  | "manual";
export type MembershipCapability = "direct" | "dynamic" | "unsupported";
export type MembershipKind = "direct" | "inherited" | "dynamic";
export type MailboxPermission = "full_access" | "send_as" | "send_on_behalf";
export type DeviceState = "assigned" | "available" | "repair" | "returned" | "retired";
export type DeviceAssignmentStatus = "current" | "historical";
export type WorkItemStatus = "open" | "in_progress" | "blocked" | "done" | "canceled";
export type ImportBatchStatus = "preview" | "applied" | "failed" | "canceled";
export type ImportRowValidation = "valid" | "invalid" | "duplicate" | "skipped";

export type Person = {
  id: string;
  organizationId: string;
  companyId: string;
  companyName?: string;
  displayName: string;
  workEmail: string;
  roleTitle: string | null;
  department: string | null;
  sponsor: string | null;
  itStatus: PersonItStatus;
  archivedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  workflowBadge: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type Account = {
  id: string;
  organizationId: string;
  companyId: string;
  personId: string | null;
  personName?: string | null;
  providerSource: RecordSource;
  externalId: string | null;
  loginName: string;
  accountKind: AccountKind;
  enabledState: EnabledState;
  lastObservedAt: string | null;
  freshnessNote: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type Product = {
  id: string;
  organizationId: string;
  name: string;
  vendor: string;
  category: string;
  assignmentModel: AssignmentModel;
  documentationUrl: string | null;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SubscriptionPriceVersion = {
  id: string;
  subscriptionId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  unitPrice: string | null;
  priceKind: "unit" | "flat";
  cadence: string;
  source: string;
  createdAt: string;
};

export type LicenseAssignment = {
  id: string;
  companyId: string;
  personId: string | null;
  personName?: string | null;
  accountId: string | null;
  productId: string;
  productName?: string | null;
  subscriptionId: string | null;
  poolId: string | null;
  status: LicenseAssignmentStatus;
  startEffectiveDate: string | null;
  endEffectiveDate: string | null;
  dateProvenance: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type Subscription = {
  id: string;
  organizationId: string;
  companyId: string;
  companyName?: string;
  productId: string;
  productName?: string;
  productVendor?: string;
  supplier: string | null;
  externalReference: string | null;
  purchasedQuantity: number;
  assignedQuantity?: number;
  availableCapacity?: number | null;
  currency: string;
  payer: Payer;
  billingCadence: string;
  commitmentStart: string | null;
  commitmentEnd: string | null;
  renewalDate: string | null;
  state: SubscriptionState;
  currentUnitPrice?: string | null;
  priceVersions?: SubscriptionPriceVersion[];
  assignments?: LicenseAssignment[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type Group = {
  id: string;
  organizationId: string;
  companyId: string;
  externalId: string | null;
  displayName: string;
  emailAddress: string | null;
  groupType: GroupType;
  membershipCapability: MembershipCapability;
  source: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type GroupMembership = {
  id: string;
  groupId: string;
  accountId: string;
  accountLogin?: string | null;
  personName?: string | null;
  membershipKind: MembershipKind;
  startDate: string | null;
  endDate: string | null;
  verificationSource: string | null;
  status: "active" | "ended";
};

export type SharedMailbox = {
  id: string;
  organizationId: string;
  companyId: string;
  address: string;
  source: string;
  state: string;
  ownerPersonId: string | null;
  ownerName?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type MailboxAccess = {
  id: string;
  mailboxId: string;
  accountId: string;
  accountLogin?: string | null;
  permissionKind: MailboxPermission;
  startDate: string | null;
  endDate: string | null;
  source: string;
  verificationStatus: string | null;
  status: "active" | "ended";
};

export type Device = {
  id: string;
  organizationId: string;
  companyId: string;
  assetTag: string | null;
  serial: string | null;
  deviceType: string;
  hostname: string | null;
  model: string | null;
  state: DeviceState;
  source: string;
  cost: string | null;
  currency: string | null;
  currentPersonId?: string | null;
  currentPersonName?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type DeviceAssignment = {
  id: string;
  deviceId: string;
  personId: string;
  personName?: string | null;
  issuedAt: string;
  returnedAt: string | null;
  custodyDisposition: string | null;
  evidenceNote: string | null;
  status: DeviceAssignmentStatus;
};

export type WorkItem = {
  id: string;
  organizationId: string;
  companyId: string;
  companyName?: string;
  type: string;
  targetPersonId: string | null;
  targetPersonName?: string | null;
  ownerStaffUserId: string | null;
  status: WorkItemStatus;
  dueDate: string | null;
  title: string;
  description: string | null;
  completionEvidence: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type TimelineEvent = {
  id: string;
  companyId: string | null;
  entityType: string;
  entityId: string;
  eventKind: string;
  actorStaffUserId: string | null;
  effectiveAt: string | null;
  observedAt: string;
  recordedAt: string;
  source: string;
  summary: string;
};

export type ArchiveBlocker = {
  code: string;
  message: string;
  targetType?: string;
  targetId?: string;
};

export type ArchiveReadiness = {
  ready: boolean;
  blockers: ArchiveBlocker[];
};

export type PersonDetail = {
  person: Person;
  accounts: Account[];
  groupMemberships: Array<GroupMembership & { groupName?: string; groupType?: GroupType }>;
  mailboxAccess: Array<MailboxAccess & { mailboxAddress?: string }>;
  assignments: LicenseAssignment[];
  devices: Array<DeviceAssignment & { device?: Device }>;
  workItems: WorkItem[];
  timeline: TimelineEvent[];
  costSummary?: {
    currency: string;
    assignedShare: string | null;
    unknownPrices: boolean;
  }[];
};

export type ImportRow = {
  id: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  validationStatus: ImportRowValidation;
  validationErrors: string[];
  dedupeKey: string | null;
  applyStatus: string | null;
  applyResult: Record<string, unknown> | null;
};

export type ImportBatch = {
  id: string;
  companyId: string;
  resourceKind: string;
  originalFilename: string;
  status: ImportBatchStatus;
  rows: ImportRow[];
  createdAt: string;
  appliedAt: string | null;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type Paginated<T> = {
  items: T[];
  page: PageMeta;
};
