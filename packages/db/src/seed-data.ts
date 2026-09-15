import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { SEED_COMPANIES, SEED_ORGANIZATION_ID, SEED_STAFF } from "@ranger/test-fixtures";
import type { Pool } from "pg";
import { withTransaction, type DbClient } from "./pool.ts";
import { seedInventory } from "./seed-inventory.ts";
import { seedIncidents } from "./seed-incidents.ts";
import { seedLifecycle } from "./seed-lifecycle.ts";
import { seedVisitorDemoStory } from "./seed-demo-clone.ts";

export async function ensureStaffUser(
  client: DbClient,
  input: { email: string; name: string; password: string },
): Promise<string> {
  const existing = await client.query<{ id: string }>(`SELECT id FROM "user" WHERE email = $1`, [
    input.email,
  ]);
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const userId = randomUUID();
  const now = new Date();
  await client.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,TRUE,$4,$4)`,
    [userId, input.name, input.email, now],
  );
  const password = await hashPassword(input.password);
  await client.query(
    `INSERT INTO account (
      id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
    ) VALUES ($1,$2,'credential',$3,$4,$5,$5)`,
    [randomUUID(), userId, userId, password, now],
  );
  return userId;
}

export async function seedPrivateDevelopment(pool: Pool, staffPassword: string): Promise<void> {
  await withTransaction(pool, async (client) => {
    await client.query(
      `INSERT INTO organizations (id, name, deployment_environment, is_seed_source)
       VALUES ($1, 'Northstar IT — Demo', 'demo', TRUE)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_seed_source = TRUE`,
      [SEED_ORGANIZATION_ID],
    );

    for (const company of SEED_COMPANIES) {
      await client.query(
        `INSERT INTO companies (
          id, organization_id, name, slug, domains, it_contact_name, it_contact_email, it_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          domains = EXCLUDED.domains,
          it_contact_name = EXCLUDED.it_contact_name,
          it_contact_email = EXCLUDED.it_contact_email`,
        [
          company.id,
          SEED_ORGANIZATION_ID,
          company.name,
          company.slug,
          company.domains,
          company.itContactName,
          company.itContactEmail,
          company.itNotes,
        ],
      );
    }

    const adminId = await ensureStaffUser(client, {
      email: SEED_STAFF.admin.email,
      name: SEED_STAFF.admin.name,
      password: staffPassword,
    });
    const technicianId = await ensureStaffUser(client, {
      email: SEED_STAFF.technician.email,
      name: SEED_STAFF.technician.name,
      password: staffPassword,
    });
    const viewerId = await ensureStaffUser(client, {
      email: SEED_STAFF.viewer.email,
      name: SEED_STAFF.viewer.name,
      password: staffPassword,
    });

    await client.query(
      `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
       VALUES ($1,$2,'admin',TRUE,TRUE)
       ON CONFLICT (organization_id, staff_user_id) DO UPDATE SET role = 'admin', active = TRUE, automation_execute = TRUE`,
      [SEED_ORGANIZATION_ID, adminId],
    );
    await client.query(
      `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
       VALUES ($1,$2,'technician',TRUE,FALSE)
       ON CONFLICT (organization_id, staff_user_id) DO UPDATE SET role = 'technician', active = TRUE`,
      [SEED_ORGANIZATION_ID, technicianId],
    );
    await client.query(
      `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
       VALUES ($1,$2,'viewer',TRUE,FALSE)
       ON CONFLICT (organization_id, staff_user_id) DO UPDATE SET role = 'viewer', active = TRUE`,
      [SEED_ORGANIZATION_ID, viewerId],
    );

    await client.query(`DELETE FROM company_grants WHERE staff_user_id = ANY($1::text[])`, [
      [technicianId, viewerId],
    ]);
    await client.query(
      `INSERT INTO company_grants (organization_id, company_id, staff_user_id)
       VALUES ($1,$2,$3), ($1,$4,$3), ($1,$2,$5)`,
      [
        SEED_ORGANIZATION_ID,
        SEED_COMPANIES[0].id,
        technicianId,
        SEED_COMPANIES[1].id,
        viewerId,
      ],
    );

    await client.query(
      `INSERT INTO audit_events (organization_id, actor_staff_user_id, action, target_type, target_id, summary)
       VALUES ($1,$2,'seed.applied','organization',$3,'Applied deterministic Northstar development seed')`,
      [SEED_ORGANIZATION_ID, adminId, SEED_ORGANIZATION_ID],
    );

    await seedInventory(client);
    await seedLifecycle(client);
    await seedIncidents(client, adminId);
  });
}

export async function cloneDemoWorkspace(
  client: DbClient,
  input: { staffPassword: string; expiresAt: Date },
): Promise<{ organizationId: string; staffUserId: string; email: string }> {
  const organizationId = randomUUID();
  const visitorId = randomUUID().slice(0, 8);
  const email = `demo-${visitorId}@visitor.example`;
  const staffUserId = await ensureStaffUser(client, {
    email,
    name: "Demo Technician",
    password: input.staffPassword,
  });

  await client.query(
    `INSERT INTO organizations (id, name, deployment_environment, is_seed_source)
     VALUES ($1, 'Northstar IT — Demo', 'demo', FALSE)`,
    [organizationId],
  );

  const companyIdsBySlug: Record<string, string> = {};
  for (const company of SEED_COMPANIES) {
    const companyId = randomUUID();
    companyIdsBySlug[company.slug] = companyId;
    await client.query(
      `INSERT INTO companies (
        id, organization_id, name, slug, domains, it_contact_name, it_contact_email, it_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        companyId,
        organizationId,
        company.name,
        company.slug,
        company.domains,
        company.itContactName,
        company.itContactEmail,
        company.itNotes,
      ],
    );
    if (company.slug !== "summit-systems") {
      await client.query(
        `INSERT INTO company_grants (organization_id, company_id, staff_user_id)
         VALUES ($1,$2,$3)`,
        [organizationId, companyId, staffUserId],
      );
    }
  }

  await client.query(
    `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
     VALUES ($1,$2,'technician',TRUE,FALSE)`,
    [organizationId, staffUserId],
  );

  const harborCompanyId = companyIdsBySlug["harbor-architecture"];
  if (harborCompanyId) {
    await seedVisitorDemoStory(client, {
      organizationId,
      harborCompanyId,
      actorStaffUserId: staffUserId,
    });
  }

  await client.query(
    `INSERT INTO demo_workspaces (organization_id, source_organization_id, staff_user_id, expires_at)
     VALUES ($1,$2,$3,$4)`,
    [organizationId, SEED_ORGANIZATION_ID, staffUserId, input.expiresAt],
  );

  await client.query(
    `INSERT INTO audit_events (organization_id, actor_staff_user_id, action, target_type, target_id, summary)
     VALUES ($1,$2,'demo.workspace.created','organization',$3,'Created isolated synthetic demo workspace')`,
    [organizationId, staffUserId, organizationId],
  );

  return { organizationId, staffUserId, email };
}
