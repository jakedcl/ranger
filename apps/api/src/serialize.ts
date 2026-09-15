import type { Company } from "@ranger/contracts";
import type { CompanyRow, OrganizationRow } from "@ranger/db";

export function toCompany(row: CompanyRow, environment: OrganizationRow["deployment_environment"]): Company {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    domains: row.domains,
    itContactName: row.it_contact_name,
    itContactEmail: row.it_contact_email,
    itNotes: row.it_notes,
    environment,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}
