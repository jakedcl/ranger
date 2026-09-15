import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const uuid = z.string().uuid();
const currency = z.string().length(3).regex(/^[A-Z]{3}$/);

export const personItStatusSchema = z.enum(["planned", "active", "on_leave", "departed"]);
export const accountKindSchema = z.enum(["human", "guest", "service", "shared_mailbox_ref"]);
export const enabledStateSchema = z.enum(["enabled", "disabled", "unknown"]);
export const providerSourceSchema = z.enum(["manual", "microsoft", "import", "workflow"]);
export const assignmentModelSchema = z.enum(["named_user", "shared_device", "organization_wide"]);
export const subscriptionStateSchema = z.enum(["active", "canceled", "expired"]);
export const payerSchema = z.enum(["msp", "company"]);
export const priceKindSchema = z.enum(["unit", "flat"]);
export const licenseAssignmentStatusSchema = z.enum(["active", "removal_pending", "ended"]);
export const groupTypeSchema = z.enum([
  "security",
  "microsoft_365",
  "distribution",
  "mail_enabled_security",
  "manual",
]);
export const membershipCapabilitySchema = z.enum(["direct", "dynamic", "unsupported"]);
export const membershipKindSchema = z.enum(["direct", "inherited", "dynamic"]);
export const membershipStatusSchema = z.enum(["active", "ended"]);
export const mailboxPermissionSchema = z.enum(["full_access", "send_as", "send_on_behalf"]);
export const mailboxAccessStatusSchema = z.enum(["active", "ended"]);
export const deviceStateSchema = z.enum(["assigned", "available", "repair", "returned", "retired"]);
export const deviceAssignmentStatusSchema = z.enum(["current", "historical"]);
export const importBatchStatusSchema = z.enum(["preview", "applied", "failed", "canceled"]);
export const importRowValidationSchema = z.enum(["valid", "invalid", "duplicate", "skipped"]);
export const importRowApplySchema = z.enum(["pending", "applied", "noop", "failed", "skipped"]);

export const personSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  displayName: z.string().min(1),
  workEmail: z.string().email(),
  roleTitle: z.string().nullable(),
  department: z.string().nullable(),
  sponsor: z.string().nullable(),
  itStatus: personItStatusSchema,
  archivedAt: z.string().nullable(),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  workflowBadge: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const personCreateSchema = z.object({
  displayName: z.string().min(1).max(200),
  workEmail: z.string().email().max(320),
  roleTitle: z.string().max(200).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  sponsor: z.string().max(200).nullable().optional(),
  itStatus: personItStatusSchema.default("planned"),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  workflowBadge: z.string().max(100).nullable().optional(),
});

export const personPatchSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  workEmail: z.string().email().max(320).optional(),
  roleTitle: z.string().max(200).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  sponsor: z.string().max(200).nullable().optional(),
  itStatus: personItStatusSchema.optional(),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  workflowBadge: z.string().max(100).nullable().optional(),
  version: z.number().int(),
});

export const accountSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  personId: uuid.nullable(),
  providerSource: providerSourceSchema,
  externalId: z.string().nullable(),
  loginName: z.string(),
  accountKind: accountKindSchema,
  enabledState: enabledStateSchema,
  lastObservedAt: z.string().nullable(),
  freshnessNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const accountCreateSchema = z.object({
  loginName: z.string().min(1).max(320),
  accountKind: accountKindSchema.default("human"),
  providerSource: providerSourceSchema.default("manual"),
  externalId: z.string().max(320).nullable().optional(),
  enabledState: enabledStateSchema.default("enabled"),
  personId: uuid.nullable().optional(),
  freshnessNote: z.string().max(1000).nullable().optional(),
});

export const accountPatchSchema = z.object({
  loginName: z.string().min(1).max(320).optional(),
  accountKind: accountKindSchema.optional(),
  externalId: z.string().max(320).nullable().optional(),
  enabledState: enabledStateSchema.optional(),
  freshnessNote: z.string().max(1000).nullable().optional(),
  version: z.number().int(),
});

export const accountLinkSchema = z.object({
  personId: uuid,
  version: z.number().int(),
});

export const productSchema = z.object({
  id: uuid,
  organizationId: uuid,
  name: z.string(),
  vendor: z.string(),
  category: z.string(),
  assignmentModel: assignmentModelSchema,
  documentationUrl: z.string().nullable(),
  retiredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  vendor: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  assignmentModel: assignmentModelSchema,
  documentationUrl: z.string().url().nullable().optional(),
});

export const productPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  vendor: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  documentationUrl: z.string().url().nullable().optional(),
  version: z.number().int(),
});

export const subscriptionSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  productId: uuid,
  supplier: z.string().nullable(),
  externalReference: z.string().nullable(),
  purchasedQuantity: z.number().int().nonnegative(),
  currency: currency,
  payer: payerSchema,
  billingCadence: z.string(),
  commitmentStart: isoDate.nullable(),
  commitmentEnd: isoDate.nullable(),
  renewalDate: isoDate.nullable(),
  state: subscriptionStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const subscriptionCreateSchema = z.object({
  productId: uuid,
  supplier: z.string().max(200).nullable().optional(),
  externalReference: z.string().max(200).nullable().optional(),
  purchasedQuantity: z.number().int().nonnegative(),
  currency: currency,
  payer: payerSchema,
  billingCadence: z.string().min(1).max(50),
  commitmentStart: isoDate.nullable().optional(),
  commitmentEnd: isoDate.nullable().optional(),
  renewalDate: isoDate.nullable().optional(),
  state: subscriptionStateSchema.default("active"),
});

export const subscriptionPatchSchema = z.object({
  supplier: z.string().max(200).nullable().optional(),
  externalReference: z.string().max(200).nullable().optional(),
  purchasedQuantity: z.number().int().nonnegative().optional(),
  payer: payerSchema.optional(),
  billingCadence: z.string().min(1).max(50).optional(),
  commitmentStart: isoDate.nullable().optional(),
  commitmentEnd: isoDate.nullable().optional(),
  renewalDate: isoDate.nullable().optional(),
  state: subscriptionStateSchema.optional(),
  version: z.number().int(),
});

export const subscriptionPriceVersionSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  subscriptionId: uuid,
  effectiveFrom: isoDate,
  effectiveTo: isoDate.nullable(),
  unitPrice: z.string().nullable(),
  priceKind: priceKindSchema,
  cadence: z.string(),
  source: z.string(),
  createdAt: z.string(),
});

export const subscriptionPriceVersionCreateSchema = z.object({
  effectiveFrom: isoDate,
  effectiveTo: isoDate.nullable().optional(),
  unitPrice: z.union([z.number(), z.string()]).nullable(),
  priceKind: priceKindSchema,
  cadence: z.string().min(1).max(50),
  source: z.string().min(1).max(100),
});

export const licenseAssignmentSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  personId: uuid.nullable(),
  accountId: uuid.nullable(),
  productId: uuid,
  subscriptionId: uuid.nullable(),
  poolId: uuid.nullable(),
  status: licenseAssignmentStatusSchema,
  startEffectiveDate: isoDate.nullable(),
  endEffectiveDate: isoDate.nullable(),
  dateProvenance: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const licenseAssignSchema = z.object({
  personId: uuid.nullable().optional(),
  accountId: uuid.nullable().optional(),
  productId: uuid,
  subscriptionId: uuid.optional(),
  poolId: uuid.nullable().optional(),
  startEffectiveDate: isoDate.nullable().optional(),
  dateProvenance: z.string().max(200).nullable().optional(),
  source: z.string().min(1).max(100).default("manual"),
});

export const licenseEndSchema = z.object({
  endEffectiveDate: isoDate.nullable().optional(),
  status: z.enum(["removal_pending", "ended"]).default("ended"),
  version: z.number().int(),
});

export const licenseReassignSchema = z.object({
  toPersonId: uuid.nullable().optional(),
  toAccountId: uuid.nullable().optional(),
  endEffectiveDate: isoDate.nullable().optional(),
  startEffectiveDate: isoDate.nullable().optional(),
  dateProvenance: z.string().max(200).nullable().optional(),
  source: z.string().min(1).max(100).default("manual"),
  version: z.number().int(),
});

export const groupSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  externalId: z.string().nullable(),
  displayName: z.string(),
  emailAddress: z.string().nullable(),
  groupType: groupTypeSchema,
  membershipCapability: membershipCapabilitySchema,
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const groupCreateSchema = z.object({
  displayName: z.string().min(1).max(200),
  emailAddress: z.string().email().nullable().optional(),
  groupType: groupTypeSchema,
  membershipCapability: membershipCapabilitySchema.default("direct"),
  externalId: z.string().max(320).nullable().optional(),
  source: z.string().min(1).max(100).default("manual"),
});

export const groupPatchSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  emailAddress: z.string().email().nullable().optional(),
  membershipCapability: membershipCapabilitySchema.optional(),
  version: z.number().int(),
});

export const groupMembershipSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  groupId: uuid,
  accountId: uuid,
  membershipKind: membershipKindSchema,
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  verificationSource: z.string().nullable(),
  status: membershipStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const groupMembershipCreateSchema = z.object({
  accountId: uuid,
  membershipKind: membershipKindSchema.default("direct"),
  startDate: isoDate.nullable().optional(),
  verificationSource: z.string().max(200).nullable().optional(),
});

export const mailboxSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  address: z.string(),
  source: z.string(),
  state: z.string(),
  ownerPersonId: uuid.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const mailboxCreateSchema = z.object({
  address: z.string().email().max(320),
  source: z.string().min(1).max(100).default("manual"),
  state: z.string().min(1).max(50).default("active"),
  ownerPersonId: uuid.nullable().optional(),
});

export const mailboxPatchSchema = z.object({
  state: z.string().min(1).max(50).optional(),
  ownerPersonId: uuid.nullable().optional(),
  version: z.number().int(),
});

export const mailboxAccessSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  mailboxId: uuid,
  accountId: uuid,
  permissionKind: mailboxPermissionSchema,
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  source: z.string(),
  verificationStatus: z.string().nullable(),
  status: mailboxAccessStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mailboxAccessCreateSchema = z.object({
  accountId: uuid,
  permissionKind: mailboxPermissionSchema,
  startDate: isoDate.nullable().optional(),
  source: z.string().min(1).max(100).default("manual"),
  verificationStatus: z.string().max(100).nullable().optional(),
});

export const deviceSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  assetTag: z.string().nullable(),
  serial: z.string().nullable(),
  deviceType: z.string(),
  hostname: z.string().nullable(),
  model: z.string().nullable(),
  state: deviceStateSchema,
  source: z.string(),
  cost: z.string().nullable(),
  currency: currency.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const deviceCreateSchema = z.object({
  assetTag: z.string().max(100).nullable().optional(),
  serial: z.string().max(100).nullable().optional(),
  deviceType: z.string().min(1).max(100),
  hostname: z.string().max(200).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  state: deviceStateSchema.default("available"),
  source: z.string().min(1).max(100).default("manual"),
  cost: z.union([z.number(), z.string()]).nullable().optional(),
  currency: currency.nullable().optional(),
});

export const devicePatchSchema = z.object({
  assetTag: z.string().max(100).nullable().optional(),
  serial: z.string().max(100).nullable().optional(),
  deviceType: z.string().min(1).max(100).optional(),
  hostname: z.string().max(200).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  state: deviceStateSchema.optional(),
  cost: z.union([z.number(), z.string()]).nullable().optional(),
  currency: currency.nullable().optional(),
  version: z.number().int(),
});

export const deviceAssignmentSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  deviceId: uuid,
  personId: uuid,
  issuedAt: z.string(),
  returnedAt: z.string().nullable(),
  custodyDisposition: z.string().nullable(),
  evidenceNote: z.string().nullable(),
  status: deviceAssignmentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const deviceAssignSchema = z.object({
  personId: uuid,
  issuedAt: isoDateTime.optional(),
  custodyDisposition: z.string().max(200).nullable().optional(),
  evidenceNote: z.string().max(2000).nullable().optional(),
});

export const workItemSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid,
  type: z.string(),
  targetPersonId: uuid.nullable(),
  ownerStaffUserId: z.string().nullable(),
  status: z.string(),
  dueDate: isoDate.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  completionEvidence: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const workItemCreateSchema = z.object({
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).nullable().optional(),
  targetPersonId: uuid.nullable().optional(),
  ownerStaffUserId: z.string().nullable().optional(),
  status: z.string().min(1).max(50).default("open"),
  dueDate: isoDate.nullable().optional(),
});

export const workItemPatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).nullable().optional(),
  status: z.string().min(1).max(50).optional(),
  dueDate: isoDate.nullable().optional(),
  ownerStaffUserId: z.string().nullable().optional(),
  completionEvidence: z.string().max(4000).nullable().optional(),
  version: z.number().int(),
});

export const timelineEventSchema = z.object({
  id: uuid,
  organizationId: uuid,
  companyId: uuid.nullable(),
  entityType: z.string(),
  entityId: uuid,
  eventKind: z.string(),
  actorStaffUserId: z.string().nullable(),
  effectiveAt: z.string().nullable(),
  observedAt: z.string(),
  recordedAt: z.string(),
  source: z.string(),
  summary: z.string(),
});

export const archiveBlockerSchema = z.object({
  code: z.string(),
  message: z.string(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
});

export const archiveReadinessResultSchema = z.object({
  ready: z.boolean(),
  blockers: z.array(archiveBlockerSchema),
});

export const importPreviewRequestSchema = z.object({
  resourceKind: z.literal("people").default("people"),
  filename: z.string().min(1).max(300),
  csv: z.string().min(1).max(2_000_000),
});

export const importRowResultSchema = z.object({
  rowNumber: z.number().int(),
  validationStatus: importRowValidationSchema,
  validationErrors: z.array(z.string()),
  dedupeKey: z.string().nullable(),
  applyStatus: importRowApplySchema.nullable(),
  applyResult: z.record(z.string(), z.unknown()).nullable().optional(),
  raw: z.record(z.string(), z.string()).optional(),
});

export const importPreviewResultSchema = z.object({
  batchId: uuid,
  status: importBatchStatusSchema,
  rows: z.array(importRowResultSchema),
  validCount: z.number().int(),
  invalidCount: z.number().int(),
});

export const importApplyRequestSchema = z.object({
  batchId: uuid,
});

export const importApplyResultSchema = z.object({
  batchId: uuid,
  status: importBatchStatusSchema,
  applied: z.number().int(),
  noop: z.number().int(),
  failed: z.number().int(),
  skipped: z.number().int(),
  rows: z.array(importRowResultSchema),
});

export const costCurrencyBucketSchema = z.object({
  currency: currency,
  total: z.string(),
});

export const costSummarySchema = z.object({
  byCurrency: z.array(costCurrencyBucketSchema),
  unknownCount: z.number().int(),
});

export type Person = z.infer<typeof personSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Product = z.infer<typeof productSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type SubscriptionPriceVersion = z.infer<typeof subscriptionPriceVersionSchema>;
export type LicenseAssignment = z.infer<typeof licenseAssignmentSchema>;
export type Group = z.infer<typeof groupSchema>;
export type GroupMembership = z.infer<typeof groupMembershipSchema>;
export type Mailbox = z.infer<typeof mailboxSchema>;
export type MailboxAccess = z.infer<typeof mailboxAccessSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type DeviceAssignment = z.infer<typeof deviceAssignmentSchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type ArchiveReadinessResult = z.infer<typeof archiveReadinessResultSchema>;
export type ImportPreviewResult = z.infer<typeof importPreviewResultSchema>;
export type ImportApplyResult = z.infer<typeof importApplyResultSchema>;
export type CostSummary = z.infer<typeof costSummarySchema>;
