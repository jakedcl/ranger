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
    headers: {
      origin: env.WEB_ORIGIN,
      "content-type": "application/json",
    },
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
      file_objects, demo_workspaces, audit_events, company_grants,
      organization_memberships, companies, organizations, schema_migrations CASCADE;
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

describe("M0 authorization", () => {
  it("lets the admin see all three seed companies", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/companies",
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { companies: Array<{ slug: string }> };
    expect(body.companies.map((c) => c.slug).sort()).toEqual([
      "cedar-studio",
      "harbor-architecture",
      "summit-systems",
    ]);
  });

  it("limits the technician to Harbor and Cedar", async () => {
    const cookie = await signIn(SEED_STAFF.technician.email);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/companies",
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const body = list.json() as { companies: Array<{ slug: string }> };
    expect(body.companies.map((c) => c.slug).sort()).toEqual(["cedar-studio", "harbor-architecture"]);

    const denied = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.summit}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(denied.statusCode).toBe(404);
  });

  it("blocks viewer mutations and guessed foreign company IDs", async () => {
    const cookie = await signIn(SEED_STAFF.viewer.email);
    const harbor = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(harbor.statusCode).toBe(200);
    const version = (harbor.json() as { company: { version: number } }).company.version;
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { itNotes: "viewer should not write", version },
    });
    expect(patch.statusCode).toBe(403);

    const foreign = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.summit}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(foreign.statusCode).toBe(404);
  });

  it("rejects mutating requests without a valid origin", async () => {
    const cookie = await signIn(SEED_STAFF.technician.email);
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}`,
      headers: { cookie, "content-type": "application/json" },
      payload: { itNotes: "no origin", version: 1 },
    });
    expect(response.statusCode).toBe(403);
  });

  it("disables public signup and keeps downloads authorized", async () => {
    const signup = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      headers: { origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { email: "new@northstar.example", password: staffPassword, name: "New" },
    });
    expect(signup.statusCode).toBeGreaterThanOrEqual(400);

    const cookie = await signIn(SEED_STAFF.admin.email);
    const download = await app.inject({
      method: "GET",
      url: "/api/v1/files/33333333-3333-4333-8333-333333333333",
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(download.statusCode).toBe(404);
  });

  it("creates an isolated demo workspace without Summit access", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/demo/sessions",
      headers: { origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    const cookie = response.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    const companies = await app.inject({
      method: "GET",
      url: "/api/v1/companies",
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const slugs = (companies.json() as { companies: Array<{ slug: string }> }).companies.map((c) => c.slug).sort();
    expect(slugs).toEqual(["cedar-studio", "harbor-architecture"]);
    const summit = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.summit}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(summit.statusCode).toBe(404);
  });

  it("preserves companies after a new pool connection", async () => {
    const second = createPool(databaseUrl);
    const result = await second.query("SELECT COUNT(*)::int AS count FROM companies WHERE organization_id IN (SELECT id FROM organizations WHERE is_seed_source)");
    expect(result.rows[0]?.count).toBe(3);
    await second.end();
  });
});
