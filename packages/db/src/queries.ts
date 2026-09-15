import type { StaffRole } from "@ranger/domain";
import type { DbClient } from "./pool.ts";

export type OrganizationRow = {
  id: string;
  name: string;
  deployment_environment: "demo" | "private" | "live";
  is_seed_source: boolean;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type CompanyRow = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  domains: string[];
  it_contact_name: string | null;
  it_contact_email: string | null;
  it_notes: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export type MembershipRow = {
  organization_id: string;
  staff_user_id: string;
  role: StaffRole;
  active: boolean;
  automation_execute: boolean;
};

export async function getOrganization(client: DbClient, id: string): Promise<OrganizationRow | null> {
  const result = await client.query<OrganizationRow>("SELECT * FROM organizations WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function listCompaniesForOrganization(
  client: DbClient,
  organizationId: string,
): Promise<CompanyRow[]> {
  const result = await client.query<CompanyRow>(
    "SELECT * FROM companies WHERE organization_id = $1 ORDER BY name ASC",
    [organizationId],
  );
  return result.rows;
}

export async function getCompany(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<CompanyRow | null> {
  const result = await client.query<CompanyRow>(
    "SELECT * FROM companies WHERE organization_id = $1 AND id = $2",
    [organizationId, companyId],
  );
  return result.rows[0] ?? null;
}

export async function updateCompanyNotes(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    itNotes: string | null;
    version: number;
  },
): Promise<CompanyRow | null> {
  const result = await client.query<CompanyRow>(
    `UPDATE companies
     SET it_notes = $1, updated_at = NOW(), version = version + 1
     WHERE organization_id = $2 AND id = $3 AND version = $4
     RETURNING *`,
    [input.itNotes, input.organizationId, input.companyId, input.version],
  );
  return result.rows[0] ?? null;
}

export async function getMembership(
  client: DbClient,
  staffUserId: string,
): Promise<MembershipRow | null> {
  const result = await client.query<MembershipRow>(
    `SELECT organization_id, staff_user_id, role, active, automation_execute
     FROM organization_memberships
     WHERE staff_user_id = $1 AND active = TRUE
     LIMIT 1`,
    [staffUserId],
  );
  return result.rows[0] ?? null;
}

export async function listCompanyGrantIds(
  client: DbClient,
  organizationId: string,
  staffUserId: string,
): Promise<string[]> {
  const result = await client.query<{ company_id: string }>(
    `SELECT company_id
     FROM company_grants
     WHERE organization_id = $1 AND staff_user_id = $2`,
    [organizationId, staffUserId],
  );
  return result.rows.map((row) => row.company_id);
}

export async function insertAuditEvent(
  client: DbClient,
  event: {
    organizationId: string;
    companyId?: string | null;
    actorStaffUserId?: string | null;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
    beforeSummary?: string | null;
    afterSummary?: string | null;
    correlationId?: string | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
      organization_id, company_id, actor_staff_user_id, action, target_type, target_id,
      summary, before_summary, after_summary, correlation_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      event.organizationId,
      event.companyId ?? null,
      event.actorStaffUserId ?? null,
      event.action,
      event.targetType,
      event.targetId,
      event.summary,
      event.beforeSummary ?? null,
      event.afterSummary ?? null,
      event.correlationId ?? null,
    ],
  );
}

export async function getFileObject(
  client: DbClient,
  organizationId: string,
  fileId: string,
): Promise<{
  id: string;
  organization_id: string;
  company_id: string;
  original_filename: string;
} | null> {
  const result = await client.query(
    `SELECT id, organization_id, company_id, original_filename
     FROM file_objects
     WHERE organization_id = $1 AND id = $2`,
    [organizationId, fileId],
  );
  return result.rows[0] ?? null;
}

export async function countDemoCreatesSince(
  client: DbClient,
  since: Date,
): Promise<number> {
  const result = await client.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM demo_workspaces WHERE created_at >= $1",
    [since],
  );
  return Number(result.rows[0]?.count ?? 0);
}
