import { randomUUID } from "node:crypto";
import type { DbClient } from "./pool.ts";
import { insertTimelineEvent } from "./inventory.ts";

export type ProviderKind = "demo" | "microsoft";
export type ConnectionStatus = "draft" | "connected" | "error" | "disabled";
export type SyncCollection =
  | "users"
  | "groups"
  | "group_memberships"
  | "subscribed_skus"
  | "capabilities";
export type SyncRunStatus = "queued" | "running" | "succeeded" | "partial" | "failed";
export type ObservationSource = "demo" | "microsoft";

export type ProviderConnectionRow = {
  id: string;
  organization_id: string;
  company_id: string;
  provider_kind: ProviderKind;
  tenant_id: string | null;
  display_name: string;
  status: ConnectionStatus;
  credential_ref: string | null;
  failure_mode: string | null;
  last_success_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type SyncRunRow = {
  id: string;
  organization_id: string;
  company_id: string;
  connection_id: string;
  collection: SyncCollection;
  status: SyncRunStatus;
  started_at: Date | null;
  finished_at: Date | null;
  item_count: number | null;
  page_count: number | null;
  error_code: string | null;
  error_message: string | null;
  correlation_id: string | null;
  created_at: Date;
};

export type SyncCollectionStateRow = {
  connection_id: string;
  collection: SyncCollection;
  last_success_at: Date | null;
  last_attempt_at: Date | null;
  last_error: string | null;
  consecutive_failures: number;
};

export type PersonLinkProposalRow = {
  id: string;
  organization_id: string;
  company_id: string;
  account_id: string;
  person_id: string | null;
  proposed_by: "email_match";
  confidence: string;
  status: "open" | "accepted" | "rejected";
  created_at: Date;
};

export type AccountObservation = {
  externalId: string;
  loginName: string;
  accountKind?: "human" | "guest" | "service" | "shared_mailbox_ref";
  enabledState?: "enabled" | "disabled" | "unknown";
  /** Attribute only — never treated as identity. Used for link proposals. */
  mail?: string | null;
  observedAt?: Date | string | null;
  freshnessNote?: string | null;
};

export type GroupObservation = {
  externalId: string;
  displayName: string;
  emailAddress?: string | null;
  groupType: "security" | "microsoft_365" | "distribution" | "mail_enabled_security" | "manual";
  membershipCapability?: "direct" | "dynamic" | "unsupported";
};

export type MembershipObservation = {
  groupExternalId: string;
  accountExternalId: string;
  membershipKind?: "direct" | "inherited" | "dynamic";
  verificationSource?: string | null;
};

export type SkuObservation = {
  providerSku: string;
  productId: string;
  purchasedQuantity: number;
  consumedQuantity?: number | null;
  freshnessNote?: string | null;
  observedAt?: Date | string | null;
};

function timelineSource(source: ObservationSource): ObservationSource {
  return source;
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export async function createConnection(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    providerKind: ProviderKind;
    displayName: string;
    tenantId?: string | null;
    status?: ConnectionStatus;
    credentialRef?: string | null;
    failureMode?: string | null;
    id?: string;
  },
): Promise<ProviderConnectionRow> {
  if (input.providerKind === "microsoft" && input.credentialRef && /secret|password|token=/i.test(input.credentialRef)) {
    throw new Error("credential_ref must be a reference name only — never a raw secret");
  }
  const id = input.id ?? randomUUID();
  const tenantId = input.providerKind === "demo" ? null : (input.tenantId ?? null);
  const result = await client.query<ProviderConnectionRow>(
    `INSERT INTO provider_connections (
      id, organization_id, company_id, provider_kind, tenant_id, display_name,
      status, credential_ref, failure_mode
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.providerKind,
      tenantId,
      input.displayName,
      input.status ?? "draft",
      input.credentialRef ?? null,
      input.failureMode ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function listConnections(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<ProviderConnectionRow[]> {
  const result = await client.query<ProviderConnectionRow>(
    `SELECT * FROM provider_connections
     WHERE organization_id = $1 AND company_id = $2
     ORDER BY created_at DESC`,
    [organizationId, companyId],
  );
  return result.rows;
}

/** Connected providers eligible for scheduled or on-demand sync (not draft/disabled). */
export async function listConnectionsForScheduledSync(
  client: DbClient,
): Promise<ProviderConnectionRow[]> {
  const result = await client.query<ProviderConnectionRow>(
    `SELECT * FROM provider_connections
     WHERE status = 'connected'
     ORDER BY company_id, created_at`,
  );
  return result.rows;
}

/**
 * Stale = error status, never succeeded while connected, last success older than maxAgeHours,
 * or any collection with consecutive_failures > 0.
 */
export async function countStaleConnections(
  client: DbClient,
  organizationId: string,
  companyIds: string[],
  maxAgeHours = 24,
): Promise<number> {
  if (companyIds.length === 0) return 0;
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(DISTINCT c.id)::text AS count
     FROM provider_connections c
     LEFT JOIN sync_collection_state s ON s.connection_id = c.id
     WHERE c.organization_id = $1
       AND c.company_id = ANY($2::uuid[])
       AND c.status <> 'disabled'
       AND c.status <> 'draft'
       AND (
         c.status = 'error'
         OR c.last_success_at IS NULL
         OR c.last_success_at < NOW() - ($3::int * INTERVAL '1 hour')
         OR COALESCE(s.consecutive_failures, 0) > 0
       )`,
    [organizationId, companyIds, maxAgeHours],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getConnection(
  client: DbClient,
  organizationId: string,
  companyId: string,
  connectionId: string,
): Promise<ProviderConnectionRow | null> {
  const result = await client.query<ProviderConnectionRow>(
    `SELECT * FROM provider_connections
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, connectionId],
  );
  return result.rows[0] ?? null;
}

export async function updateConnectionStatus(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    connectionId: string;
    version: number;
    status: ConnectionStatus;
    lastSuccessAt?: Date | string | null;
    lastError?: string | null;
    failureMode?: string | null;
    credentialRef?: string | null;
    displayName?: string;
    tenantId?: string | null;
  },
): Promise<ProviderConnectionRow | null> {
  if (input.credentialRef && /secret|password|token=/i.test(input.credentialRef)) {
    throw new Error("credential_ref must be a reference name only — never a raw secret");
  }
  const result = await client.query<ProviderConnectionRow>(
    `UPDATE provider_connections SET
      status = $1,
      last_success_at = CASE WHEN $2::boolean THEN $3::timestamptz ELSE last_success_at END,
      last_error = CASE WHEN $4::boolean THEN $5 ELSE last_error END,
      failure_mode = CASE WHEN $6::boolean THEN $7 ELSE failure_mode END,
      credential_ref = CASE WHEN $8::boolean THEN $9 ELSE credential_ref END,
      display_name = COALESCE($10, display_name),
      tenant_id = CASE WHEN $11::boolean THEN $12 ELSE tenant_id END,
      updated_at = NOW(),
      version = version + 1
     WHERE organization_id = $13 AND company_id = $14 AND id = $15 AND version = $16
     RETURNING *`,
    [
      input.status,
      input.lastSuccessAt !== undefined,
      input.lastSuccessAt ?? null,
      input.lastError !== undefined,
      input.lastError ?? null,
      input.failureMode !== undefined,
      input.failureMode ?? null,
      input.credentialRef !== undefined,
      input.credentialRef ?? null,
      input.displayName ?? null,
      input.tenantId !== undefined,
      input.tenantId ?? null,
      input.organizationId,
      input.companyId,
      input.connectionId,
      input.version,
    ],
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Sync runs
// ---------------------------------------------------------------------------

export async function createSyncRun(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    connectionId: string;
    collection: SyncCollection;
    status?: SyncRunStatus;
    correlationId?: string | null;
    id?: string;
  },
): Promise<SyncRunRow> {
  const id = input.id ?? randomUUID();
  const status = input.status ?? "queued";
  const result = await client.query<SyncRunRow>(
    `INSERT INTO sync_runs (
      id, organization_id, company_id, connection_id, collection, status,
      started_at, correlation_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      CASE WHEN $6 IN ('running') THEN NOW() ELSE NULL END,
      $7
    )
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.connectionId,
      input.collection,
      status,
      input.correlationId ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function finishSyncRun(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    syncRunId: string;
    status: Exclude<SyncRunStatus, "queued" | "running">;
    itemCount?: number | null;
    pageCount?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
): Promise<SyncRunRow | null> {
  const result = await client.query<SyncRunRow>(
    `UPDATE sync_runs SET
      status = $1,
      finished_at = NOW(),
      started_at = COALESCE(started_at, NOW()),
      item_count = COALESCE($2, item_count),
      page_count = COALESCE($3, page_count),
      error_code = $4,
      error_message = $5
     WHERE organization_id = $6 AND company_id = $7 AND id = $8
     RETURNING *`,
    [
      input.status,
      input.itemCount ?? null,
      input.pageCount ?? null,
      input.errorCode ?? null,
      input.errorMessage ?? null,
      input.organizationId,
      input.companyId,
      input.syncRunId,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listSyncRuns(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    connectionId?: string;
    collection?: SyncCollection;
    limit?: number;
  },
): Promise<SyncRunRow[]> {
  const params: unknown[] = [input.organizationId, input.companyId];
  const clauses = ["organization_id = $1", "company_id = $2"];
  if (input.connectionId) {
    params.push(input.connectionId);
    clauses.push(`connection_id = $${params.length}`);
  }
  if (input.collection) {
    params.push(input.collection);
    clauses.push(`collection = $${params.length}`);
  }
  params.push(input.limit ?? 50);
  const result = await client.query<SyncRunRow>(
    `SELECT * FROM sync_runs
     WHERE ${clauses.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Collection state
// ---------------------------------------------------------------------------

export async function upsertCollectionState(
  client: DbClient,
  input: {
    connectionId: string;
    collection: SyncCollection;
    lastAttemptAt?: Date | string | null;
    lastSuccessAt?: Date | string | null;
    lastError?: string | null;
    consecutiveFailures?: number;
    succeeded?: boolean;
  },
): Promise<SyncCollectionStateRow> {
  const attemptAt = input.lastAttemptAt ?? new Date();
  let consecutiveFailures = input.consecutiveFailures;
  let lastSuccessAt = input.lastSuccessAt;
  let lastError = input.lastError;

  if (input.succeeded === true) {
    consecutiveFailures = 0;
    lastSuccessAt = lastSuccessAt ?? attemptAt;
    lastError = null;
  } else if (input.succeeded === false) {
    if (consecutiveFailures === undefined) {
      const existing = await client.query<{ consecutive_failures: number }>(
        `SELECT consecutive_failures FROM sync_collection_state
         WHERE connection_id = $1 AND collection = $2`,
        [input.connectionId, input.collection],
      );
      consecutiveFailures = (existing.rows[0]?.consecutive_failures ?? 0) + 1;
    }
  }

  const result = await client.query<SyncCollectionStateRow>(
    `INSERT INTO sync_collection_state (
      connection_id, collection, last_success_at, last_attempt_at, last_error, consecutive_failures
    ) VALUES ($1,$2,$3,$4,$5,COALESCE($6, 0))
    ON CONFLICT (connection_id, collection) DO UPDATE SET
      last_attempt_at = EXCLUDED.last_attempt_at,
      last_success_at = COALESCE(EXCLUDED.last_success_at, sync_collection_state.last_success_at),
      last_error = EXCLUDED.last_error,
      consecutive_failures = COALESCE(EXCLUDED.consecutive_failures, sync_collection_state.consecutive_failures)
    RETURNING *`,
    [
      input.connectionId,
      input.collection,
      lastSuccessAt ?? null,
      attemptAt,
      lastError ?? null,
      consecutiveFailures ?? null,
    ],
  );
  return result.rows[0]!;
}

// ---------------------------------------------------------------------------
// Observation apply helpers (idempotent UPSERT; never delete on partial sync)
// ---------------------------------------------------------------------------

export type AppliedAccount = {
  id: string;
  created: boolean;
  externalId: string;
};

/**
 * UPSERT accounts by (organization_id, company_id, provider_source, external_id).
 * Does not delete or disable accounts that are absent from this observation batch.
 */
export async function applyAccountObservations(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    providerSource: ObservationSource;
    observations: AccountObservation[];
  },
): Promise<AppliedAccount[]> {
  const applied: AppliedAccount[] = [];

  for (const obs of input.observations) {
    const existing = await client.query<{
      id: string;
      login_name: string;
      account_kind: string;
      enabled_state: string;
    }>(
      `SELECT id, login_name, account_kind, enabled_state FROM accounts
       WHERE organization_id = $1 AND company_id = $2
         AND provider_source = $3 AND external_id = $4`,
      [input.organizationId, input.companyId, input.providerSource, obs.externalId],
    );

    const observedAt = obs.observedAt ?? new Date();
    const accountKind = obs.accountKind ?? "human";
    const enabledState = obs.enabledState ?? "unknown";
    const freshnessNote =
      obs.freshnessNote ??
      `Last ${input.providerSource} observation (implemented; not live-verified)`;

    if (existing.rows[0]) {
      const row = existing.rows[0];
      await client.query(
        `UPDATE accounts SET
          login_name = $1,
          account_kind = $2,
          enabled_state = $3,
          last_observed_at = $4::timestamptz,
          freshness_note = $5,
          updated_at = NOW(),
          version = version + 1
         WHERE id = $6`,
        [obs.loginName, accountKind, enabledState, observedAt, freshnessNote, row.id],
      );
      const changed =
        row.login_name !== obs.loginName ||
        row.account_kind !== accountKind ||
        row.enabled_state !== enabledState;
      if (changed) {
        await insertTimelineEvent(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          entityType: "account",
          entityId: row.id,
          eventKind: "account.observed_updated",
          observedAt,
          source: timelineSource(input.providerSource),
          summary: `Updated account ${obs.loginName} from ${input.providerSource} sync`,
        });
      }
      applied.push({ id: row.id, created: false, externalId: obs.externalId });
    } else {
      const id = randomUUID();
      await client.query(
        `INSERT INTO accounts (
          id, organization_id, company_id, person_id, provider_source, external_id,
          login_name, account_kind, enabled_state, last_observed_at, freshness_note
        ) VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9::timestamptz,$10)`,
        [
          id,
          input.organizationId,
          input.companyId,
          input.providerSource,
          obs.externalId,
          obs.loginName,
          accountKind,
          enabledState,
          observedAt,
          freshnessNote,
        ],
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "account",
        entityId: id,
        eventKind: "account.observed_created",
        observedAt,
        source: timelineSource(input.providerSource),
        summary: `Observed new account ${obs.loginName} from ${input.providerSource} sync`,
      });
      applied.push({ id, created: true, externalId: obs.externalId });
    }
  }

  return applied;
}

export type AppliedGroup = {
  id: string;
  created: boolean;
  externalId: string;
};

/**
 * UPSERT groups by external_id. Membership apply never ends unobserved memberships
 * (partial sync cannot infer removals — §4.5).
 */
export async function applyGroupObservations(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    source: ObservationSource;
    observations: GroupObservation[];
  },
): Promise<AppliedGroup[]> {
  const applied: AppliedGroup[] = [];

  for (const obs of input.observations) {
    const existing = await client.query<{ id: string; display_name: string }>(
      `SELECT id, display_name FROM groups
       WHERE organization_id = $1 AND company_id = $2 AND external_id = $3`,
      [input.organizationId, input.companyId, obs.externalId],
    );
    const capability = obs.membershipCapability ?? "direct";

    if (existing.rows[0]) {
      const row = existing.rows[0];
      await client.query(
        `UPDATE groups SET
          display_name = $1,
          email_address = $2,
          group_type = $3,
          membership_capability = $4,
          source = $5,
          updated_at = NOW(),
          version = version + 1
         WHERE id = $6`,
        [
          obs.displayName,
          obs.emailAddress ?? null,
          obs.groupType,
          capability,
          input.source,
          row.id,
        ],
      );
      if (row.display_name !== obs.displayName) {
        await insertTimelineEvent(client, {
          organizationId: input.organizationId,
          companyId: input.companyId,
          entityType: "group",
          entityId: row.id,
          eventKind: "group.observed_updated",
          source: timelineSource(input.source),
          summary: `Updated group ${obs.displayName} from ${input.source} sync`,
        });
      }
      applied.push({ id: row.id, created: false, externalId: obs.externalId });
    } else {
      const id = randomUUID();
      await client.query(
        `INSERT INTO groups (
          id, organization_id, company_id, external_id, display_name, email_address,
          group_type, membership_capability, source
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          input.organizationId,
          input.companyId,
          obs.externalId,
          obs.displayName,
          obs.emailAddress ?? null,
          obs.groupType,
          capability,
          input.source,
        ],
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "group",
        entityId: id,
        eventKind: "group.observed_created",
        source: timelineSource(input.source),
        summary: `Observed new group ${obs.displayName} from ${input.source} sync`,
      });
      applied.push({ id, created: true, externalId: obs.externalId });
    }
  }

  return applied;
}

export type AppliedMembership = {
  id: string;
  created: boolean;
  groupId: string;
  accountId: string;
};

/**
 * Upsert observed memberships. Never ends or deletes memberships absent from
 * this batch — partial sync must not wipe memberships (§4.5 / M2.3).
 */
export async function applyMembershipObservations(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    providerSource: ObservationSource;
    observations: MembershipObservation[];
    /** Ignored for removals: partial sync never removes unobserved memberships. */
    partial?: boolean;
  },
): Promise<AppliedMembership[]> {
  void input.partial; // documented invariant: never reconcile absence here
  const applied: AppliedMembership[] = [];

  for (const obs of input.observations) {
    const group = await client.query<{ id: string }>(
      `SELECT id FROM groups
       WHERE organization_id = $1 AND company_id = $2 AND external_id = $3`,
      [input.organizationId, input.companyId, obs.groupExternalId],
    );
    const account = await client.query<{ id: string }>(
      `SELECT id FROM accounts
       WHERE organization_id = $1 AND company_id = $2
         AND provider_source = $3 AND external_id = $4`,
      [
        input.organizationId,
        input.companyId,
        input.providerSource,
        obs.accountExternalId,
      ],
    );
    if (!group.rows[0] || !account.rows[0]) {
      continue;
    }
    const groupId = group.rows[0].id;
    const accountId = account.rows[0].id;
    const kind = obs.membershipKind ?? "direct";
    const verification = obs.verificationSource ?? `${input.providerSource}_sync`;

    const existing = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM group_memberships
       WHERE organization_id = $1 AND company_id = $2
         AND group_id = $3 AND account_id = $4
       ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 1`,
      [input.organizationId, input.companyId, groupId, accountId],
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      await client.query(
        `UPDATE group_memberships SET
          membership_kind = $1,
          verification_source = $2,
          status = 'active',
          end_date = NULL,
          updated_at = NOW()
         WHERE id = $3`,
        [kind, verification, row.id],
      );
      applied.push({ id: row.id, created: false, groupId, accountId });
    } else {
      const id = randomUUID();
      await client.query(
        `INSERT INTO group_memberships (
          id, organization_id, company_id, group_id, account_id, membership_kind,
          verification_source, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active')`,
        [
          id,
          input.organizationId,
          input.companyId,
          groupId,
          accountId,
          kind,
          verification,
        ],
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "group",
        entityId: groupId,
        eventKind: "group.membership_observed",
        source: timelineSource(input.providerSource),
        summary: `Observed membership for account ${obs.accountExternalId}`,
      });
      applied.push({ id, created: true, groupId, accountId });
    }
  }

  return applied;
}

export type AppliedSkuPool = {
  id: string;
  created: boolean;
  providerSku: string;
};

/**
 * UPSERT license_pools from observed SKUs. Manual subscription pricing stays
 * on subscriptions/price_versions — not overwritten here.
 */
export async function applySkuObservations(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    source: ObservationSource;
    observations: SkuObservation[];
  },
): Promise<AppliedSkuPool[]> {
  const applied: AppliedSkuPool[] = [];

  for (const obs of input.observations) {
    const freshnessNote =
      obs.freshnessNote ??
      `Observed ${input.source} SKU pool (implemented; not live-verified)`;
    const observedAt = obs.observedAt ?? new Date();

    const existing = await client.query<{ id: string }>(
      `SELECT id FROM license_pools
       WHERE organization_id = $1 AND company_id = $2
         AND provider_sku = $3 AND source = $4`,
      [input.organizationId, input.companyId, obs.providerSku, input.source],
    );

    if (existing.rows[0]) {
      const id = existing.rows[0].id;
      await client.query(
        `UPDATE license_pools SET
          product_id = $1,
          purchased_quantity = $2,
          consumed_quantity = $3,
          last_observed_at = $4::timestamptz,
          freshness_note = $5,
          updated_at = NOW(),
          version = version + 1
         WHERE id = $6`,
        [
          obs.productId,
          obs.purchasedQuantity,
          obs.consumedQuantity ?? null,
          observedAt,
          freshnessNote,
          id,
        ],
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "license_pool",
        entityId: id,
        eventKind: "license_pool.observed_updated",
        observedAt,
        source: timelineSource(input.source),
        summary: `Updated observed SKU ${obs.providerSku} from ${input.source} sync`,
      });
      applied.push({ id, created: false, providerSku: obs.providerSku });
    } else {
      const id = randomUUID();
      await client.query(
        `INSERT INTO license_pools (
          id, organization_id, company_id, product_id, provider_sku,
          purchased_quantity, consumed_quantity, source, last_observed_at, freshness_note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10)`,
        [
          id,
          input.organizationId,
          input.companyId,
          obs.productId,
          obs.providerSku,
          obs.purchasedQuantity,
          obs.consumedQuantity ?? null,
          input.source,
          observedAt,
          freshnessNote,
        ],
      );
      await insertTimelineEvent(client, {
        organizationId: input.organizationId,
        companyId: input.companyId,
        entityType: "license_pool",
        entityId: id,
        eventKind: "license_pool.observed_created",
        observedAt,
        source: timelineSource(input.source),
        summary: `Observed SKU ${obs.providerSku} from ${input.source} sync`,
      });
      applied.push({ id, created: true, providerSku: obs.providerSku });
    }
  }

  return applied;
}

// ---------------------------------------------------------------------------
// Person-link proposals (email attribute match; never auto-merge; staff ≠ people)
// ---------------------------------------------------------------------------

export async function createPersonLinkProposals(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    /** Accounts with optional mail attribute for matching. */
    accounts: Array<{ accountId: string; mail?: string | null; loginName?: string | null }>;
  },
): Promise<PersonLinkProposalRow[]> {
  const created: PersonLinkProposalRow[] = [];

  for (const account of input.accounts) {
    const email = (account.mail ?? account.loginName ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) continue;

    // Match people in the same company only. Never staff/"user" table.
    const people = await client.query<{ id: string }>(
      `SELECT id FROM people
       WHERE organization_id = $1 AND company_id = $2
         AND lower(work_email) = $3
         AND archived_at IS NULL`,
      [input.organizationId, input.companyId, email],
    );

    if (people.rows.length !== 1) {
      // Ambiguous or no match → skip auto proposal (require review when ambiguous).
      continue;
    }

    const personId = people.rows[0]!.id;

    // Do not propose if already linked to this person.
    const linked = await client.query(
      `SELECT 1 FROM accounts
       WHERE id = $1 AND person_id = $2`,
      [account.accountId, personId],
    );
    if ((linked.rowCount ?? 0) > 0) continue;

    const result = await client.query<PersonLinkProposalRow>(
      `INSERT INTO person_link_proposals (
        id, organization_id, company_id, account_id, person_id,
        proposed_by, confidence, status
      ) VALUES ($1,$2,$3,$4,$5,'email_match','exact_email','open')
      ON CONFLICT (organization_id, company_id, account_id, person_id)
        WHERE status = 'open' AND person_id IS NOT NULL
      DO NOTHING
      RETURNING *`,
      [
        randomUUID(),
        input.organizationId,
        input.companyId,
        account.accountId,
        personId,
      ],
    );
    if (result.rows[0]) {
      created.push(result.rows[0]);
    }
  }

  return created;
}

export async function listPersonLinkProposals(
  client: DbClient,
  organizationId: string,
  companyId: string,
  status: "open" | "accepted" | "rejected" = "open",
): Promise<PersonLinkProposalRow[]> {
  const result = await client.query<PersonLinkProposalRow>(
    `SELECT * FROM person_link_proposals
     WHERE organization_id = $1 AND company_id = $2 AND status = $3
     ORDER BY created_at DESC`,
    [organizationId, companyId, status],
  );
  return result.rows;
}
