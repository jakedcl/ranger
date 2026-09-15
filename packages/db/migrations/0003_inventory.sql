-- M1 inventory: people, accounts, products, subscriptions, groups, mailboxes, devices, work, imports, archive obligations.

-- ---------------------------------------------------------------------------
-- People (company-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  role_title TEXT,
  department TEXT,
  sponsor TEXT,
  it_status TEXT NOT NULL CHECK (it_status IN ('planned', 'active', 'on_leave', 'departed')),
  archived_at TIMESTAMPTZ,
  start_date DATE,
  end_date DATE,
  workflow_badge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS people_company_idx ON people (organization_id, company_id);
CREATE INDEX IF NOT EXISTS people_company_status_idx ON people (organization_id, company_id, it_status);
CREATE INDEX IF NOT EXISTS people_work_email_idx ON people (organization_id, company_id, lower(work_email));

-- ---------------------------------------------------------------------------
-- Accounts (company-scoped; optional same-company person link)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  person_id UUID,
  provider_source TEXT NOT NULL CHECK (provider_source IN ('manual', 'microsoft', 'import', 'workflow')),
  external_id TEXT,
  login_name TEXT NOT NULL,
  account_kind TEXT NOT NULL CHECK (account_kind IN ('human', 'guest', 'service', 'shared_mailbox_ref')),
  enabled_state TEXT NOT NULL CHECK (enabled_state IN ('enabled', 'disabled', 'unknown')),
  last_observed_at TIMESTAMPTZ,
  freshness_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, person_id)
    REFERENCES people (organization_id, company_id, id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS accounts_company_idx ON accounts (organization_id, company_id);
CREATE INDEX IF NOT EXISTS accounts_person_idx ON accounts (organization_id, company_id, person_id);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_external_id_uniq
  ON accounts (organization_id, company_id, provider_source, external_id)
  WHERE external_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Products (organization catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  category TEXT NOT NULL,
  assignment_model TEXT NOT NULL CHECK (assignment_model IN ('named_user', 'shared_device', 'organization_wide')),
  documentation_url TEXT,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS products_organization_idx ON products (organization_id);

-- ---------------------------------------------------------------------------
-- Subscriptions (company purchase of an org-compatible product)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  product_id UUID NOT NULL,
  supplier TEXT,
  external_reference TEXT,
  purchased_quantity INTEGER NOT NULL CHECK (purchased_quantity >= 0),
  currency CHAR(3) NOT NULL,
  payer TEXT NOT NULL CHECK (payer IN ('msp', 'company')),
  billing_cadence TEXT NOT NULL,
  commitment_start DATE,
  commitment_end DATE,
  renewal_date DATE,
  state TEXT NOT NULL CHECK (state IN ('active', 'canceled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id)
);

CREATE INDEX IF NOT EXISTS subscriptions_company_idx ON subscriptions (organization_id, company_id);
CREATE INDEX IF NOT EXISTS subscriptions_product_idx ON subscriptions (organization_id, product_id);

-- ---------------------------------------------------------------------------
-- Subscription price versions (historical prices; null unit_price = unknown)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_price_versions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  unit_price NUMERIC,
  price_kind TEXT NOT NULL CHECK (price_kind IN ('unit', 'flat')),
  cadence TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id, subscription_id)
    REFERENCES subscriptions (organization_id, company_id, id)
    ON DELETE CASCADE,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS subscription_price_versions_sub_idx
  ON subscription_price_versions (organization_id, company_id, subscription_id, effective_from);

-- ---------------------------------------------------------------------------
-- License pools
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_pools (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  product_id UUID NOT NULL,
  provider_sku TEXT,
  purchased_quantity INTEGER NOT NULL CHECK (purchased_quantity >= 0),
  consumed_quantity INTEGER CHECK (consumed_quantity IS NULL OR consumed_quantity >= 0),
  source TEXT NOT NULL,
  last_observed_at TIMESTAMPTZ,
  freshness_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id)
);

CREATE INDEX IF NOT EXISTS license_pools_company_product_idx
  ON license_pools (organization_id, company_id, product_id);

-- ---------------------------------------------------------------------------
-- License assignments (person and/or account; same-company FKs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_assignments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  person_id UUID,
  account_id UUID,
  product_id UUID NOT NULL,
  subscription_id UUID,
  pool_id UUID,
  status TEXT NOT NULL CHECK (status IN ('active', 'removal_pending', 'ended')),
  start_effective_date DATE,
  end_effective_date DATE,
  date_provenance TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  CHECK (person_id IS NOT NULL OR account_id IS NOT NULL),
  CHECK (end_effective_date IS NULL OR start_effective_date IS NULL OR end_effective_date >= start_effective_date),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, person_id)
    REFERENCES people (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id, account_id)
    REFERENCES accounts (organization_id, company_id, id),
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id),
  FOREIGN KEY (organization_id, company_id, subscription_id)
    REFERENCES subscriptions (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id, pool_id)
    REFERENCES license_pools (organization_id, company_id, id)
);

CREATE INDEX IF NOT EXISTS license_assignments_person_idx
  ON license_assignments (organization_id, company_id, person_id)
  WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS license_assignments_product_status_idx
  ON license_assignments (organization_id, company_id, product_id, status);
CREATE INDEX IF NOT EXISTS license_assignments_subscription_idx
  ON license_assignments (organization_id, company_id, subscription_id)
  WHERE subscription_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  external_id TEXT,
  display_name TEXT NOT NULL,
  email_address TEXT,
  group_type TEXT NOT NULL CHECK (
    group_type IN ('security', 'microsoft_365', 'distribution', 'mail_enabled_security', 'manual')
  ),
  membership_capability TEXT NOT NULL CHECK (
    membership_capability IN ('direct', 'dynamic', 'unsupported')
  ),
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS groups_company_idx ON groups (organization_id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS groups_external_id_uniq
  ON groups (organization_id, company_id, external_id)
  WHERE external_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Group memberships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  group_id UUID NOT NULL,
  account_id UUID NOT NULL,
  membership_kind TEXT NOT NULL CHECK (membership_kind IN ('direct', 'inherited', 'dynamic')),
  start_date DATE,
  end_date DATE,
  verification_source TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id, group_id)
    REFERENCES groups (organization_id, company_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, account_id)
    REFERENCES accounts (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS group_memberships_group_idx
  ON group_memberships (organization_id, company_id, group_id);
CREATE INDEX IF NOT EXISTS group_memberships_account_idx
  ON group_memberships (organization_id, company_id, account_id);

-- ---------------------------------------------------------------------------
-- Shared mailboxes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_mailboxes (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  address TEXT NOT NULL,
  source TEXT NOT NULL,
  state TEXT NOT NULL,
  owner_person_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  UNIQUE (organization_id, company_id, address),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, owner_person_id)
    REFERENCES people (organization_id, company_id, id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS shared_mailboxes_company_idx
  ON shared_mailboxes (organization_id, company_id);

-- ---------------------------------------------------------------------------
-- Mailbox access
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mailbox_access (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  mailbox_id UUID NOT NULL,
  account_id UUID NOT NULL,
  permission_kind TEXT NOT NULL CHECK (permission_kind IN ('full_access', 'send_as', 'send_on_behalf')),
  start_date DATE,
  end_date DATE,
  source TEXT NOT NULL,
  verification_status TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id, mailbox_id)
    REFERENCES shared_mailboxes (organization_id, company_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, account_id)
    REFERENCES accounts (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS mailbox_access_mailbox_idx
  ON mailbox_access (organization_id, company_id, mailbox_id);
CREATE INDEX IF NOT EXISTS mailbox_access_account_idx
  ON mailbox_access (organization_id, company_id, account_id);

-- ---------------------------------------------------------------------------
-- Devices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  asset_tag TEXT,
  serial TEXT,
  device_type TEXT NOT NULL,
  hostname TEXT,
  model TEXT,
  state TEXT NOT NULL CHECK (state IN ('assigned', 'available', 'repair', 'returned', 'retired')),
  source TEXT NOT NULL,
  cost NUMERIC,
  currency CHAR(3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  CHECK ((cost IS NULL AND currency IS NULL) OR (cost IS NOT NULL AND currency IS NOT NULL)),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS devices_company_idx ON devices (organization_id, company_id);
CREATE INDEX IF NOT EXISTS devices_company_state_idx ON devices (organization_id, company_id, state);

-- ---------------------------------------------------------------------------
-- Device assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_assignments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  device_id UUID NOT NULL,
  person_id UUID NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  custody_disposition TEXT,
  evidence_note TEXT,
  status TEXT NOT NULL CHECK (status IN ('current', 'historical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id, device_id)
    REFERENCES devices (organization_id, company_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, person_id)
    REFERENCES people (organization_id, company_id, id)
);

CREATE INDEX IF NOT EXISTS device_assignments_device_idx
  ON device_assignments (organization_id, company_id, device_id);
CREATE INDEX IF NOT EXISTS device_assignments_person_idx
  ON device_assignments (organization_id, company_id, person_id);
CREATE UNIQUE INDEX IF NOT EXISTS device_assignments_one_current_uniq
  ON device_assignments (organization_id, company_id, device_id)
  WHERE status = 'current';

-- ---------------------------------------------------------------------------
-- Work items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  type TEXT NOT NULL,
  target_person_id UUID,
  owner_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  status TEXT NOT NULL,
  due_date DATE,
  title TEXT NOT NULL,
  description TEXT,
  completion_evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, target_person_id)
    REFERENCES people (organization_id, company_id, id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS work_items_company_idx ON work_items (organization_id, company_id);
CREATE INDEX IF NOT EXISTS work_items_status_idx ON work_items (organization_id, company_id, status);
CREATE INDEX IF NOT EXISTS work_items_target_person_idx
  ON work_items (organization_id, company_id, target_person_id)
  WHERE target_person_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Timeline events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_kind TEXT NOT NULL,
  actor_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  effective_at TIMESTAMPTZ,
  observed_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  summary TEXT NOT NULL,
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS timeline_events_entity_idx
  ON timeline_events (organization_id, entity_type, entity_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS timeline_events_company_idx
  ON timeline_events (organization_id, company_id, recorded_at DESC)
  WHERE company_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Import batches / rows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  resource_kind TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('preview', 'applied', 'failed', 'canceled')),
  schema_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_rows (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  row_number INTEGER NOT NULL CHECK (row_number >= 1),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'invalid', 'duplicate', 'skipped')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  dedupe_key TEXT,
  apply_status TEXT CHECK (apply_status IN ('pending', 'applied', 'noop', 'failed', 'skipped')),
  apply_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  UNIQUE (organization_id, company_id, batch_id, row_number),
  FOREIGN KEY (organization_id, company_id, batch_id)
    REFERENCES import_batches (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS import_rows_batch_idx
  ON import_rows (organization_id, company_id, batch_id, row_number);

-- ---------------------------------------------------------------------------
-- Offboarding obligations (archive gate inputs; survive unlink)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offboarding_obligations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  person_id UUID NOT NULL,
  obligation_kind TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved', 'not_applicable')),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id, person_id)
    REFERENCES people (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS offboarding_obligations_person_idx
  ON offboarding_obligations (organization_id, company_id, person_id, status);
