import { randomUUID } from "node:crypto";
import type {
  FrozenPlan,
  TemplateIntent,
  WorkflowKind,
  WorkflowRunStatus,
  WorkflowStepStatus,
} from "@ranger/domain";
import type { DbClient } from "./pool.ts";

export type RoleTemplateRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type RoleTemplateVersionRow = {
  id: string;
  organization_id: string;
  template_id: string;
  version_number: number;
  intents: TemplateIntent[];
  immutable: boolean;
  created_at: Date;
};

export type CompanyTemplateBindingRow = {
  id: string;
  organization_id: string;
  company_id: string;
  template_id: string;
  binding_key: string;
  resource_type: "group" | "subscription";
  resource_id: string;
};

export type WorkflowRunRow = {
  id: string;
  organization_id: string;
  company_id: string;
  person_id: string;
  kind: WorkflowKind;
  status: WorkflowRunStatus;
  template_id: string | null;
  template_version_id: string | null;
  frozen_plan: FrozenPlan;
  idempotency_key: string;
  actor_staff_user_id: string;
  correlation_id: string | null;
  approved_at: Date | null;
  canceled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type WorkflowStepRow = {
  id: string;
  organization_id: string;
  company_id: string;
  run_id: string;
  step_key: string;
  kind: string;
  execution_method: string;
  depends_on: string[];
  status: WorkflowStepStatus;
  params: Record<string, unknown>;
  summary: string;
  result_evidence: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

function parseIntents(value: unknown): TemplateIntent[] {
  return Array.isArray(value) ? (value as TemplateIntent[]) : [];
}

export async function createRoleTemplate(
  client: DbClient,
  input: {
    organizationId: string;
    name: string;
    description?: string | null;
    intents: TemplateIntent[];
    id?: string;
    versionId?: string;
  },
): Promise<{ template: RoleTemplateRow; version: RoleTemplateVersionRow }> {
  const id = input.id ?? randomUUID();
  const versionId = input.versionId ?? randomUUID();
  const template = await client.query<RoleTemplateRow>(
    `INSERT INTO role_templates (id, organization_id, name, description)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, input.organizationId, input.name, input.description ?? null],
  );
  const version = await client.query<RoleTemplateVersionRow>(
    `INSERT INTO role_template_versions (
      id, organization_id, template_id, version_number, intents, immutable
    ) VALUES ($1,$2,$3,1,$4::jsonb,TRUE) RETURNING *`,
    [versionId, input.organizationId, id, JSON.stringify(input.intents)],
  );
  return { template: template.rows[0]!, version: mapVersion(version.rows[0]!) };
}

function mapVersion(row: RoleTemplateVersionRow & { intents?: unknown }): RoleTemplateVersionRow {
  return { ...row, intents: parseIntents(row.intents) };
}

export async function addTemplateVersion(
  client: DbClient,
  input: { organizationId: string; templateId: string; intents: TemplateIntent[] },
): Promise<RoleTemplateVersionRow> {
  const current = await client.query<{ version_number: number }>(
    `SELECT COALESCE(MAX(version_number), 0) AS version_number
     FROM role_template_versions WHERE organization_id = $1 AND template_id = $2`,
    [input.organizationId, input.templateId],
  );
  const next = Number(current.rows[0]?.version_number ?? 0) + 1;
  const result = await client.query<RoleTemplateVersionRow>(
    `INSERT INTO role_template_versions (
      id, organization_id, template_id, version_number, intents, immutable
    ) VALUES ($1,$2,$3,$4,$5::jsonb,TRUE) RETURNING *`,
    [randomUUID(), input.organizationId, input.templateId, next, JSON.stringify(input.intents)],
  );
  await client.query(
    `UPDATE role_templates SET version = version + 1, updated_at = NOW()
     WHERE organization_id = $1 AND id = $2`,
    [input.organizationId, input.templateId],
  );
  return mapVersion(result.rows[0]!);
}

export async function listRoleTemplates(
  client: DbClient,
  organizationId: string,
): Promise<Array<RoleTemplateRow & { currentVersion: RoleTemplateVersionRow | null }>> {
  const templates = await client.query<RoleTemplateRow>(
    `SELECT * FROM role_templates WHERE organization_id = $1 ORDER BY name`,
    [organizationId],
  );
  const out = [];
  for (const template of templates.rows) {
    const version = await client.query<RoleTemplateVersionRow>(
      `SELECT * FROM role_template_versions
       WHERE organization_id = $1 AND template_id = $2
       ORDER BY version_number DESC LIMIT 1`,
      [organizationId, template.id],
    );
    out.push({
      ...template,
      currentVersion: version.rows[0] ? mapVersion(version.rows[0]) : null,
    });
  }
  return out;
}

export async function getTemplateVersion(
  client: DbClient,
  organizationId: string,
  versionId: string,
): Promise<RoleTemplateVersionRow | null> {
  const result = await client.query<RoleTemplateVersionRow>(
    `SELECT * FROM role_template_versions WHERE organization_id = $1 AND id = $2`,
    [organizationId, versionId],
  );
  return result.rows[0] ? mapVersion(result.rows[0]) : null;
}

export async function upsertCompanyBinding(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    templateId: string;
    bindingKey: string;
    resourceType: "group" | "subscription";
    resourceId: string;
  },
): Promise<CompanyTemplateBindingRow> {
  const result = await client.query<CompanyTemplateBindingRow>(
    `INSERT INTO company_template_bindings (
      id, organization_id, company_id, template_id, binding_key, resource_type, resource_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (organization_id, company_id, template_id, binding_key)
    DO UPDATE SET resource_type = EXCLUDED.resource_type, resource_id = EXCLUDED.resource_id, updated_at = NOW()
    RETURNING *`,
    [
      randomUUID(),
      input.organizationId,
      input.companyId,
      input.templateId,
      input.bindingKey,
      input.resourceType,
      input.resourceId,
    ],
  );
  return result.rows[0]!;
}

export async function listCompanyBindings(
  client: DbClient,
  organizationId: string,
  companyId: string,
  templateId: string,
): Promise<CompanyTemplateBindingRow[]> {
  const result = await client.query<CompanyTemplateBindingRow>(
    `SELECT * FROM company_template_bindings
     WHERE organization_id = $1 AND company_id = $2 AND template_id = $3
     ORDER BY binding_key`,
    [organizationId, companyId, templateId],
  );
  return result.rows;
}

export async function insertWorkflowRun(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    personId: string;
    kind: WorkflowKind;
    status?: WorkflowRunStatus;
    templateId?: string | null;
    templateVersionId?: string | null;
    frozenPlan: FrozenPlan;
    idempotencyKey: string;
    actorStaffUserId: string;
    correlationId?: string | null;
    id?: string;
  },
): Promise<WorkflowRunRow> {
  const id = input.id ?? randomUUID();
  const result = await client.query<WorkflowRunRow>(
    `INSERT INTO workflow_runs (
      id, organization_id, company_id, person_id, kind, status, template_id, template_version_id,
      frozen_plan, idempotency_key, actor_staff_user_id, correlation_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.personId,
      input.kind,
      input.status ?? "preview",
      input.templateId ?? null,
      input.templateVersionId ?? null,
      JSON.stringify(input.frozenPlan),
      input.idempotencyKey,
      input.actorStaffUserId,
      input.correlationId ?? null,
    ],
  );
  const run = mapRun(result.rows[0]!);
  for (const step of input.frozenPlan.steps) {
    await client.query(
      `INSERT INTO workflow_steps (
        id, organization_id, company_id, run_id, step_key, kind, execution_method,
        depends_on, status, params, summary
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
      [
        randomUUID(),
        input.organizationId,
        input.companyId,
        run.id,
        step.key,
        step.kind,
        step.executionMethod,
        step.dependsOn,
        "pending",
        JSON.stringify(step.params),
        step.summary,
      ],
    );
  }
  return run;
}

function mapRun(row: WorkflowRunRow): WorkflowRunRow {
  const plan = row.frozen_plan as FrozenPlan;
  return { ...row, frozen_plan: plan };
}

export async function getWorkflowRun(
  client: DbClient,
  organizationId: string,
  companyId: string,
  runId: string,
): Promise<WorkflowRunRow | null> {
  const result = await client.query<WorkflowRunRow>(
    `SELECT * FROM workflow_runs WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, runId],
  );
  return result.rows[0] ? mapRun(result.rows[0]) : null;
}

export async function listWorkflowRuns(
  client: DbClient,
  organizationId: string,
  companyId: string,
  personId?: string,
): Promise<WorkflowRunRow[]> {
  const params: unknown[] = [organizationId, companyId];
  let sql = `SELECT * FROM workflow_runs WHERE organization_id = $1 AND company_id = $2`;
  if (personId) {
    params.push(personId);
    sql += ` AND person_id = $3`;
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await client.query<WorkflowRunRow>(sql, params);
  return result.rows.map(mapRun);
}

export async function listRunnableWorkflows(client: DbClient): Promise<WorkflowRunRow[]> {
  const result = await client.query<WorkflowRunRow>(
    `SELECT * FROM workflow_runs
     WHERE status IN ('approved', 'running', 'waiting_manual')
     ORDER BY created_at ASC`,
  );
  return result.rows.map(mapRun);
}

export async function listWorkflowSteps(
  client: DbClient,
  runId: string,
): Promise<WorkflowStepRow[]> {
  const result = await client.query<WorkflowStepRow>(
    `SELECT * FROM workflow_steps WHERE run_id = $1 ORDER BY created_at`,
    [runId],
  );
  return result.rows;
}

export async function updateRunStatus(
  client: DbClient,
  runId: string,
  status: WorkflowRunStatus,
  extra?: { approvedAt?: boolean; canceledAt?: boolean },
): Promise<void> {
  await client.query(
    `UPDATE workflow_runs SET
      status = $2,
      approved_at = CASE WHEN $3 THEN NOW() ELSE approved_at END,
      canceled_at = CASE WHEN $4 THEN NOW() ELSE canceled_at END,
      updated_at = NOW(),
      version = version + 1
     WHERE id = $1`,
    [runId, status, extra?.approvedAt === true, extra?.canceledAt === true],
  );
}

export async function updateStepStatus(
  client: DbClient,
  stepId: string,
  status: WorkflowStepStatus,
  extra?: { evidence?: string | null; error?: string | null },
): Promise<void> {
  await client.query(
    `UPDATE workflow_steps SET
      status = $2,
      result_evidence = COALESCE($3, result_evidence),
      error_message = $4,
      updated_at = NOW()
     WHERE id = $1`,
    [stepId, status, extra?.evidence ?? null, extra?.error ?? null],
  );
}

export async function insertStepAttempt(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    runId: string;
    stepId: string;
    status: "running" | "succeeded" | "failed";
    providerAccepted?: boolean | null;
    verified?: boolean | null;
    evidence?: string | null;
    error?: string | null;
  },
): Promise<void> {
  const count = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM workflow_step_attempts WHERE step_id = $1`,
    [input.stepId],
  );
  await client.query(
    `INSERT INTO workflow_step_attempts (
      id, organization_id, company_id, run_id, step_id, attempt_number, status,
      provider_accepted, verified, evidence, error_message, finished_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, CASE WHEN $7 = 'running' THEN NULL ELSE NOW() END)`,
    [
      randomUUID(),
      input.organizationId,
      input.companyId,
      input.runId,
      input.stepId,
      Number(count.rows[0]?.n ?? 0) + 1,
      input.status,
      input.providerAccepted ?? null,
      input.verified ?? null,
      input.evidence ?? null,
      input.error ?? null,
    ],
  );
}

export async function insertNotification(
  client: DbClient,
  input: {
    organizationId: string;
    staffUserId: string;
    companyId?: string | null;
    title: string;
    body: string;
    runId?: string | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO in_app_notifications (
      id, organization_id, staff_user_id, company_id, title, body, run_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      randomUUID(),
      input.organizationId,
      input.staffUserId,
      input.companyId ?? null,
      input.title,
      input.body,
      input.runId ?? null,
    ],
  );
}

export async function listNotifications(
  client: DbClient,
  organizationId: string,
  staffUserId: string,
): Promise<Array<{ id: string; title: string; body: string; run_id: string | null; created_at: Date; read_at: Date | null }>> {
  const result = await client.query(
    `SELECT id, title, body, run_id, created_at, read_at
     FROM in_app_notifications
     WHERE organization_id = $1 AND staff_user_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [organizationId, staffUserId],
  );
  return result.rows;
}

export async function insertWelcomePreview(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    runId: string;
    personId: string;
    displayName: string;
    loginName: string;
  },
): Promise<void> {
  const existing = await client.query(
    `SELECT 1 FROM welcome_email_previews WHERE run_id = $1`,
    [input.runId],
  );
  if ((existing.rowCount ?? 0) > 0) return;
  await client.query(
    `INSERT INTO welcome_email_previews (
      id, organization_id, company_id, run_id, person_id, subject, body
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      randomUUID(),
      input.organizationId,
      input.companyId,
      input.runId,
      input.personId,
      `Welcome to RANGER IT — ${input.displayName}`,
      `Local preview only. Not sent.\n\nHello ${input.displayName},\nYour account ${input.loginName} is being prepared. This preview is stored on the workflow run and is never sent during retries or demo reset.`,
    ],
  );
}

export async function countWaitingWorkflowSteps(
  client: DbClient,
  organizationId: string,
  companyIds: string[],
): Promise<number> {
  if (companyIds.length === 0) return 0;
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workflow_steps s
     JOIN workflow_runs r ON r.id = s.run_id
     WHERE r.organization_id = $1 AND r.company_id = ANY($2::uuid[])
       AND s.status IN ('failed', 'awaiting_manual')
       AND r.status NOT IN ('canceled', 'succeeded')`,
    [organizationId, companyIds],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countPeopleOffboarding(
  client: DbClient,
  organizationId: string,
  companyIds: string[],
): Promise<number> {
  if (companyIds.length === 0) return 0;
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM people
     WHERE organization_id = $1
       AND company_id = ANY($2::uuid[])
       AND archived_at IS NULL
       AND (
         it_status = 'departed'
         OR workflow_badge IN ('offboarding_in_progress', 'offboarding_scheduled')
       )`,
    [organizationId, companyIds],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countUpcomingLifecycleReviews(
  client: DbClient,
  organizationId: string,
  companyIds: string[],
  asOf: string,
  withinDays = 14,
): Promise<number> {
  if (companyIds.length === 0) return 0;
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM people
     WHERE organization_id = $1
       AND company_id = ANY($2::uuid[])
       AND archived_at IS NULL
       AND (
         (start_date IS NOT NULL AND start_date BETWEEN $3::date AND ($3::date + ($4::int * INTERVAL '1 day')))
         OR (end_date IS NOT NULL AND end_date BETWEEN $3::date AND ($3::date + ($4::int * INTERVAL '1 day')))
       )`,
    [organizationId, companyIds, asOf, withinDays],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export type LifecycleBoardPerson = {
  id: string;
  company_id: string;
  company_name: string;
  display_name: string;
  it_status: string;
  workflow_badge: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type LifecycleBoardRun = {
  id: string;
  company_id: string;
  company_name: string;
  person_id: string;
  person_name: string;
  kind: string;
  status: string;
  created_at: Date;
};

export type LifecycleBoardAssignment = {
  id: string;
  company_id: string;
  company_name: string;
  person_id: string;
  person_name: string;
  product_name: string | null;
  start_effective_date: string | null;
  end_effective_date: string | null;
  status: string;
};

function asDateString(value: Date | string | null): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export async function listLifecycleBoard(
  client: DbClient,
  organizationId: string,
  companyIds: string[],
  asOf: string,
  withinDays = 14,
): Promise<{
  startsSoon: LifecycleBoardPerson[];
  leavesSoon: LifecycleBoardPerson[];
  offboarding: LifecycleBoardPerson[];
  waitingRuns: LifecycleBoardRun[];
  activeAssignments: LifecycleBoardAssignment[];
}> {
  if (companyIds.length === 0) {
    return {
      startsSoon: [],
      leavesSoon: [],
      offboarding: [],
      waitingRuns: [],
      activeAssignments: [],
    };
  }

  const people = await client.query<{
    id: string;
    company_id: string;
    company_name: string;
    display_name: string;
    it_status: string;
    workflow_badge: string | null;
    start_date: Date | string | null;
    end_date: Date | string | null;
  }>(
    `SELECT p.id, p.company_id, c.name AS company_name, p.display_name, p.it_status,
            p.workflow_badge, p.start_date, p.end_date
     FROM people p
     JOIN companies c ON c.organization_id = p.organization_id AND c.id = p.company_id
     WHERE p.organization_id = $1
       AND p.company_id = ANY($2::uuid[])
       AND p.archived_at IS NULL
     ORDER BY p.display_name`,
    [organizationId, companyIds],
  );

  const mapped = people.rows.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    company_name: row.company_name,
    display_name: row.display_name,
    it_status: row.it_status,
    workflow_badge: row.workflow_badge,
    start_date: asDateString(row.start_date),
    end_date: asDateString(row.end_date),
  }));

  const startsSoon = mapped.filter((p) => {
    if (!p.start_date) return false;
    const delta = daysBetweenDates(asOf, p.start_date);
    return delta != null && delta >= 0 && delta <= withinDays;
  });
  const leavesSoon = mapped.filter((p) => {
    if (!p.end_date) return false;
    const delta = daysBetweenDates(asOf, p.end_date);
    return delta != null && delta >= 0 && delta <= withinDays;
  });
  const offboarding = mapped.filter(
    (p) =>
      p.it_status === "departed" ||
      p.workflow_badge === "offboarding_in_progress" ||
      p.workflow_badge === "offboarding_scheduled",
  );

  const runs = await client.query<{
    id: string;
    company_id: string;
    company_name: string;
    person_id: string;
    person_name: string;
    kind: string;
    status: string;
    created_at: Date;
  }>(
    `SELECT r.id, r.company_id, c.name AS company_name, r.person_id, p.display_name AS person_name,
            r.kind, r.status, r.created_at
     FROM workflow_runs r
     JOIN companies c ON c.organization_id = r.organization_id AND c.id = r.company_id
     JOIN people p ON p.organization_id = r.organization_id AND p.company_id = r.company_id AND p.id = r.person_id
     WHERE r.organization_id = $1
       AND r.company_id = ANY($2::uuid[])
       AND r.status IN ('approved', 'running', 'waiting_manual', 'partial', 'failed', 'preview')
     ORDER BY r.created_at DESC
     LIMIT 25`,
    [organizationId, companyIds],
  );

  const assignments = await client.query<{
    id: string;
    company_id: string;
    company_name: string;
    person_id: string;
    person_name: string;
    product_name: string | null;
    start_effective_date: Date | string | null;
    end_effective_date: Date | string | null;
    status: string;
  }>(
    `SELECT la.id, la.company_id, c.name AS company_name, la.person_id, p.display_name AS person_name,
            pr.name AS product_name, la.start_effective_date, la.end_effective_date, la.status
     FROM license_assignments la
     JOIN companies c ON c.organization_id = la.organization_id AND c.id = la.company_id
     JOIN people p ON p.organization_id = la.organization_id AND p.company_id = la.company_id AND p.id = la.person_id
     LEFT JOIN products pr ON pr.organization_id = la.organization_id AND pr.id = la.product_id
     WHERE la.organization_id = $1
       AND la.company_id = ANY($2::uuid[])
       AND la.status IN ('active', 'removal_pending')
       AND la.person_id IS NOT NULL
     ORDER BY la.start_effective_date NULLS LAST
     LIMIT 40`,
    [organizationId, companyIds],
  );

  return {
    startsSoon,
    leavesSoon,
    offboarding,
    waitingRuns: runs.rows,
    activeAssignments: assignments.rows.map((row) => ({
      id: row.id,
      company_id: row.company_id,
      company_name: row.company_name,
      person_id: row.person_id,
      person_name: row.person_name,
      product_name: row.product_name,
      start_effective_date: asDateString(row.start_effective_date),
      end_effective_date: asDateString(row.end_effective_date),
      status: row.status,
    })),
  };
}

function daysBetweenDates(from: string, to: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(from);
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(to);
  if (!a || !b) return null;
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((end - start) / 86_400_000);
}
