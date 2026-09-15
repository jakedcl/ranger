-- M3 lifecycle: versioned role templates, frozen workflow runs, step attempts, notifications.

CREATE TABLE IF NOT EXISTS role_templates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS role_template_versions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  template_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  intents JSONB NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, template_id, version_number),
  FOREIGN KEY (organization_id, template_id)
    REFERENCES role_templates (organization_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_template_bindings (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  template_id UUID NOT NULL,
  binding_key TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('group', 'subscription')),
  resource_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, template_id, binding_key),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, template_id)
    REFERENCES role_templates (organization_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  person_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('onboarding', 'offboarding', 'status_change')),
  status TEXT NOT NULL CHECK (
    status IN (
      'preview', 'approved', 'running', 'waiting_manual',
      'succeeded', 'partial', 'failed', 'canceled'
    )
  ),
  template_id UUID,
  template_version_id UUID,
  frozen_plan JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_staff_user_id TEXT NOT NULL,
  correlation_id TEXT,
  approved_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (organization_id, company_id, id),
  UNIQUE (organization_id, company_id, idempotency_key),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, person_id)
    REFERENCES people (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS workflow_runs_person_idx
  ON workflow_runs (organization_id, company_id, person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_runs_status_idx
  ON workflow_runs (status) WHERE status IN ('approved', 'running', 'waiting_manual');

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  run_id UUID NOT NULL,
  step_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  execution_method TEXT NOT NULL CHECK (execution_method IN ('graph', 'manual', 'local')),
  depends_on TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'running', 'succeeded', 'failed', 'canceled', 'awaiting_manual', 'skipped')
  ),
  params JSONB NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  result_evidence TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, step_key),
  FOREIGN KEY (organization_id, company_id, run_id)
    REFERENCES workflow_runs (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_step_attempts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  run_id UUID NOT NULL,
  step_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  provider_accepted BOOLEAN,
  verified BOOLEAN,
  evidence TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, company_id, run_id)
    REFERENCES workflow_runs (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_user_id TEXT NOT NULL,
  company_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  run_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welcome_email_previews (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  run_id UUID NOT NULL,
  person_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id, company_id, run_id)
    REFERENCES workflow_runs (organization_id, company_id, id)
    ON DELETE CASCADE
);
