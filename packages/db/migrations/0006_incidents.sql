-- M4 investigations: incidents, evidence, entries, related suggestions, problems, exports.

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  reported_symptom TEXT NOT NULL,
  impact_description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (
    status IN ('open', 'investigating', 'waiting', 'resolved', 'closed')
  ),
  owner_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  onset_at TIMESTAMPTZ,
  external_ticket_ref TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  resolution_summary TEXT,
  resolution_kind TEXT CHECK (
    resolution_kind IS NULL OR resolution_kind IN ('confirmed_cause', 'unresolved_hypothesis')
  ),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  workflow_run_id UUID,
  workflow_step_key TEXT,
  correlation_id TEXT,
  provider_error TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS incidents_company_status_idx
  ON incidents (organization_id, company_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS incident_affected_resources (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  resource_type TEXT NOT NULL CHECK (
    resource_type IN ('person', 'account', 'group', 'product', 'device', 'subscription', 'workflow_run')
  ),
  resource_id UUID NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, incident_id, resource_type, resource_id),
  FOREIGN KEY (organization_id, company_id, incident_id)
    REFERENCES incidents (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incident_evidence (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  file_object_id UUID REFERENCES file_objects(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('upload', 'ranger_event', 'parsed_log', 'redacted_derivative', 'demo_service')
  ),
  source_label TEXT NOT NULL,
  original_filename TEXT,
  content_type TEXT,
  byte_size INTEGER,
  sha256 TEXT,
  storage_key TEXT,
  collection_time TIMESTAMPTZ,
  timestamp_precision TEXT CHECK (
    timestamp_precision IS NULL
    OR timestamp_precision IN ('exact', 'date_only', 'unknown', 'assumed_utc')
  ),
  parser_version TEXT,
  parse_warnings JSONB NOT NULL DEFAULT '[]',
  parsed_summary JSONB,
  redacted_from_evidence_id UUID,
  is_redacted BOOLEAN NOT NULL DEFAULT FALSE,
  ranger_event_ref JSONB,
  uploaded_by_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id, company_id, incident_id)
    REFERENCES incidents (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS incident_evidence_incident_idx
  ON incident_evidence (organization_id, company_id, incident_id);

CREATE TABLE IF NOT EXISTS investigation_entries (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  entry_kind TEXT NOT NULL CHECK (
    entry_kind IN ('observation', 'hypothesis', 'action', 'result', 'note')
  ),
  body TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  time_precision TEXT NOT NULL DEFAULT 'unknown' CHECK (
    time_precision IN ('exact', 'date_only', 'unknown', 'assumed_utc')
  ),
  author_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  linked_evidence_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id, company_id, incident_id)
    REFERENCES incidents (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS related_incident_suggestions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  suggested_incident_id UUID NOT NULL,
  scoring_version INTEGER NOT NULL,
  score INTEGER NOT NULL,
  reasons JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (
    status IN ('suggested', 'dismissed', 'linked')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, incident_id, suggested_incident_id, scoring_version),
  FOREIGN KEY (organization_id, company_id, incident_id)
    REFERENCES incidents (organization_id, company_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, suggested_incident_id)
    REFERENCES incidents (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  working_cause TEXT,
  resolution TEXT,
  owner_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  permanent_fix_work_item_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, company_id, id),
  FOREIGN KEY (organization_id, company_id)
    REFERENCES companies (organization_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS problem_incidents (
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  problem_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, company_id, problem_id, incident_id),
  FOREIGN KEY (organization_id, company_id, problem_id)
    REFERENCES problems (organization_id, company_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id, incident_id)
    REFERENCES incidents (organization_id, company_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incident_exports (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  incident_id UUID NOT NULL,
  created_by_staff_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  selected_evidence_ids UUID[] NOT NULL,
  selected_entry_ids UUID[] NOT NULL,
  excluded_fields TEXT[] NOT NULL DEFAULT '{}',
  report_markdown TEXT NOT NULL,
  manifest JSONB NOT NULL,
  storage_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id, company_id, incident_id)
    REFERENCES incidents (organization_id, company_id, id)
    ON DELETE CASCADE
);
