import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { applyMigrations } from "./migrations.ts";
import { createPool } from "./pool.ts";
import { seedPrivateDevelopment } from "./seed-data.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
config({ path: path.join(repoRoot, ".env") });

const url = process.env.DATABASE_URL;
const password = process.env.SEED_STAFF_PASSWORD;
if (!url) {
  throw new Error("DATABASE_URL is required");
}
if (!password) {
  throw new Error("SEED_STAFF_PASSWORD is required");
}

const pool = createPool(url);
try {
  await pool.query(`
    DROP SCHEMA IF EXISTS pgboss CASCADE;
    DROP TABLE IF EXISTS
      welcome_email_previews,
      in_app_notifications,
      workflow_step_attempts,
      workflow_steps,
      workflow_runs,
      company_template_bindings,
      role_template_versions,
      role_templates,
      incident_exports,
      problem_incidents,
      problems,
      related_incident_suggestions,
      investigation_entries,
      incident_evidence,
      incident_affected_resources,
      incidents,
      person_link_proposals,
      sync_collection_state,
      sync_runs,
      provider_connections,
      offboarding_obligations,
      import_rows,
      import_batches,
      timeline_events,
      work_items,
      device_assignments,
      devices,
      mailbox_access,
      shared_mailboxes,
      group_memberships,
      groups,
      license_assignments,
      license_pools,
      subscription_price_versions,
      subscriptions,
      products,
      accounts,
      people,
      file_objects,
      demo_workspaces,
      audit_events,
      company_grants,
      organization_memberships,
      companies,
      organizations,
      schema_migrations
    CASCADE;
    DROP TABLE IF EXISTS "verification", "account", "session", "user" CASCADE;
  `);
  await applyMigrations(pool);
  await seedPrivateDevelopment(pool, password);
  console.log("Database reset, migrated, and seeded.");
} finally {
  await pool.end();
}
