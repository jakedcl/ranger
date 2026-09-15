import type {
  Account,
  Device,
  DeviceAssignment,
  Group,
  GroupMembership,
  LicenseAssignment,
  Mailbox,
  MailboxAccess,
  Person,
  Product,
  Subscription,
  SubscriptionPriceVersion,
  TimelineEvent,
  WorkItem,
} from "@ranger/contracts";
import type {
  AccountRow,
  DeviceAssignmentRow,
  DeviceRow,
  GroupMembershipRow,
  GroupRow,
  LicenseAssignmentRow,
  MailboxAccessRow,
  MailboxRow,
  PersonRow,
  PriceVersionRow,
  ProductRow,
  SubscriptionRow,
  TimelineEventRow,
  WorkItemRow,
} from "@ranger/db";
import { asDateString, asIso, numericToString } from "@ranger/db";

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    displayName: row.display_name,
    workEmail: row.work_email,
    roleTitle: row.role_title,
    department: row.department,
    sponsor: row.sponsor,
    itStatus: row.it_status,
    archivedAt: asIso(row.archived_at),
    startDate: asDateString(row.start_date),
    endDate: asDateString(row.end_date),
    workflowBadge: row.workflow_badge,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    personId: row.person_id,
    providerSource: row.provider_source,
    externalId: row.external_id,
    loginName: row.login_name,
    accountKind: row.account_kind,
    enabledState: row.enabled_state,
    lastObservedAt: asIso(row.last_observed_at),
    freshnessNote: row.freshness_note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    vendor: row.vendor,
    category: row.category,
    assignmentModel: row.assignment_model,
    documentationUrl: row.documentation_url,
    retiredAt: asIso(row.retired_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    productId: row.product_id,
    supplier: row.supplier,
    externalReference: row.external_reference,
    purchasedQuantity: row.purchased_quantity,
    currency: row.currency,
    payer: row.payer,
    billingCadence: row.billing_cadence,
    commitmentStart: asDateString(row.commitment_start),
    commitmentEnd: asDateString(row.commitment_end),
    renewalDate: asDateString(row.renewal_date),
    state: row.state,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toPriceVersion(row: PriceVersionRow): SubscriptionPriceVersion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    subscriptionId: row.subscription_id,
    effectiveFrom: asDateString(row.effective_from)!,
    effectiveTo: asDateString(row.effective_to),
    unitPrice: numericToString(row.unit_price),
    priceKind: row.price_kind,
    cadence: row.cadence,
    source: row.source,
    createdAt: row.created_at.toISOString(),
  };
}

export function toLicenseAssignment(
  row: LicenseAssignmentRow & { product_name?: string | null },
): LicenseAssignment & { productName?: string | null } {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    personId: row.person_id,
    accountId: row.account_id,
    productId: row.product_id,
    productName: row.product_name ?? undefined,
    subscriptionId: row.subscription_id,
    poolId: row.pool_id,
    status: row.status,
    startEffectiveDate: asDateString(row.start_effective_date),
    endEffectiveDate: asDateString(row.end_effective_date),
    dateProvenance: row.date_provenance,
    source: row.source,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    externalId: row.external_id,
    displayName: row.display_name,
    emailAddress: row.email_address,
    groupType: row.group_type as Group["groupType"],
    membershipCapability: row.membership_capability as Group["membershipCapability"],
    source: row.source,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toGroupMembership(row: GroupMembershipRow): GroupMembership {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    groupId: row.group_id,
    accountId: row.account_id,
    membershipKind: row.membership_kind as GroupMembership["membershipKind"],
    startDate: asDateString(row.start_date),
    endDate: asDateString(row.end_date),
    verificationSource: row.verification_source,
    status: row.status as GroupMembership["status"],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toMailbox(row: MailboxRow): Mailbox {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    address: row.address,
    source: row.source,
    state: row.state,
    ownerPersonId: row.owner_person_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toMailboxAccess(row: MailboxAccessRow): MailboxAccess {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    mailboxId: row.mailbox_id,
    accountId: row.account_id,
    permissionKind: row.permission_kind as MailboxAccess["permissionKind"],
    startDate: asDateString(row.start_date),
    endDate: asDateString(row.end_date),
    source: row.source,
    verificationStatus: row.verification_status,
    status: row.status as MailboxAccess["status"],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    assetTag: row.asset_tag,
    serial: row.serial,
    deviceType: row.device_type,
    hostname: row.hostname,
    model: row.model,
    state: row.state as Device["state"],
    source: row.source,
    cost: numericToString(row.cost),
    currency: row.currency,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toDeviceAssignment(row: DeviceAssignmentRow): DeviceAssignment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    deviceId: row.device_id,
    personId: row.person_id,
    issuedAt: row.issued_at.toISOString(),
    returnedAt: asIso(row.returned_at),
    custodyDisposition: row.custody_disposition,
    evidenceNote: row.evidence_note,
    status: row.status as DeviceAssignment["status"],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toWorkItem(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    type: row.type,
    targetPersonId: row.target_person_id,
    ownerStaffUserId: row.owner_staff_user_id,
    status: row.status,
    dueDate: asDateString(row.due_date),
    title: row.title,
    description: row.description,
    completionEvidence: row.completion_evidence,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

export function toTimelineEvent(row: TimelineEventRow): TimelineEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventKind: row.event_kind,
    actorStaffUserId: row.actor_staff_user_id,
    effectiveAt: asIso(row.effective_at),
    observedAt: row.observed_at.toISOString(),
    recordedAt: row.recorded_at.toISOString(),
    source: row.source,
    summary: row.summary,
  };
}
