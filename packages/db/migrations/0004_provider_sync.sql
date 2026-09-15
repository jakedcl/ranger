-- M2 provider connections, sync runs, collection state, and person-link proposals.
-- Live Microsoft tenants remain Blocked until authorized; schema supports demo + microsoft.

-- Accounts may be observed from the deterministic demo adapter as well as Microsoft.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_provider_source_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_provider_source_check
  CHECK (provider_source IN ('manual', 'microsoft', 'import', 'workflow', 'demo'));

-- Observed license pools upsert by company + provider SKU + source (microsoft|demo).
CREATE UNIQUE INDEX IF NOT EXISTS license_pools_provider_sku_source_uniq
  ON license_pools (organization_id, company_id, provider_sku, source)
  WHERE provider_sku IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Provider connections (demo or microsoft; credential_ref is a name only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_connections (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  provider_kind TEXT NOT NULL CHECK (provider_kind IN ('demo', 'microsoft')),
  tenant_id TEXT,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'connected', 'error', 'disabled')),
  credential_ref TEXT,
  failure_mode TEXT,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CHECK (
    (provider_kind = 'demo' AND tenant_id IS NULL)
    OR (provider_kind = 'microsoft')
  ),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS provider_connections_company_idx
  ON provider_connections (organization_id, company_id);

-- One connected Microsoft tenant per organization (active only).
CREATE UNIQUE INDEX IF NOT EXISTS provider_connections_microsoft_tenant_connected_uniq
  ON provider_connections (organization_id, tenant_id)
  WHERE provider_kind = 'microsoft'
    AND status = 'connected'
    AND tenant_id IS NOT NULL;

-- One demo connection per company is sufficient and enforced.
CREATE UNIQUE INDEX IF NOT EXISTS provider_connections_demo_company_uniq
  ON provider_connections (organization_id, company_id)
  WHERE provider_kind = 'demo';

-- ---------------------------------------------------------------------------
-- Sync runs (per connection + collection)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  collection TEXT NOT NULL CHECK (
    collection IN (
      'users',
      'groups',
      'group_memberships',
      'subscribed_skus',
      'capabilities'
    )
  ),
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'running', 'succeeded', 'partial', 'failed')
  ),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  item_count INTEGER,
  page_count INTEGER,
  error_code TEXT,
  error_message TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, connection_id)
    REFERENCES provider_connections (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sync_runs_connection_idx
  ON sync_runs (organization_id, company_id, connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sync_runs_collection_idx
  ON sync_runs (connection_id, collection, created_at DESC);

-- ---------------------------------------------------------------------------
-- Per-collection freshness / failure state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_collection_state (
  connection_id UUID NOT NULL REFERENCES provider_connections (id) ON DELETE CASCADE,
  collection TEXT NOT NULL CHECK (
    collection IN (
      'users',
      'groups',
      'group_memberships',
      'subscribed_skus',
      'capabilities'
    )
  ),
  last_success_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  PRIMARY KEY (connection_id, collection)
);

-- ---------------------------------------------------------------------------
-- Person-link proposals (email match is a proposal, never auto-merge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS person_link_proposals (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  account_id UUID NOT NULL,
  person_id UUID,
  proposed_by TEXT NOT NULL CHECK (proposed_by IN ('email_match')),
  confidence TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, account_id)
    REFERENCES accounts (organization_id, company_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, person_id)
    REFERENCES people (organization_id, company_id, id)
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS person_link_proposals_open_account_person_uniq
  ON person_link_proposals (organization_id, company_id, account_id, person_id)
  WHERE status = 'open' AND person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS person_link_proposals_company_status_idx
  ON person_link_proposals (organization_id, company_id, status);
