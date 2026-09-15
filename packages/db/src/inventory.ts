import { randomUUID } from "node:crypto";
import {
  checkNamedSeatCapacity,
  ConflictError,
  evaluateArchiveReadiness,
  NotFoundError,
  partitionByCurrency,
  UnprocessableError,
  type ArchiveReadinessResult,
  type ArchiveReadinessSnapshot,
} from "@ranger/domain";
import type { DbClient } from "./pool.ts";
import { insertAuditEvent } from "./queries.ts";

function asDateString(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function asIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function numericToString(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type PersonRow = {
  id: string;
  organization_id: string;
  company_id: string;
  display_name: string;
  work_email: string;
  role_title: string | null;
  department: string | null;
  sponsor: string | null;
  it_status: "planned" | "active" | "on_leave" | "departed";
  archived_at: Date | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  workflow_badge: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type AccountRow = {
  id: string;
  organization_id: string;
  company_id: string;
  person_id: string | null;
  provider_source: "manual" | "microsoft" | "import" | "workflow" | "demo";
  external_id: string | null;
  login_name: string;
  account_kind: "human" | "guest" | "service" | "shared_mailbox_ref";
  enabled_state: "enabled" | "disabled" | "unknown";
  last_observed_at: Date | null;
  freshness_note: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type ProductRow = {
  id: string;
  organization_id: string;
  name: string;
  vendor: string;
  category: string;
  assignment_model: "named_user" | "shared_device" | "organization_wide";
  documentation_url: string | null;
  retired_at: Date | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type SubscriptionRow = {
  id: string;
  organization_id: string;
  company_id: string;
  product_id: string;
  supplier: string | null;
  external_reference: string | null;
  purchased_quantity: number;
  currency: string;
  payer: "msp" | "company";
  billing_cadence: string;
  commitment_start: Date | string | null;
  commitment_end: Date | string | null;
  renewal_date: Date | string | null;
  state: "active" | "canceled" | "expired";
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type PriceVersionRow = {
  id: string;
  organization_id: string;
  company_id: string;
  subscription_id: string;
  effective_from: Date | string;
  effective_to: Date | string | null;
  unit_price: string | null;
  price_kind: "unit" | "flat";
  cadence: string;
  source: string;
  created_at: Date;
};

export type LicenseAssignmentRow = {
  id: string;
  organization_id: string;
  company_id: string;
  person_id: string | null;
  account_id: string | null;
  product_id: string;
  subscription_id: string | null;
  pool_id: string | null;
  status: "active" | "removal_pending" | "ended";
  start_effective_date: Date | string | null;
  end_effective_date: Date | string | null;
  date_provenance: string | null;
  source: string;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type GroupRow = {
  id: string;
  organization_id: string;
  company_id: string;
  external_id: string | null;
  display_name: string;
  email_address: string | null;
  group_type: string;
  membership_capability: string;
  source: string;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type GroupMembershipRow = {
  id: string;
  organization_id: string;
  company_id: string;
  group_id: string;
  account_id: string;
  membership_kind: string;
  start_date: Date | string | null;
  end_date: Date | string | null;
  verification_source: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type MailboxRow = {
  id: string;
  organization_id: string;
  company_id: string;
  address: string;
  source: string;
  state: string;
  owner_person_id: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type MailboxAccessRow = {
  id: string;
  organization_id: string;
  company_id: string;
  mailbox_id: string;
  account_id: string;
  permission_kind: string;
  start_date: Date | string | null;
  end_date: Date | string | null;
  source: string;
  verification_status: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type DeviceRow = {
  id: string;
  organization_id: string;
  company_id: string;
  asset_tag: string | null;
  serial: string | null;
  device_type: string;
  hostname: string | null;
  model: string | null;
  state: string;
  source: string;
  cost: string | null;
  currency: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type DeviceAssignmentRow = {
  id: string;
  organization_id: string;
  company_id: string;
  device_id: string;
  person_id: string;
  issued_at: Date;
  returned_at: Date | null;
  custody_disposition: string | null;
  evidence_note: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type WorkItemRow = {
  id: string;
  organization_id: string;
  company_id: string;
  type: string;
  target_person_id: string | null;
  owner_staff_user_id: string | null;
  status: string;
  due_date: Date | string | null;
  title: string;
  description: string | null;
  completion_evidence: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type TimelineEventRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  entity_type: string;
  entity_id: string;
  event_kind: string;
  actor_staff_user_id: string | null;
  effective_at: Date | null;
  observed_at: Date;
  recorded_at: Date;
  source: string;
  summary: string;
};

export type ImportBatchRow = {
  id: string;
  organization_id: string;
  company_id: string;
  resource_kind: string;
  original_filename: string;
  status: string;
  schema_mapping: unknown;
  created_by_staff_user_id: string | null;
  applied_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type ImportRowRow = {
  id: string;
  organization_id: string;
  company_id: string;
  batch_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  validation_status: string;
  validation_errors: unknown;
  dedupe_key: string | null;
  apply_status: string | null;
  apply_result: unknown;
  created_at: Date;
};

export type CostSummary = {
  byCurrency: Array<{ currency: string; total: string }>;
  unknownCount: number;
};

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export async function insertTimelineEvent(
  client: DbClient,
  event: {
    organizationId: string;
    companyId?: string | null;
    entityType: string;
    entityId: string;
    eventKind: string;
    actorStaffUserId?: string | null;
    effectiveAt?: Date | string | null;
    observedAt?: Date | string | null;
    source: string;
    summary: string;
  },
): Promise<TimelineEventRow> {
  const result = await client.query<TimelineEventRow>(
    `INSERT INTO timeline_events (
      organization_id, company_id, entity_type, entity_id, event_kind,
      actor_staff_user_id, effective_at, observed_at, source, summary
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, NOW()),$9,$10)
    RETURNING *`,
    [
      event.organizationId,
      event.companyId ?? null,
      event.entityType,
      event.entityId,
      event.eventKind,
      event.actorStaffUserId ?? null,
      event.effectiveAt ?? null,
      event.observedAt ?? null,
      event.source,
      event.summary,
    ],
  );
  return result.rows[0]!;
}

export async function listTimelineForEntity(
  client: DbClient,
  organizationId: string,
  entityType: string,
  entityId: string,
): Promise<TimelineEventRow[]> {
  const result = await client.query<TimelineEventRow>(
    `SELECT * FROM timeline_events
     WHERE organization_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY recorded_at DESC`,
    [organizationId, entityType, entityId],
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function listPeople(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    q?: string;
    itStatus?: string;
    includeArchived?: boolean;
  },
): Promise<PersonRow[]> {
  const params: unknown[] = [input.organizationId, input.companyId];
  const clauses = ["organization_id = $1", "company_id = $2"];

  if (!input.includeArchived) {
    clauses.push("archived_at IS NULL");
  }
  if (input.itStatus) {
    params.push(input.itStatus);
    clauses.push(`it_status = $${params.length}`);
  }
  if (input.q?.trim()) {
    params.push(`%${input.q.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(display_name) LIKE $${params.length} OR lower(work_email) LIKE $${params.length})`,
    );
  }

  const result = await client.query<PersonRow>(
    `SELECT * FROM people WHERE ${clauses.join(" AND ")} ORDER BY display_name ASC`,
    params,
  );
  return result.rows;
}

export async function getPerson(
  client: DbClient,
  organizationId: string,
  companyId: string,
  personId: string,
): Promise<PersonRow | null> {
  const result = await client.query<PersonRow>(
    `SELECT * FROM people WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, personId],
  );
  return result.rows[0] ?? null;
}

export async function createPerson(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    displayName: string;
    workEmail: string;
    roleTitle?: string | null;
    department?: string | null;
    sponsor?: string | null;
    itStatus?: PersonRow["it_status"];
    startDate?: string | null;
    endDate?: string | null;
    workflowBadge?: string | null;
    id?: string;
  },
): Promise<PersonRow> {
  const id = input.id ?? randomUUID();
  const result = await client.query<PersonRow>(
    `INSERT INTO people (
      id, organization_id, company_id, display_name, work_email, role_title, department,
      sponsor, it_status, start_date, end_date, workflow_badge
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.displayName,
      input.workEmail,
      input.roleTitle ?? null,
      input.department ?? null,
      input.sponsor ?? null,
      input.itStatus ?? "planned",
      input.startDate ?? null,
      input.endDate ?? null,
      input.workflowBadge ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function updatePerson(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    personId: string;
    version: number;
    displayName?: string;
    workEmail?: string;
    roleTitle?: string | null;
    department?: string | null;
    sponsor?: string | null;
    itStatus?: PersonRow["it_status"];
    startDate?: string | null;
    endDate?: string | null;
    workflowBadge?: string | null;
  },
): Promise<PersonRow | null> {
  const existing = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!existing) return null;
  if (existing.version !== input.version) return null;

  const result = await client.query<PersonRow>(
    `UPDATE people SET
      display_name = COALESCE($1, display_name),
      work_email = COALESCE($2, work_email),
      role_title = CASE WHEN $3::boolean THEN $4 ELSE role_title END,
      department = CASE WHEN $5::boolean THEN $6 ELSE department END,
      sponsor = CASE WHEN $7::boolean THEN $8 ELSE sponsor END,
      it_status = COALESCE($9, it_status),
      start_date = CASE WHEN $10::boolean THEN $11::date ELSE start_date END,
      end_date = CASE WHEN $12::boolean THEN $13::date ELSE end_date END,
      workflow_badge = CASE WHEN $14::boolean THEN $15 ELSE workflow_badge END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $16 AND company_id = $17 AND id = $18 AND version = $19
     RETURNING *`,
    [
      input.displayName ?? null,
      input.workEmail ?? null,
      input.roleTitle !== undefined,
      input.roleTitle ?? null,
      input.department !== undefined,
      input.department ?? null,
      input.sponsor !== undefined,
      input.sponsor ?? null,
      input.itStatus ?? null,
      input.startDate !== undefined,
      input.startDate ?? null,
      input.endDate !== undefined,
      input.endDate ?? null,
      input.workflowBadge !== undefined,
      input.workflowBadge ?? null,
      input.organizationId,
      input.companyId,
      input.personId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

export async function archivePerson(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    personId: string;
    actorStaffUserId?: string | null;
  },
): Promise<{ person: PersonRow; readiness: ArchiveReadinessResult }> {
  const readiness = await getArchiveReadiness(
    client,
    input.organizationId,
    input.companyId,
    input.personId,
  );
  if (!readiness.ready) {
    throw new UnprocessableError("Person is not ready to archive", "archive_not_ready");
  }

  const result = await client.query<PersonRow>(
    `UPDATE people
     SET archived_at = NOW(), updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND archived_at IS NULL
     RETURNING *`,
    [input.organizationId, input.companyId, input.personId],
  );
  const person = result.rows[0];
  if (!person) {
    throw new ConflictError("Person could not be archived");
  }

  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "person",
    entityId: person.id,
    eventKind: "person.archived",
    actorStaffUserId: input.actorStaffUserId,
    source: "manual",
    summary: `Archived ${person.display_name}`,
  });

  return { person, readiness };
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function listAccounts(
  client: DbClient,
  organizationId: string,
  companyId: string,
  filters?: { personId?: string },
): Promise<AccountRow[]> {
  const params: unknown[] = [organizationId, companyId];
  let sql = `SELECT * FROM accounts WHERE organization_id = $1 AND company_id = $2`;
  if (filters?.personId) {
    params.push(filters.personId);
    sql += ` AND person_id = $${params.length}`;
  }
  sql += ` ORDER BY login_name ASC`;
  const result = await client.query<AccountRow>(sql, params);
  return result.rows;
}

export async function getAccount(
  client: DbClient,
  organizationId: string,
  companyId: string,
  accountId: string,
): Promise<AccountRow | null> {
  const result = await client.query<AccountRow>(
    `SELECT * FROM accounts WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, accountId],
  );
  return result.rows[0] ?? null;
}

export async function createAccount(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    loginName: string;
    accountKind?: AccountRow["account_kind"];
    providerSource?: AccountRow["provider_source"];
    externalId?: string | null;
    enabledState?: AccountRow["enabled_state"];
    personId?: string | null;
    freshnessNote?: string | null;
    id?: string;
  },
): Promise<AccountRow> {
  if (input.personId) {
    const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
    if (!person) throw new NotFoundError("Person not found in this company");
  }
  const id = input.id ?? randomUUID();
  const result = await client.query<AccountRow>(
    `INSERT INTO accounts (
      id, organization_id, company_id, person_id, provider_source, external_id,
      login_name, account_kind, enabled_state, freshness_note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.personId ?? null,
      input.providerSource ?? "manual",
      input.externalId ?? null,
      input.loginName,
      input.accountKind ?? "human",
      input.enabledState ?? "enabled",
      input.freshnessNote ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function updateAccount(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    accountId: string;
    version: number;
    loginName?: string;
    accountKind?: AccountRow["account_kind"];
    externalId?: string | null;
    enabledState?: AccountRow["enabled_state"];
    freshnessNote?: string | null;
  },
): Promise<AccountRow | null> {
  const result = await client.query<AccountRow>(
    `UPDATE accounts SET
      login_name = COALESCE($1, login_name),
      account_kind = COALESCE($2, account_kind),
      external_id = CASE WHEN $3::boolean THEN $4 ELSE external_id END,
      enabled_state = COALESCE($5, enabled_state),
      freshness_note = CASE WHEN $6::boolean THEN $7 ELSE freshness_note END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $8 AND company_id = $9 AND id = $10 AND version = $11
     RETURNING *`,
    [
      input.loginName ?? null,
      input.accountKind ?? null,
      input.externalId !== undefined,
      input.externalId ?? null,
      input.enabledState ?? null,
      input.freshnessNote !== undefined,
      input.freshnessNote ?? null,
      input.organizationId,
      input.companyId,
      input.accountId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

export async function linkAccountToPerson(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    accountId: string;
    personId: string;
    version: number;
    actorStaffUserId?: string | null;
  },
): Promise<AccountRow> {
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found in this company");

  const result = await client.query<AccountRow>(
    `UPDATE accounts
     SET person_id = $1, updated_at = NOW(), version = version + 1
     WHERE organization_id = $2 AND company_id = $3 AND id = $4 AND version = $5
     RETURNING *`,
    [input.personId, input.organizationId, input.companyId, input.accountId, input.version],
  );
  const account = result.rows[0];
  if (!account) throw new ConflictError("Account changed since you loaded it");

  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "account",
    entityId: account.id,
    eventKind: "account.linked",
    actorStaffUserId: input.actorStaffUserId,
    source: "manual",
    summary: `Linked account ${account.login_name} to person ${person.display_name}`,
  });
  await insertAuditEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    actorStaffUserId: input.actorStaffUserId,
    action: "account.link",
    targetType: "account",
    targetId: account.id,
    summary: `Linked to person ${person.id}`,
  });
  return account;
}

export async function unlinkAccountFromPerson(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    accountId: string;
    version: number;
    actorStaffUserId?: string | null;
  },
): Promise<AccountRow> {
  const existing = await getAccount(
    client,
    input.organizationId,
    input.companyId,
    input.accountId,
  );
  if (!existing) throw new NotFoundError("Account not found");
  if (existing.version !== input.version) {
    throw new ConflictError("Account changed since you loaded it");
  }

  const personId = existing.person_id;
  let person: PersonRow | null = null;
  if (personId) {
    person = await getPerson(client, input.organizationId, input.companyId, personId);
  }

  const result = await client.query<AccountRow>(
    `UPDATE accounts
     SET person_id = NULL, updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND version = $4
     RETURNING *`,
    [input.organizationId, input.companyId, input.accountId, input.version],
  );
  const account = result.rows[0];
  if (!account) throw new ConflictError("Account changed since you loaded it");

  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "account",
    entityId: account.id,
    eventKind: "account.unlinked",
    actorStaffUserId: input.actorStaffUserId,
    source: "manual",
    summary: `Unlinked account ${account.login_name}${person ? ` from ${person.display_name}` : ""}`,
  });
  await insertAuditEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    actorStaffUserId: input.actorStaffUserId,
    action: "account.unlink",
    targetType: "account",
    targetId: account.id,
    summary: personId ? `Unlinked from person ${personId}` : "Unlinked",
    beforeSummary: personId,
    afterSummary: null,
  });

  if (person && (person.it_status === "departed" || person.it_status === "active")) {
    const activeAssignments = await client.query<{ id: string }>(
      `SELECT id FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND account_id = $3
         AND status IN ('active', 'removal_pending')`,
      [input.organizationId, input.companyId, account.id],
    );
    for (const assignment of activeAssignments.rows) {
      await client.query(
        `INSERT INTO offboarding_obligations (
          id, organization_id, company_id, person_id, obligation_kind,
          target_type, target_id, status
        ) VALUES ($1,$2,$3,$4,'license_assignment','license_assignment',$5,'open')`,
        [randomUUID(), input.organizationId, input.companyId, person.id, assignment.id],
      );
    }
    if (person.it_status === "departed" || activeAssignments.rows.length > 0) {
      await client.query(
        `INSERT INTO offboarding_obligations (
          id, organization_id, company_id, person_id, obligation_kind,
          target_type, target_id, status
        ) VALUES ($1,$2,$3,$4,'account_unlink','account',$5,'open')`,
        [randomUUID(), input.organizationId, input.companyId, person.id, account.id],
      );
    }
  }

  return account;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listProducts(client: DbClient, organizationId: string): Promise<ProductRow[]> {
  const result = await client.query<ProductRow>(
    `SELECT * FROM products WHERE organization_id = $1 ORDER BY name ASC`,
    [organizationId],
  );
  return result.rows;
}

export async function getProduct(
  client: DbClient,
  organizationId: string,
  productId: string,
): Promise<ProductRow | null> {
  const result = await client.query<ProductRow>(
    `SELECT * FROM products WHERE organization_id = $1 AND id = $2`,
    [organizationId, productId],
  );
  return result.rows[0] ?? null;
}

export async function createProduct(
  client: DbClient,
  input: {
    organizationId: string;
    name: string;
    vendor: string;
    category: string;
    assignmentModel: ProductRow["assignment_model"];
    documentationUrl?: string | null;
    id?: string;
  },
): Promise<ProductRow> {
  const id = input.id ?? randomUUID();
  const result = await client.query<ProductRow>(
    `INSERT INTO products (
      id, organization_id, name, vendor, category, assignment_model, documentation_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.name,
      input.vendor,
      input.category,
      input.assignmentModel,
      input.documentationUrl ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function updateProduct(
  client: DbClient,
  input: {
    organizationId: string;
    productId: string;
    version: number;
    name?: string;
    vendor?: string;
    category?: string;
    documentationUrl?: string | null;
  },
): Promise<ProductRow | null> {
  const result = await client.query<ProductRow>(
    `UPDATE products SET
      name = COALESCE($1, name),
      vendor = COALESCE($2, vendor),
      category = COALESCE($3, category),
      documentation_url = CASE WHEN $4::boolean THEN $5 ELSE documentation_url END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $6 AND id = $7 AND version = $8
     RETURNING *`,
    [
      input.name ?? null,
      input.vendor ?? null,
      input.category ?? null,
      input.documentationUrl !== undefined,
      input.documentationUrl ?? null,
      input.organizationId,
      input.productId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

export async function retireProduct(
  client: DbClient,
  organizationId: string,
  productId: string,
  version: number,
): Promise<ProductRow | null> {
  const result = await client.query<ProductRow>(
    `UPDATE products
     SET retired_at = NOW(), updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND id = $2 AND version = $3 AND retired_at IS NULL
     RETURNING *`,
    [organizationId, productId, version],
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Subscriptions + price versions
// ---------------------------------------------------------------------------

export async function listSubscriptions(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<SubscriptionRow[]> {
  const result = await client.query<SubscriptionRow>(
    `SELECT * FROM subscriptions
     WHERE organization_id = $1 AND company_id = $2
     ORDER BY created_at DESC`,
    [organizationId, companyId],
  );
  return result.rows;
}

export async function getSubscription(
  client: DbClient,
  organizationId: string,
  companyId: string,
  subscriptionId: string,
): Promise<SubscriptionRow | null> {
  const result = await client.query<SubscriptionRow>(
    `SELECT * FROM subscriptions
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, subscriptionId],
  );
  return result.rows[0] ?? null;
}

export async function createSubscription(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    productId: string;
    supplier?: string | null;
    externalReference?: string | null;
    purchasedQuantity: number;
    currency: string;
    payer: "msp" | "company";
    billingCadence: string;
    commitmentStart?: string | null;
    commitmentEnd?: string | null;
    renewalDate?: string | null;
    state?: SubscriptionRow["state"];
    id?: string;
  },
): Promise<SubscriptionRow> {
  const product = await getProduct(client, input.organizationId, input.productId);
  if (!product) throw new NotFoundError("Product not found");
  if (product.retired_at) {
    throw new UnprocessableError("Cannot create subscription for retired product", "product_retired");
  }

  const id = input.id ?? randomUUID();
  const result = await client.query<SubscriptionRow>(
    `INSERT INTO subscriptions (
      id, organization_id, company_id, product_id, supplier, external_reference,
      purchased_quantity, currency, payer, billing_cadence,
      commitment_start, commitment_end, renewal_date, state
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.productId,
      input.supplier ?? null,
      input.externalReference ?? null,
      input.purchasedQuantity,
      input.currency,
      input.payer,
      input.billingCadence,
      input.commitmentStart ?? null,
      input.commitmentEnd ?? null,
      input.renewalDate ?? null,
      input.state ?? "active",
    ],
  );
  return result.rows[0]!;
}

export async function updateSubscription(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    subscriptionId: string;
    version: number;
    supplier?: string | null;
    externalReference?: string | null;
    purchasedQuantity?: number;
    payer?: "msp" | "company";
    billingCadence?: string;
    commitmentStart?: string | null;
    commitmentEnd?: string | null;
    renewalDate?: string | null;
    state?: SubscriptionRow["state"];
  },
): Promise<SubscriptionRow | null> {
  const result = await client.query<SubscriptionRow>(
    `UPDATE subscriptions SET
      supplier = CASE WHEN $1::boolean THEN $2 ELSE supplier END,
      external_reference = CASE WHEN $3::boolean THEN $4 ELSE external_reference END,
      purchased_quantity = COALESCE($5, purchased_quantity),
      payer = COALESCE($6, payer),
      billing_cadence = COALESCE($7, billing_cadence),
      commitment_start = CASE WHEN $8::boolean THEN $9::date ELSE commitment_start END,
      commitment_end = CASE WHEN $10::boolean THEN $11::date ELSE commitment_end END,
      renewal_date = CASE WHEN $12::boolean THEN $13::date ELSE renewal_date END,
      state = COALESCE($14, state),
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $15 AND company_id = $16 AND id = $17 AND version = $18
     RETURNING *`,
    [
      input.supplier !== undefined,
      input.supplier ?? null,
      input.externalReference !== undefined,
      input.externalReference ?? null,
      input.purchasedQuantity ?? null,
      input.payer ?? null,
      input.billingCadence ?? null,
      input.commitmentStart !== undefined,
      input.commitmentStart ?? null,
      input.commitmentEnd !== undefined,
      input.commitmentEnd ?? null,
      input.renewalDate !== undefined,
      input.renewalDate ?? null,
      input.state ?? null,
      input.organizationId,
      input.companyId,
      input.subscriptionId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listPriceVersions(
  client: DbClient,
  organizationId: string,
  companyId: string,
  subscriptionId: string,
): Promise<PriceVersionRow[]> {
  const result = await client.query<PriceVersionRow>(
    `SELECT * FROM subscription_price_versions
     WHERE organization_id = $1 AND company_id = $2 AND subscription_id = $3
     ORDER BY effective_from DESC, created_at DESC`,
    [organizationId, companyId, subscriptionId],
  );
  return result.rows;
}

export async function appendPriceVersion(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    subscriptionId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    unitPrice: number | string | null;
    priceKind: "unit" | "flat";
    cadence: string;
    source: string;
    id?: string;
  },
): Promise<PriceVersionRow> {
  const subscription = await getSubscription(
    client,
    input.organizationId,
    input.companyId,
    input.subscriptionId,
  );
  if (!subscription) throw new NotFoundError("Subscription not found");

  // Close prior open version ending the day before new effective_from when overlapping open.
  await client.query(
    `UPDATE subscription_price_versions
     SET effective_to = ($4::date - INTERVAL '1 day')::date
     WHERE organization_id = $1 AND company_id = $2 AND subscription_id = $3
       AND effective_to IS NULL
       AND effective_from < $4::date`,
    [input.organizationId, input.companyId, input.subscriptionId, input.effectiveFrom],
  );

  const id = input.id ?? randomUUID();
  const result = await client.query<PriceVersionRow>(
    `INSERT INTO subscription_price_versions (
      id, organization_id, company_id, subscription_id, effective_from, effective_to,
      unit_price, price_kind, cadence, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.subscriptionId,
      input.effectiveFrom,
      input.effectiveTo ?? null,
      input.unitPrice,
      input.priceKind,
      input.cadence,
      input.source,
    ],
  );
  return result.rows[0]!;
}

// ---------------------------------------------------------------------------
// License assignments (capacity-checked)
// ---------------------------------------------------------------------------

export async function listLicenseAssignments(
  client: DbClient,
  organizationId: string,
  companyId: string,
  filters?: { personId?: string; subscriptionId?: string; productId?: string },
): Promise<LicenseAssignmentRow[]> {
  const params: unknown[] = [organizationId, companyId];
  const clauses = ["organization_id = $1", "company_id = $2"];
  if (filters?.personId) {
    params.push(filters.personId);
    clauses.push(`person_id = $${params.length}`);
  }
  if (filters?.subscriptionId) {
    params.push(filters.subscriptionId);
    clauses.push(`subscription_id = $${params.length}`);
  }
  if (filters?.productId) {
    params.push(filters.productId);
    clauses.push(`product_id = $${params.length}`);
  }
  const result = await client.query<LicenseAssignmentRow>(
    `SELECT * FROM license_assignments WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC`,
    params,
  );
  return result.rows;
}

export async function getLicenseAssignment(
  client: DbClient,
  organizationId: string,
  companyId: string,
  assignmentId: string,
): Promise<LicenseAssignmentRow | null> {
  const result = await client.query<LicenseAssignmentRow>(
    `SELECT * FROM license_assignments
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, assignmentId],
  );
  return result.rows[0] ?? null;
}

async function assertSameCompanyRefs(
  client: DbClient,
  organizationId: string,
  companyId: string,
  refs: { personId?: string | null; accountId?: string | null },
): Promise<void> {
  if (refs.personId) {
    const person = await getPerson(client, organizationId, companyId, refs.personId);
    if (!person) throw new NotFoundError("Person not found in this company");
  }
  if (refs.accountId) {
    const account = await getAccount(client, organizationId, companyId, refs.accountId);
    if (!account) throw new NotFoundError("Account not found in this company");
  }
}

export async function assignLicense(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    personId?: string | null;
    accountId?: string | null;
    productId: string;
    subscriptionId?: string | null;
    poolId?: string | null;
    startEffectiveDate?: string | null;
    dateProvenance?: string | null;
    source?: string;
    id?: string;
    actorStaffUserId?: string | null;
  },
): Promise<LicenseAssignmentRow> {
  if (!input.personId && !input.accountId) {
    throw new UnprocessableError("personId or accountId is required");
  }
  await assertSameCompanyRefs(client, input.organizationId, input.companyId, input);

  const product = await getProduct(client, input.organizationId, input.productId);
  if (!product) throw new NotFoundError("Product not found");
  if (product.assignment_model !== "named_user") {
    throw new UnprocessableError(
      "Only named_user products create person/account license assignments",
      "assignment_model",
    );
  }
  if (product.retired_at) {
    throw new UnprocessableError("Cannot assign retired product", "product_retired");
  }

  if (input.subscriptionId) {
    const locked = await client.query<SubscriptionRow>(
      `SELECT * FROM subscriptions
       WHERE organization_id = $1 AND company_id = $2 AND id = $3
       FOR UPDATE`,
      [input.organizationId, input.companyId, input.subscriptionId],
    );
    const subscription = locked.rows[0];
    if (!subscription) throw new NotFoundError("Subscription not found in this company");
    if (subscription.product_id !== input.productId) {
      throw new UnprocessableError("Subscription product mismatch");
    }

    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND subscription_id = $3
         AND status IN ('active', 'removal_pending')`,
      [input.organizationId, input.companyId, input.subscriptionId],
    );
    const consumed = Number(countResult.rows[0]?.count ?? 0);
    const capacity = checkNamedSeatCapacity({
      purchasedQuantity: subscription.purchased_quantity,
      consumedQuantity: consumed,
      requestedQuantity: 1,
    });
    if (!capacity.ok) {
      throw new ConflictError(
        `Insufficient named seats: ${capacity.available} available, ${capacity.requested} requested`,
      );
    }
  }

  const id = input.id ?? randomUUID();
  const result = await client.query<LicenseAssignmentRow>(
    `INSERT INTO license_assignments (
      id, organization_id, company_id, person_id, account_id, product_id,
      subscription_id, pool_id, status, start_effective_date, date_provenance, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.personId ?? null,
      input.accountId ?? null,
      input.productId,
      input.subscriptionId ?? null,
      input.poolId ?? null,
      input.startEffectiveDate ?? null,
      input.dateProvenance ?? null,
      input.source ?? "manual",
    ],
  );
  const assignment = result.rows[0]!;

  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "license_assignment",
    entityId: assignment.id,
    eventKind: "license.assigned",
    actorStaffUserId: input.actorStaffUserId,
    effectiveAt: input.startEffectiveDate ?? null,
    source: input.source ?? "manual",
    summary: "License assignment created",
  });

  return assignment;
}

export async function endLicenseAssignment(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    assignmentId: string;
    version: number;
    endEffectiveDate?: string | null;
    status?: "removal_pending" | "ended";
    actorStaffUserId?: string | null;
  },
): Promise<LicenseAssignmentRow> {
  const result = await client.query<LicenseAssignmentRow>(
    `UPDATE license_assignments SET
      status = $1,
      end_effective_date = COALESCE($2::date, end_effective_date, CURRENT_DATE),
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $3 AND company_id = $4 AND id = $5 AND version = $6
       AND status IN ('active', 'removal_pending')
     RETURNING *`,
    [
      input.status ?? "ended",
      input.endEffectiveDate ?? null,
      input.organizationId,
      input.companyId,
      input.assignmentId,
      input.version,
    ],
  );
  const assignment = result.rows[0];
  if (!assignment) throw new ConflictError("Assignment could not be ended (version or status)");

  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "license_assignment",
    entityId: assignment.id,
    eventKind: input.status === "removal_pending" ? "license.removal_pending" : "license.ended",
    actorStaffUserId: input.actorStaffUserId,
    effectiveAt: asDateString(assignment.end_effective_date),
    source: "manual",
    summary: `License assignment set to ${assignment.status}`,
  });
  return assignment;
}

export async function reassignLicense(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    assignmentId: string;
    version: number;
    toPersonId?: string | null;
    toAccountId?: string | null;
    endEffectiveDate?: string | null;
    startEffectiveDate?: string | null;
    dateProvenance?: string | null;
    source?: string;
    actorStaffUserId?: string | null;
  },
): Promise<{ ended: LicenseAssignmentRow; created: LicenseAssignmentRow }> {
  if (!input.toPersonId && !input.toAccountId) {
    throw new UnprocessableError("toPersonId or toAccountId is required");
  }
  await assertSameCompanyRefs(client, input.organizationId, input.companyId, {
    personId: input.toPersonId,
    accountId: input.toAccountId,
  });

  const existing = await getLicenseAssignment(
    client,
    input.organizationId,
    input.companyId,
    input.assignmentId,
  );
  if (!existing) throw new NotFoundError("Assignment not found");
  if (existing.version !== input.version) {
    throw new ConflictError("Assignment changed since you loaded it");
  }
  if (existing.status === "ended") {
    throw new UnprocessableError("Cannot reassign an ended assignment");
  }

  if (existing.subscription_id) {
    await client.query(
      `SELECT id FROM subscriptions
       WHERE organization_id = $1 AND company_id = $2 AND id = $3
       FOR UPDATE`,
      [input.organizationId, input.companyId, existing.subscription_id],
    );
  }

  const ended = await endLicenseAssignment(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    assignmentId: input.assignmentId,
    version: input.version,
    endEffectiveDate: input.endEffectiveDate,
    status: "ended",
    actorStaffUserId: input.actorStaffUserId,
  });

  // Reassignment frees the old seat and consumes one for the new — net zero when same sub.
  const created = await assignLicense(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.toPersonId,
    accountId: input.toAccountId,
    productId: existing.product_id,
    subscriptionId: existing.subscription_id,
    poolId: existing.pool_id,
    startEffectiveDate: input.startEffectiveDate,
    dateProvenance: input.dateProvenance ?? "reassignment",
    source: input.source ?? "manual",
    actorStaffUserId: input.actorStaffUserId,
  });

  return { ended, created };
}

// ---------------------------------------------------------------------------
// Groups / memberships
// ---------------------------------------------------------------------------

export async function listGroups(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<GroupRow[]> {
  const result = await client.query<GroupRow>(
    `SELECT * FROM groups WHERE organization_id = $1 AND company_id = $2 ORDER BY display_name`,
    [organizationId, companyId],
  );
  return result.rows;
}

export async function getGroup(
  client: DbClient,
  organizationId: string,
  companyId: string,
  groupId: string,
): Promise<GroupRow | null> {
  const result = await client.query<GroupRow>(
    `SELECT * FROM groups WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, groupId],
  );
  return result.rows[0] ?? null;
}

export async function createGroup(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    displayName: string;
    emailAddress?: string | null;
    groupType: string;
    membershipCapability?: string;
    externalId?: string | null;
    source?: string;
    id?: string;
  },
): Promise<GroupRow> {
  const id = input.id ?? randomUUID();
  const result = await client.query<GroupRow>(
    `INSERT INTO groups (
      id, organization_id, company_id, external_id, display_name, email_address,
      group_type, membership_capability, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.externalId ?? null,
      input.displayName,
      input.emailAddress ?? null,
      input.groupType,
      input.membershipCapability ?? "direct",
      input.source ?? "manual",
    ],
  );
  return result.rows[0]!;
}

export async function updateGroup(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    groupId: string;
    version: number;
    displayName?: string;
    emailAddress?: string | null;
    membershipCapability?: string;
  },
): Promise<GroupRow | null> {
  const result = await client.query<GroupRow>(
    `UPDATE groups SET
      display_name = COALESCE($1, display_name),
      email_address = CASE WHEN $2::boolean THEN $3 ELSE email_address END,
      membership_capability = COALESCE($4, membership_capability),
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $5 AND company_id = $6 AND id = $7 AND version = $8
     RETURNING *`,
    [
      input.displayName ?? null,
      input.emailAddress !== undefined,
      input.emailAddress ?? null,
      input.membershipCapability ?? null,
      input.organizationId,
      input.companyId,
      input.groupId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listGroupMemberships(
  client: DbClient,
  organizationId: string,
  companyId: string,
  groupId: string,
): Promise<GroupMembershipRow[]> {
  const result = await client.query<GroupMembershipRow>(
    `SELECT * FROM group_memberships
     WHERE organization_id = $1 AND company_id = $2 AND group_id = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, groupId],
  );
  return result.rows;
}

export async function createGroupMembership(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    groupId: string;
    accountId: string;
    membershipKind?: string;
    startDate?: string | null;
    verificationSource?: string | null;
    id?: string;
  },
): Promise<GroupMembershipRow> {
  const group = await getGroup(client, input.organizationId, input.companyId, input.groupId);
  if (!group) throw new NotFoundError("Group not found");
  const account = await getAccount(client, input.organizationId, input.companyId, input.accountId);
  if (!account) throw new NotFoundError("Account not found in this company");

  const id = input.id ?? randomUUID();
  const result = await client.query<GroupMembershipRow>(
    `INSERT INTO group_memberships (
      id, organization_id, company_id, group_id, account_id, membership_kind,
      start_date, verification_source, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.groupId,
      input.accountId,
      input.membershipKind ?? "direct",
      input.startDate ?? null,
      input.verificationSource ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function endGroupMembership(
  client: DbClient,
  organizationId: string,
  companyId: string,
  membershipId: string,
  endDate?: string | null,
): Promise<GroupMembershipRow | null> {
  const result = await client.query<GroupMembershipRow>(
    `UPDATE group_memberships
     SET status = 'ended', end_date = COALESCE($4::date, CURRENT_DATE), updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND status = 'active'
     RETURNING *`,
    [organizationId, companyId, membershipId, endDate ?? null],
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Mailboxes
// ---------------------------------------------------------------------------

export async function listMailboxes(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<MailboxRow[]> {
  const result = await client.query<MailboxRow>(
    `SELECT * FROM shared_mailboxes
     WHERE organization_id = $1 AND company_id = $2 ORDER BY address`,
    [organizationId, companyId],
  );
  return result.rows;
}

export async function getMailbox(
  client: DbClient,
  organizationId: string,
  companyId: string,
  mailboxId: string,
): Promise<MailboxRow | null> {
  const result = await client.query<MailboxRow>(
    `SELECT * FROM shared_mailboxes
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, mailboxId],
  );
  return result.rows[0] ?? null;
}

export async function createMailbox(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    address: string;
    source?: string;
    state?: string;
    ownerPersonId?: string | null;
    id?: string;
  },
): Promise<MailboxRow> {
  if (input.ownerPersonId) {
    const person = await getPerson(
      client,
      input.organizationId,
      input.companyId,
      input.ownerPersonId,
    );
    if (!person) throw new NotFoundError("Owner person not found in this company");
  }
  const id = input.id ?? randomUUID();
  const result = await client.query<MailboxRow>(
    `INSERT INTO shared_mailboxes (
      id, organization_id, company_id, address, source, state, owner_person_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.address,
      input.source ?? "manual",
      input.state ?? "active",
      input.ownerPersonId ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function updateMailbox(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    mailboxId: string;
    version: number;
    state?: string;
    ownerPersonId?: string | null;
  },
): Promise<MailboxRow | null> {
  if (input.ownerPersonId) {
    const person = await getPerson(
      client,
      input.organizationId,
      input.companyId,
      input.ownerPersonId,
    );
    if (!person) throw new NotFoundError("Owner person not found in this company");
  }
  const result = await client.query<MailboxRow>(
    `UPDATE shared_mailboxes SET
      state = COALESCE($1, state),
      owner_person_id = CASE WHEN $2::boolean THEN $3 ELSE owner_person_id END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $4 AND company_id = $5 AND id = $6 AND version = $7
     RETURNING *`,
    [
      input.state ?? null,
      input.ownerPersonId !== undefined,
      input.ownerPersonId ?? null,
      input.organizationId,
      input.companyId,
      input.mailboxId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listMailboxAccess(
  client: DbClient,
  organizationId: string,
  companyId: string,
  mailboxId: string,
): Promise<MailboxAccessRow[]> {
  const result = await client.query<MailboxAccessRow>(
    `SELECT * FROM mailbox_access
     WHERE organization_id = $1 AND company_id = $2 AND mailbox_id = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, mailboxId],
  );
  return result.rows;
}

export async function createMailboxAccess(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    mailboxId: string;
    accountId: string;
    permissionKind: string;
    startDate?: string | null;
    source?: string;
    verificationStatus?: string | null;
    id?: string;
  },
): Promise<MailboxAccessRow> {
  const mailbox = await getMailbox(client, input.organizationId, input.companyId, input.mailboxId);
  if (!mailbox) throw new NotFoundError("Mailbox not found");
  const account = await getAccount(client, input.organizationId, input.companyId, input.accountId);
  if (!account) throw new NotFoundError("Account not found in this company");

  const id = input.id ?? randomUUID();
  const result = await client.query<MailboxAccessRow>(
    `INSERT INTO mailbox_access (
      id, organization_id, company_id, mailbox_id, account_id, permission_kind,
      start_date, source, verification_status, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.mailboxId,
      input.accountId,
      input.permissionKind,
      input.startDate ?? null,
      input.source ?? "manual",
      input.verificationStatus ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function endMailboxAccess(
  client: DbClient,
  organizationId: string,
  companyId: string,
  accessId: string,
  endDate?: string | null,
): Promise<MailboxAccessRow | null> {
  const result = await client.query<MailboxAccessRow>(
    `UPDATE mailbox_access
     SET status = 'ended', end_date = COALESCE($4::date, CURRENT_DATE), updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND status = 'active'
     RETURNING *`,
    [organizationId, companyId, accessId, endDate ?? null],
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export async function listDevices(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<DeviceRow[]> {
  const result = await client.query<DeviceRow>(
    `SELECT * FROM devices WHERE organization_id = $1 AND company_id = $2 ORDER BY asset_tag NULLS LAST, hostname`,
    [organizationId, companyId],
  );
  return result.rows;
}

export async function getDevice(
  client: DbClient,
  organizationId: string,
  companyId: string,
  deviceId: string,
): Promise<DeviceRow | null> {
  const result = await client.query<DeviceRow>(
    `SELECT * FROM devices WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, deviceId],
  );
  return result.rows[0] ?? null;
}

export async function createDevice(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    assetTag?: string | null;
    serial?: string | null;
    deviceType: string;
    hostname?: string | null;
    model?: string | null;
    state?: string;
    source?: string;
    cost?: number | string | null;
    currency?: string | null;
    id?: string;
  },
): Promise<DeviceRow> {
  const id = input.id ?? randomUUID();
  const result = await client.query<DeviceRow>(
    `INSERT INTO devices (
      id, organization_id, company_id, asset_tag, serial, device_type, hostname, model,
      state, source, cost, currency
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.assetTag ?? null,
      input.serial ?? null,
      input.deviceType,
      input.hostname ?? null,
      input.model ?? null,
      input.state ?? "available",
      input.source ?? "manual",
      input.cost ?? null,
      input.currency ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function updateDevice(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    deviceId: string;
    version: number;
    assetTag?: string | null;
    serial?: string | null;
    deviceType?: string;
    hostname?: string | null;
    model?: string | null;
    state?: string;
    cost?: number | string | null;
    currency?: string | null;
  },
): Promise<DeviceRow | null> {
  const result = await client.query<DeviceRow>(
    `UPDATE devices SET
      asset_tag = CASE WHEN $1::boolean THEN $2 ELSE asset_tag END,
      serial = CASE WHEN $3::boolean THEN $4 ELSE serial END,
      device_type = COALESCE($5, device_type),
      hostname = CASE WHEN $6::boolean THEN $7 ELSE hostname END,
      model = CASE WHEN $8::boolean THEN $9 ELSE model END,
      state = COALESCE($10, state),
      cost = CASE WHEN $11::boolean THEN $12 ELSE cost END,
      currency = CASE WHEN $13::boolean THEN $14 ELSE currency END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $15 AND company_id = $16 AND id = $17 AND version = $18
     RETURNING *`,
    [
      input.assetTag !== undefined,
      input.assetTag ?? null,
      input.serial !== undefined,
      input.serial ?? null,
      input.deviceType ?? null,
      input.hostname !== undefined,
      input.hostname ?? null,
      input.model !== undefined,
      input.model ?? null,
      input.state ?? null,
      input.cost !== undefined,
      input.cost ?? null,
      input.currency !== undefined,
      input.currency ?? null,
      input.organizationId,
      input.companyId,
      input.deviceId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listDeviceAssignments(
  client: DbClient,
  organizationId: string,
  companyId: string,
  deviceId: string,
): Promise<DeviceAssignmentRow[]> {
  const result = await client.query<DeviceAssignmentRow>(
    `SELECT * FROM device_assignments
     WHERE organization_id = $1 AND company_id = $2 AND device_id = $3
     ORDER BY issued_at DESC`,
    [organizationId, companyId, deviceId],
  );
  return result.rows;
}

export async function assignDevice(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    deviceId: string;
    personId: string;
    issuedAt?: string | Date;
    custodyDisposition?: string | null;
    evidenceNote?: string | null;
    id?: string;
  },
): Promise<DeviceAssignmentRow> {
  const device = await getDevice(client, input.organizationId, input.companyId, input.deviceId);
  if (!device) throw new NotFoundError("Device not found");
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found in this company");

  await client.query(
    `UPDATE device_assignments
     SET status = 'historical',
         returned_at = COALESCE(returned_at, NOW()),
         updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND device_id = $3 AND status = 'current'`,
    [input.organizationId, input.companyId, input.deviceId],
  );

  const id = input.id ?? randomUUID();
  const result = await client.query<DeviceAssignmentRow>(
    `INSERT INTO device_assignments (
      id, organization_id, company_id, device_id, person_id, issued_at,
      custody_disposition, evidence_note, status
    ) VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, NOW()),$7,$8,'current')
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.deviceId,
      input.personId,
      input.issuedAt ?? null,
      input.custodyDisposition ?? null,
      input.evidenceNote ?? null,
    ],
  );

  await client.query(
    `UPDATE devices SET state = 'assigned', updated_at = NOW(), version = version + 1
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [input.organizationId, input.companyId, input.deviceId],
  );

  return result.rows[0]!;
}

export async function returnDeviceAssignment(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    assignmentId: string;
    custodyDisposition?: string | null;
    evidenceNote?: string | null;
  },
): Promise<DeviceAssignmentRow | null> {
  const result = await client.query<DeviceAssignmentRow>(
    `UPDATE device_assignments SET
      status = 'historical',
      returned_at = NOW(),
      custody_disposition = COALESCE($4, custody_disposition),
      evidence_note = COALESCE($5, evidence_note),
      updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND status = 'current'
     RETURNING *`,
    [
      input.organizationId,
      input.companyId,
      input.assignmentId,
      input.custodyDisposition ?? null,
      input.evidenceNote ?? null,
    ],
  );
  const assignment = result.rows[0];
  if (assignment) {
    await client.query(
      `UPDATE devices SET state = 'available', updated_at = NOW(), version = version + 1
       WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
      [input.organizationId, input.companyId, assignment.device_id],
    );
  }
  return assignment ?? null;
}

// ---------------------------------------------------------------------------
// Work items
// ---------------------------------------------------------------------------

export async function listWorkItems(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<WorkItemRow[]> {
  const result = await client.query<WorkItemRow>(
    `SELECT * FROM work_items
     WHERE organization_id = $1 AND company_id = $2
     ORDER BY created_at DESC`,
    [organizationId, companyId],
  );
  return result.rows;
}

export async function getWorkItem(
  client: DbClient,
  organizationId: string,
  companyId: string,
  workItemId: string,
): Promise<WorkItemRow | null> {
  const result = await client.query<WorkItemRow>(
    `SELECT * FROM work_items WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, workItemId],
  );
  return result.rows[0] ?? null;
}

export async function createWorkItem(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    type: string;
    title: string;
    description?: string | null;
    targetPersonId?: string | null;
    ownerStaffUserId?: string | null;
    status?: string;
    dueDate?: string | null;
    id?: string;
  },
): Promise<WorkItemRow> {
  if (input.targetPersonId) {
    const person = await getPerson(
      client,
      input.organizationId,
      input.companyId,
      input.targetPersonId,
    );
    if (!person) throw new NotFoundError("Target person not found in this company");
  }
  const id = input.id ?? randomUUID();
  const result = await client.query<WorkItemRow>(
    `INSERT INTO work_items (
      id, organization_id, company_id, type, target_person_id, owner_staff_user_id,
      status, due_date, title, description
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.type,
      input.targetPersonId ?? null,
      input.ownerStaffUserId ?? null,
      input.status ?? "open",
      input.dueDate ?? null,
      input.title,
      input.description ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function updateWorkItem(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    workItemId: string;
    version: number;
    title?: string;
    description?: string | null;
    status?: string;
    dueDate?: string | null;
    ownerStaffUserId?: string | null;
    completionEvidence?: string | null;
  },
): Promise<WorkItemRow | null> {
  const result = await client.query<WorkItemRow>(
    `UPDATE work_items SET
      title = COALESCE($1, title),
      description = CASE WHEN $2::boolean THEN $3 ELSE description END,
      status = COALESCE($4, status),
      due_date = CASE WHEN $5::boolean THEN $6::date ELSE due_date END,
      owner_staff_user_id = CASE WHEN $7::boolean THEN $8 ELSE owner_staff_user_id END,
      completion_evidence = CASE WHEN $9::boolean THEN $10 ELSE completion_evidence END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $11 AND company_id = $12 AND id = $13 AND version = $14
     RETURNING *`,
    [
      input.title ?? null,
      input.description !== undefined,
      input.description ?? null,
      input.status ?? null,
      input.dueDate !== undefined,
      input.dueDate ?? null,
      input.ownerStaffUserId !== undefined,
      input.ownerStaffUserId ?? null,
      input.completionEvidence !== undefined,
      input.completionEvidence ?? null,
      input.organizationId,
      input.companyId,
      input.workItemId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Archive snapshot / readiness
// ---------------------------------------------------------------------------

export async function loadArchiveSnapshot(
  client: DbClient,
  personId: string,
  organizationId?: string,
  companyId?: string,
): Promise<ArchiveReadinessSnapshot | null> {
  const personResult = organizationId && companyId
    ? await client.query<PersonRow>(
        `SELECT * FROM people WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
        [organizationId, companyId, personId],
      )
    : await client.query<PersonRow>(`SELECT * FROM people WHERE id = $1`, [personId]);
  const person = personResult.rows[0];
  if (!person) return null;

  const orgId = person.organization_id;
  const coId = person.company_id;

  const [assignments, accounts, obligations, devices] = await Promise.all([
    client.query<{ id: string; status: "active" | "removal_pending" | "ended" }>(
      `SELECT id, status FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId],
    ),
    client.query<{
      id: string;
      account_kind: "human" | "guest" | "service" | "shared_mailbox_ref";
      enabled_state: "enabled" | "disabled" | "unknown";
    }>(
      `SELECT id, account_kind, enabled_state FROM accounts
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId],
    ),
    client.query<{
      id: string;
      obligation_kind: string;
      target_type: string;
      target_id: string;
      status: "open" | "resolved" | "not_applicable";
    }>(
      `SELECT id, obligation_kind, target_type, target_id, status
       FROM offboarding_obligations
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId],
    ),
    client.query<{
      id: string;
      status: "current" | "historical";
      custody_disposition: string | null;
    }>(
      `SELECT id, status, custody_disposition FROM device_assignments
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3`,
      [orgId, coId, personId],
    ),
  ]);

  const accountIds = accounts.rows.map((a) => a.id);
  const mailboxAccess =
    accountIds.length === 0
      ? { rows: [] as Array<{ id: string; status: "active" | "ended" }> }
      : await client.query<{ id: string; status: "active" | "ended" }>(
          `SELECT id, status FROM mailbox_access
           WHERE organization_id = $1 AND company_id = $2
             AND account_id = ANY($3::uuid[])`,
          [orgId, coId, accountIds],
        );

  return {
    person: {
      itStatus: person.it_status,
      archivedAt: person.archived_at,
    },
    licenseAssignments: assignments.rows.map((row) => ({
      id: row.id,
      status: row.status,
    })),
    mailboxAccess: mailboxAccess.rows.map((row) => ({
      id: row.id,
      status: row.status,
    })),
    obligations: obligations.rows.map((row) => ({
      id: row.id,
      obligationKind: row.obligation_kind,
      targetType: row.target_type,
      targetId: row.target_id,
      status: row.status,
    })),
    linkedAccounts: accounts.rows.map((row) => ({
      id: row.id,
      accountKind: row.account_kind,
      enabledState: row.enabled_state,
    })),
    deviceAssignments: devices.rows.map((row) => ({
      id: row.id,
      status: row.status,
      custodyDisposition: row.custody_disposition,
    })),
  };
}

export async function getArchiveReadiness(
  client: DbClient,
  organizationId: string,
  companyId: string,
  personId: string,
): Promise<ArchiveReadinessResult> {
  const snapshot = await loadArchiveSnapshot(client, personId, organizationId, companyId);
  if (!snapshot) throw new NotFoundError("Person not found");
  return evaluateArchiveReadiness(snapshot);
}

/** Person profile payload for the UI (same relationships as resource screens). */
export async function loadPersonProfile(
  client: DbClient,
  organizationId: string,
  companyId: string,
  personId: string,
): Promise<{
  person: PersonRow;
  accounts: AccountRow[];
  assignments: Array<LicenseAssignmentRow & { product_name: string | null }>;
  groupMemberships: Array<
    GroupMembershipRow & { group_name: string; group_type: string }
  >;
  mailboxAccess: Array<MailboxAccessRow & { mailbox_address: string }>;
  devices: Array<DeviceAssignmentRow & { device: DeviceRow | null }>;
  workItems: WorkItemRow[];
  timeline: TimelineEventRow[];
  costs: CostSummary;
} | null> {
  const person = await getPerson(client, organizationId, companyId, personId);
  if (!person) return null;

  const accounts = await listAccounts(client, organizationId, companyId, { personId });
  const assignmentResult = await client.query<LicenseAssignmentRow & { product_name: string | null }>(
    `SELECT la.*, p.name AS product_name
     FROM license_assignments la
     LEFT JOIN products p ON p.organization_id = la.organization_id AND p.id = la.product_id
     WHERE la.organization_id = $1 AND la.company_id = $2 AND la.person_id = $3
     ORDER BY la.created_at DESC`,
    [organizationId, companyId, personId],
  );
  const groupResult = await client.query<GroupMembershipRow & { group_name: string; group_type: string }>(
    `SELECT gm.*, g.display_name AS group_name, g.group_type
     FROM group_memberships gm
     JOIN groups g
       ON g.organization_id = gm.organization_id
      AND g.company_id = gm.company_id
      AND g.id = gm.group_id
     JOIN accounts a
       ON a.organization_id = gm.organization_id
      AND a.company_id = gm.company_id
      AND a.id = gm.account_id
     WHERE gm.organization_id = $1 AND gm.company_id = $2 AND a.person_id = $3
     ORDER BY gm.created_at DESC`,
    [organizationId, companyId, personId],
  );
  const mailboxResult = await client.query<MailboxAccessRow & { mailbox_address: string }>(
    `SELECT ma.*, sm.address AS mailbox_address
     FROM mailbox_access ma
     JOIN shared_mailboxes sm
       ON sm.organization_id = ma.organization_id
      AND sm.company_id = ma.company_id
      AND sm.id = ma.mailbox_id
     JOIN accounts a
       ON a.organization_id = ma.organization_id
      AND a.company_id = ma.company_id
      AND a.id = ma.account_id
     WHERE ma.organization_id = $1 AND ma.company_id = $2 AND a.person_id = $3
     ORDER BY ma.created_at DESC`,
    [organizationId, companyId, personId],
  );
  const deviceResult = await client.query<DeviceAssignmentRow>(
    `SELECT * FROM device_assignments
     WHERE organization_id = $1 AND company_id = $2 AND person_id = $3
     ORDER BY issued_at DESC`,
    [organizationId, companyId, personId],
  );
  const workResult = await client.query<WorkItemRow>(
    `SELECT * FROM work_items
     WHERE organization_id = $1 AND company_id = $2 AND target_person_id = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, personId],
  );
  const timeline = await listTimelineForEntity(client, organizationId, "person", personId);
  const costs = await personCostSummary(client, organizationId, companyId, personId);

  const devices: Array<DeviceAssignmentRow & { device: DeviceRow | null }> = [];
  for (const row of deviceResult.rows) {
    const device = await getDevice(client, organizationId, companyId, row.device_id);
    devices.push({ ...row, device });
  }

  return {
    person,
    accounts,
    assignments: assignmentResult.rows,
    groupMemberships: groupResult.rows,
    mailboxAccess: mailboxResult.rows,
    devices,
    workItems: workResult.rows,
    timeline,
    costs,
  };
}

// ---------------------------------------------------------------------------
// Cost summaries
// ---------------------------------------------------------------------------

export async function companyCostSummary(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<CostSummary> {
  const result = await client.query<{
    currency: string;
    unit_price: string | null;
    purchased_quantity: number;
  }>(
    `SELECT s.currency, pv.unit_price, s.purchased_quantity
     FROM subscriptions s
     LEFT JOIN LATERAL (
       SELECT unit_price
       FROM subscription_price_versions
       WHERE organization_id = s.organization_id
         AND company_id = s.company_id
         AND subscription_id = s.id
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY effective_from DESC
       LIMIT 1
     ) pv ON TRUE
     WHERE s.organization_id = $1 AND s.company_id = $2 AND s.state = 'active'`,
    [organizationId, companyId],
  );

  const amounts = result.rows.map((row) => ({
    amount: row.unit_price == null ? null : Number(row.unit_price) * row.purchased_quantity,
    currency: row.currency,
  }));
  const partitioned = partitionByCurrency(amounts);
  return {
    byCurrency: [...partitioned.byCurrency.entries()].map(([currency, total]) => ({
      currency,
      total: String(total),
    })),
    unknownCount: partitioned.unknownCount,
  };
}

export async function personCostSummary(
  client: DbClient,
  organizationId: string,
  companyId: string,
  personId: string,
): Promise<CostSummary> {
  const result = await client.query<{ currency: string; unit_price: string | null }>(
    `SELECT s.currency, pv.unit_price
     FROM license_assignments la
     JOIN subscriptions s
       ON s.organization_id = la.organization_id
      AND s.company_id = la.company_id
      AND s.id = la.subscription_id
     LEFT JOIN LATERAL (
       SELECT unit_price
       FROM subscription_price_versions
       WHERE organization_id = s.organization_id
         AND company_id = s.company_id
         AND subscription_id = s.id
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY effective_from DESC
       LIMIT 1
     ) pv ON TRUE
     WHERE la.organization_id = $1 AND la.company_id = $2 AND la.person_id = $3
       AND la.status IN ('active', 'removal_pending')`,
    [organizationId, companyId, personId],
  );

  const amounts = result.rows.map((row) => ({
    amount: row.unit_price == null ? null : Number(row.unit_price),
    currency: row.currency,
  }));
  const partitioned = partitionByCurrency(amounts);
  return {
    byCurrency: [...partitioned.byCurrency.entries()].map(([currency, total]) => ({
      currency,
      total: String(total),
    })),
    unknownCount: partitioned.unknownCount,
  };
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

export async function createImportBatch(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    resourceKind: string;
    originalFilename: string;
    createdByStaffUserId?: string | null;
    schemaMapping?: unknown;
    id?: string;
  },
): Promise<ImportBatchRow> {
  const id = input.id ?? randomUUID();
  const result = await client.query<ImportBatchRow>(
    `INSERT INTO import_batches (
      id, organization_id, company_id, resource_kind, original_filename, status,
      schema_mapping, created_by_staff_user_id
    ) VALUES ($1,$2,$3,$4,$5,'preview',$6::jsonb,$7)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.resourceKind,
      input.originalFilename,
      JSON.stringify(input.schemaMapping ?? {}),
      input.createdByStaffUserId ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function insertImportRows(
  client: DbClient,
  rows: Array<{
    organizationId: string;
    companyId: string;
    batchId: string;
    rowNumber: number;
    rawData: Record<string, unknown>;
    validationStatus: string;
    validationErrors?: string[];
    dedupeKey?: string | null;
    applyStatus?: string | null;
    id?: string;
  }>,
): Promise<ImportRowRow[]> {
  const inserted: ImportRowRow[] = [];
  for (const row of rows) {
    const result = await client.query<ImportRowRow>(
      `INSERT INTO import_rows (
        id, organization_id, company_id, batch_id, row_number, raw_data,
        validation_status, validation_errors, dedupe_key, apply_status
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10)
      RETURNING *`,
      [
        row.id ?? randomUUID(),
        row.organizationId,
        row.companyId,
        row.batchId,
        row.rowNumber,
        JSON.stringify(row.rawData),
        row.validationStatus,
        JSON.stringify(row.validationErrors ?? []),
        row.dedupeKey ?? null,
        row.applyStatus ?? "pending",
      ],
    );
    inserted.push(result.rows[0]!);
  }
  return inserted;
}

export async function getImportBatch(
  client: DbClient,
  organizationId: string,
  companyId: string,
  batchId: string,
): Promise<ImportBatchRow | null> {
  const result = await client.query<ImportBatchRow>(
    `SELECT * FROM import_batches
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, batchId],
  );
  return result.rows[0] ?? null;
}

export async function listImportRows(
  client: DbClient,
  organizationId: string,
  companyId: string,
  batchId: string,
): Promise<ImportRowRow[]> {
  const result = await client.query<ImportRowRow>(
    `SELECT * FROM import_rows
     WHERE organization_id = $1 AND company_id = $2 AND batch_id = $3
     ORDER BY row_number ASC`,
    [organizationId, companyId, batchId],
  );
  return result.rows;
}

export type PeopleImportRow = {
  displayName: string;
  workEmail: string;
  itStatus?: string;
  roleTitle?: string;
  department?: string;
};

export function parsePeopleCsv(csv: string): Array<{ rowNumber: number; fields: Record<string, string> }> {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const rows: Array<{ rowNumber: number; fields: Record<string, string> }> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]!);
    const fields: Record<string, string> = {};
    headers.forEach((header, index) => {
      fields[header] = (values[index] ?? "").trim();
    });
    rows.push({ rowNumber: i + 1, fields });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

export async function previewPeopleImport(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    filename: string;
    csv: string;
    createdByStaffUserId?: string | null;
  },
): Promise<{ batch: ImportBatchRow; rows: ImportRowRow[] }> {
  const parsed = parsePeopleCsv(input.csv);
  const batch = await createImportBatch(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    resourceKind: "people",
    originalFilename: input.filename,
    createdByStaffUserId: input.createdByStaffUserId,
    schemaMapping: {
      display_name: "display_name|name|display name",
      work_email: "work_email|email|work email",
      it_status: "it_status|status",
    },
  });

  const rowInputs = parsed.map(({ rowNumber, fields }) => {
    const displayName =
      fields.display_name || fields.name || fields["display name"] || "";
    const workEmail = fields.work_email || fields.email || fields["work email"] || "";
    const itStatus = (fields.it_status || fields.status || "planned").toLowerCase();
    const errors: string[] = [];
    if (!displayName) errors.push("display_name is required");
    if (!workEmail || !workEmail.includes("@")) errors.push("work_email is required");
    if (!["planned", "active", "on_leave", "departed"].includes(itStatus)) {
      errors.push("invalid it_status");
    }
    const dedupeKey = workEmail ? workEmail.toLowerCase() : null;
    return {
      organizationId: input.organizationId,
      companyId: input.companyId,
      batchId: batch.id,
      rowNumber,
      rawData: fields as Record<string, unknown>,
      validationStatus: errors.length ? "invalid" : "valid",
      validationErrors: errors,
      dedupeKey,
      applyStatus: "pending" as const,
    };
  });

  const rows = await insertImportRows(client, rowInputs);
  return { batch, rows };
}

export async function applyPeopleImport(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    batchId: string;
    actorStaffUserId?: string | null;
  },
): Promise<{
  batch: ImportBatchRow;
  rows: ImportRowRow[];
  applied: number;
  noop: number;
  failed: number;
  skipped: number;
}> {
  const batch = await getImportBatch(
    client,
    input.organizationId,
    input.companyId,
    input.batchId,
  );
  if (!batch) throw new NotFoundError("Import batch not found");
  if (batch.status === "applied") {
    throw new ConflictError("Import batch already applied");
  }

  const rows = await listImportRows(client, input.organizationId, input.companyId, input.batchId);
  let applied = 0;
  let noop = 0;
  let failed = 0;
  let skipped = 0;
  const updatedRows: ImportRowRow[] = [];

  for (const row of rows) {
    if (row.validation_status !== "valid") {
      skipped += 1;
      const result = await client.query<ImportRowRow>(
        `UPDATE import_rows SET apply_status = 'skipped', apply_result = $4::jsonb
         WHERE organization_id = $1 AND company_id = $2 AND id = $3
         RETURNING *`,
        [
          input.organizationId,
          input.companyId,
          row.id,
          JSON.stringify({ reason: "invalid_row" }),
        ],
      );
      updatedRows.push(result.rows[0]!);
      continue;
    }

    const fields = row.raw_data as Record<string, string>;
    const displayName =
      fields.display_name || fields.name || fields["display name"] || "";
    const workEmail = (fields.work_email || fields.email || fields["work email"] || "").toLowerCase();
    const itStatus = (fields.it_status || fields.status || "planned").toLowerCase() as PersonRow["it_status"];
    const roleTitle = fields.role_title || fields.role || null;
    const department = fields.department || null;

    try {
      const existing = await client.query<PersonRow>(
        `SELECT * FROM people
         WHERE organization_id = $1 AND company_id = $2 AND lower(work_email) = lower($3)
         LIMIT 1`,
        [input.organizationId, input.companyId, workEmail],
      );
      const person = existing.rows[0];
      if (person) {
        const unchanged =
          person.display_name === displayName &&
          person.it_status === itStatus &&
          (person.role_title ?? null) === (roleTitle || null) &&
          (person.department ?? null) === (department || null);
        if (unchanged) {
          noop += 1;
          const result = await client.query<ImportRowRow>(
            `UPDATE import_rows SET apply_status = 'noop', apply_result = $4::jsonb
             WHERE organization_id = $1 AND company_id = $2 AND id = $3
             RETURNING *`,
            [
              input.organizationId,
              input.companyId,
              row.id,
              JSON.stringify({ personId: person.id, action: "noop" }),
            ],
          );
          updatedRows.push(result.rows[0]!);
          continue;
        }
        const updated = await updatePerson(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          personId: person.id,
          version: person.version,
          displayName,
          itStatus,
          roleTitle: roleTitle || null,
          department: department || null,
        });
        applied += 1;
        const result = await client.query<ImportRowRow>(
          `UPDATE import_rows SET apply_status = 'applied', apply_result = $4::jsonb
           WHERE organization_id = $1 AND company_id = $2 AND id = $3
           RETURNING *`,
          [
            input.organizationId,
            input.companyId,
            row.id,
            JSON.stringify({ personId: updated?.id ?? person.id, action: "update" }),
          ],
        );
        updatedRows.push(result.rows[0]!);
      } else {
        const created = await createPerson(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          displayName,
          workEmail,
          itStatus,
          roleTitle: roleTitle || null,
          department: department || null,
        });
        applied += 1;
        const result = await client.query<ImportRowRow>(
          `UPDATE import_rows SET apply_status = 'applied', apply_result = $4::jsonb
           WHERE organization_id = $1 AND company_id = $2 AND id = $3
           RETURNING *`,
          [
            input.organizationId,
            input.companyId,
            row.id,
            JSON.stringify({ personId: created.id, action: "create" }),
          ],
        );
        updatedRows.push(result.rows[0]!);
      }
    } catch (error) {
      failed += 1;
      const result = await client.query<ImportRowRow>(
        `UPDATE import_rows SET apply_status = 'failed', apply_result = $4::jsonb
         WHERE organization_id = $1 AND company_id = $2 AND id = $3
         RETURNING *`,
        [
          input.organizationId,
          input.companyId,
          row.id,
          JSON.stringify({
            error: error instanceof Error ? error.message : "apply_failed",
          }),
        ],
      );
      updatedRows.push(result.rows[0]!);
    }
  }

  const batchResult = await client.query<ImportBatchRow>(
    `UPDATE import_batches
     SET status = 'applied', applied_at = NOW(), updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3
     RETURNING *`,
    [input.organizationId, input.companyId, input.batchId],
  );

  await insertAuditEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    actorStaffUserId: input.actorStaffUserId,
    action: "import.people.apply",
    targetType: "import_batch",
    targetId: input.batchId,
    summary: `Applied people import: ${applied} applied, ${noop} noop`,
  });

  return {
    batch: batchResult.rows[0]!,
    rows: updatedRows,
    applied,
    noop,
    failed,
    skipped,
  };
}

// Helpers exported for serializers
export { asDateString, asIso, numericToString };
