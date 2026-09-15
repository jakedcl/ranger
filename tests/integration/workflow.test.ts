import {
  SEED_COMPANY_IDS,
  SEED_ORGANIZATION_ID,
  SEED_PERSON_IDS,
  SEED_STAFF,
  SEED_TEMPLATE_IDS,
  SEED_TEMPLATE_VERSION_IDS,
} from "@ranger/test-fixtures";
import {
  addTemplateVersion,
  applyMigrations,
  createPool,
  demoLifecycleFor,
  resetDemoLifecycle,
  seedPrivateDevelopment,
} from "@ranger/db";
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

const harbor = SEED_COMPANY_IDS.harbor;
const casey = SEED_PERSON_IDS.plannedStarterHarbor;

beforeAll(async () => {
  resetDemoLifecycle();
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

describe("M3 lifecycle workflows", () => {
  it("runs a synthetic onboarding: one account, membership, assignment, then manual mailbox", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const preview = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/people/${casey}/workflows`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        kind: "onboarding",
        templateId: SEED_TEMPLATE_IDS.projectCoordinator,
        templateVersionId: SEED_TEMPLATE_VERSION_IDS.projectCoordinatorV1,
        usageLocation: "US",
        idempotencyKey: "test-onboard-casey",
      },
    });
    expect(preview.statusCode).toBe(200);
    const previewBody = preview.json() as { run: { id: string }; plan: { issues: unknown[] } };
    expect(previewBody.plan.issues).toEqual([]);
    const runId = previewBody.run.id;

    const approve = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/approve`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(approve.statusCode).toBe(200);

    const execute = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/execute`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(execute.statusCode).toBe(200);
    const executed = execute.json() as {
      run: { status: string };
      steps: Array<{ kind: string; status: string; id: string }>;
    };
    expect(executed.run.status).toBe("waiting_manual");
    expect(executed.steps.find((s) => s.kind === "create_account")?.status).toBe("succeeded");
    expect(executed.steps.find((s) => s.kind === "add_group_membership")?.status).toBe("succeeded");
    expect(executed.steps.find((s) => s.kind === "assign_license")?.status).toBe("succeeded");
    const mailbox = executed.steps.find((s) => s.kind === "manual_mailbox");
    expect(mailbox?.status).toBe("awaiting_manual");

    const accounts = await pool.query(
      `SELECT id FROM accounts WHERE person_id = $1 AND login_name = 'casey.nguyen@harbor.example'`,
      [casey],
    );
    expect(accounts.rows).toHaveLength(1);

    const retry = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/execute`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(retry.statusCode).toBe(200);
    const accountsAgain = await pool.query(
      `SELECT id FROM accounts WHERE person_id = $1 AND login_name = 'casey.nguyen@harbor.example'`,
      [casey],
    );
    expect(accountsAgain.rows).toHaveLength(1);

    const fulfill = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/steps/${mailbox!.id}/fulfill`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        evidence: "Checked Exchange admin center; mailbox provisioned for casey.nguyen@harbor.example",
      },
    });
    expect(fulfill.statusCode).toBe(200);
    expect((fulfill.json() as { run: { status: string } }).run.status).toBe("succeeded");
  });

  it("keeps a created account when a later license step fails, and retry does not duplicate it", async () => {
    resetDemoLifecycle();
    demoLifecycleFor(SEED_ORGANIZATION_ID).setFailOn("assignLicense");

    const cookie = await signIn(SEED_STAFF.admin.email);
    const personId = SEED_PERSON_IDS.sameNameHarbor;
    const preview = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/people/${personId}/workflows`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        kind: "onboarding",
        templateId: SEED_TEMPLATE_IDS.projectCoordinator,
        templateVersionId: SEED_TEMPLATE_VERSION_IDS.projectCoordinatorV1,
        usageLocation: "US",
        idempotencyKey: "test-license-fail",
      },
    });
    expect(preview.statusCode).toBe(200);
    const runId = (preview.json() as { run: { id: string } }).run.id;
    await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/approve`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    const execute = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/execute`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    const body = execute.json() as { run: { status: string }; steps: Array<{ kind: string; status: string }> };
    expect(body.steps.find((s) => s.kind === "create_account")?.status).toBe("succeeded");
    expect(body.steps.find((s) => s.kind === "assign_license")?.status).toBe("failed");
    expect(body.run.status).toBe("partial");

    const before = await pool.query(`SELECT count(*)::int AS n FROM accounts WHERE person_id = $1`, [personId]);
    demoLifecycleFor(SEED_ORGANIZATION_ID).setFailOn(null);
    const retried = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/retry`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(retried.statusCode).toBe(200);
    const after = await pool.query(`SELECT count(*)::int AS n FROM accounts WHERE person_id = $1`, [personId]);
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
    expect(
      (retried.json() as { steps: Array<{ kind: string; status: string }> }).steps.find((s) => s.kind === "assign_license")
        ?.status,
    ).toBe("succeeded");
  });

  it("does not let a technician without automation_execute run provider writes", async () => {
    const cookie = await signIn(SEED_STAFF.technician.email);
    const preview = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/people/${SEED_PERSON_IDS.alexRiveraHarbor}/workflows`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { kind: "offboarding", idempotencyKey: "test-tech-offboard" },
    });
    expect(preview.statusCode).toBe(200);
    const runId = (preview.json() as { run: { id: string } }).run.id;
    const approve = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/approve`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(approve.statusCode).toBe(200);
    const person = await pool.query(`SELECT it_status, workflow_badge FROM people WHERE id = $1`, [
      SEED_PERSON_IDS.alexRiveraHarbor,
    ]);
    expect(person.rows[0]?.it_status).toBe("departed");
    expect(person.rows[0]?.workflow_badge).toBe("offboarding_in_progress");
    const execute = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/workflows/${runId}/execute`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(execute.statusCode).toBe(403);
  });

  it("keeps an approved run on the frozen template version after a later edit", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const preview = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/people/${SEED_PERSON_IDS.archivedCleanHarbor}/workflows`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        kind: "onboarding",
        templateId: SEED_TEMPLATE_IDS.projectCoordinator,
        templateVersionId: SEED_TEMPLATE_VERSION_IDS.projectCoordinatorV1,
        usageLocation: "US",
        idempotencyKey: "test-frozen-template",
      },
    });
    const runId = (preview.json() as { run: { id: string; templateVersionId?: string }; run2?: unknown }).run.id;
    const before = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${harbor}/workflows/${runId}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const frozen = (before.json() as { run: { frozenPlan: { templateVersionId: string; steps: unknown[] } } }).run
      .frozenPlan;
    await addTemplateVersion(pool, {
      organizationId: SEED_ORGANIZATION_ID,
      templateId: SEED_TEMPLATE_IDS.projectCoordinator,
      intents: [{ key: "only-account", kind: "create_account", usageLocation: "US" }],
    });
    const after = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${harbor}/workflows/${runId}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const still = (after.json() as { run: { frozenPlan: { templateVersionId: string; steps: unknown[] } } }).run
      .frozenPlan;
    expect(still.templateVersionId).toBe(frozen.templateVersionId);
    expect(still.steps.length).toBe(frozen.steps.length);
  });
});
