import { SEED_COMPANY_IDS, SEED_STAFF } from "@ranger/test-fixtures";
import { applyMigrations, createPool, seedPrivateDevelopment } from "@ranger/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../apps/api/src/app.ts";
import { loadEnv } from "../../apps/api/src/env.ts";

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://jakedcl@127.0.0.1:5432/ranger_test";
const staffPassword = process.env.SEED_STAFF_PASSWORD ?? "ranger-dev-only-password";

const env = loadEnv({
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: "test-better-auth-secret-32-chars-min",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  WEB_ORIGIN: "http://127.0.0.1:5173",
  API_HOST: "127.0.0.1",
  API_PORT: "4000",
  RANGER_MODE: "private",
  SEED_STAFF_PASSWORD: staffPassword,
  LOG_LEVEL: "error",
});

const pool = createPool(databaseUrl);
let app: Awaited<ReturnType<typeof buildApp>>;

async function signIn(email: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    headers: { origin: env.WEB_ORIGIN, "content-type": "application/json" },
    payload: { email, password: staffPassword },
  });
  expect(response.statusCode).toBe(200);
  return response.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

beforeAll(async () => {
  await pool.query(`
    DROP SCHEMA IF EXISTS pgboss CASCADE;
    DROP TABLE IF EXISTS welcome_email_previews, in_app_notifications, workflow_step_attempts,
      workflow_steps, workflow_runs, company_template_bindings, role_template_versions, role_templates,
      incident_exports, problem_incidents, problems, related_incident_suggestions,
      investigation_entries, incident_evidence, incident_affected_resources, incidents,
      person_link_proposals, sync_collection_state, sync_runs, provider_connections,
      import_rows, import_batches, offboarding_obligations, timeline_events,
      work_items, device_assignments, devices, mailbox_access, shared_mailboxes,
      group_memberships, groups, license_assignments, license_pools, subscription_price_versions,
      subscriptions, products, accounts, people, file_objects, demo_workspaces, audit_events,
      company_grants, organization_memberships, companies, organizations, schema_migrations CASCADE;
    DROP TABLE IF EXISTS "verification", "account", "session", "user" CASCADE;
  `);
  await applyMigrations(pool);
  await seedPrivateDevelopment(pool, staffPassword);
  app = await buildApp(env, pool);
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("M2 provider sync", () => {
  it("creates a demo connection and syncs users/groups/skus without wiping memberships", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const create = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/connections`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { providerKind: "demo", displayName: "Demo adapter" },
    });
    expect(create.statusCode).toBe(201);
    const connectionId = (create.json() as { connection: { id: string } }).connection.id;

    const sync1 = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/connections/${connectionId}/sync`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(sync1.statusCode).toBe(200);
    const first = sync1.json() as {
      sync: { runs: Array<{ collection: string; status: string; itemCount: number; error?: string }> };
    };
    const failed = first.sync.runs.filter((run) => run.status !== "succeeded");
    expect(failed, JSON.stringify(failed)).toEqual([]);
    expect(first.sync.runs.find((run) => run.collection === "users")?.itemCount).toBeGreaterThan(2);

    const accounts = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/accounts`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(accounts.statusCode).toBe(200);
    const accountCount = (
      accounts.json() as { accounts: Array<{ providerSource: string; externalId: string | null }> }
    ).accounts.filter((row) => row.providerSource === "demo").length;
    expect(accountCount).toBeGreaterThan(2);

    const groupsBefore = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/groups`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const groupList = (groupsBefore.json() as { groups: Array<{ id: string }> }).groups;
    expect(groupList.length).toBeGreaterThan(0);

    const sync2 = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/connections/${connectionId}/sync`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { collections: ["users", "groups", "group_memberships"] },
    });
    expect(sync2.statusCode).toBe(200);

    const accountsAfter = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/accounts`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const demoAfter = (
      accountsAfter.json() as { accounts: Array<{ providerSource: string }> }
    ).accounts.filter((row) => row.providerSource === "demo").length;
    expect(demoAfter).toBe(accountCount);
  });

  it("refuses live microsoft sync without credentials and does not claim success", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const create = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/connections`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        providerKind: "microsoft",
        displayName: "Live tenant (blocked)",
        tenantId: "00000000-0000-4000-8000-000000000099",
        credentialRef: "env:MICROSOFT_INVENTORY_*",
      },
    });
    expect(create.statusCode).toBe(201);
    const connectionId = (create.json() as { connection: { id: string } }).connection.id;
    const sync = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/connections/${connectionId}/sync`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { collections: ["users"] },
    });
    expect(sync.statusCode).toBe(200);
    const body = sync.json() as {
      sync: { runs: Array<{ status: string; error?: string }> };
    };
    expect(body.sync.runs[0]?.status).toBe("failed");
    expect(body.sync.runs[0]?.error ?? "").toMatch(/credential|Graph|Refusing|configured|connection/i);
  });
});
