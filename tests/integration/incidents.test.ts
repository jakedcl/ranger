import {
  SEED_COMPANY_IDS,
  SEED_PERSON_IDS,
  SEED_PRODUCT_IDS,
  SEED_STAFF,
} from "@ranger/test-fixtures";
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

const harbor = SEED_COMPANY_IDS.harbor;
const cedar = SEED_COMPANY_IDS.cedar;

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

describe("M4 incidents", () => {
  it("creates incident from license failure context, uploads evidence, suggests prior related incident", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const create = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/incidents`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        title: "Casey onboarding license failure",
        reportedSymptom: "assignLicense failed during onboarding execute",
        severity: "high",
        tags: ["onboarding", "license"],
        providerError: "LicenseAssignmentFailed",
        workflowStepKey: "sketchup",
        correlationId: "test-corr-license",
        affected: [
          {
            resourceType: "person",
            resourceId: SEED_PERSON_IDS.plannedStarterHarbor,
            label: "Casey Nguyen",
          },
          {
            resourceType: "product",
            resourceId: SEED_PRODUCT_IDS.sketchupPro,
            label: "SketchUp Pro",
          },
        ],
      },
    });
    expect(create.statusCode).toBe(200);
    const incidentId = (create.json() as { incident: { id: string } }).incident.id;

    const form = new FormData();
    form.append(
      "file",
      new File(
        ["2026-09-30T14:22:01Z LicenseAssignmentFailed sku=SketchUp\n"],
        "license-fail.log",
        { type: "text/plain" },
      ),
    );
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/incidents/${incidentId}/evidence/upload`,
      headers: { cookie, origin: env.WEB_ORIGIN },
      payload: form,
    });
    expect(upload.statusCode).toBe(200);
    const evidenceId = (upload.json() as { evidence: { id: string; parseWarnings: unknown } }).evidence
      .id;

    const note = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/incidents/${incidentId}/entries`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        entryKind: "note",
        body: "Comparing with earlier SketchUp license incident; will retry after capacity check.",
      },
    });
    expect(note.statusCode).toBe(200);

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${harbor}/incidents/${incidentId}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(detail.statusCode).toBe(200);
    const body = detail.json() as {
      related: Array<{ title: string; score: number; reasons: unknown }>;
      evidence: unknown[];
    };
    expect(body.evidence.length).toBeGreaterThan(0);
    expect(body.related.some((r) => r.title.includes("SketchUp") && r.score >= 4)).toBe(true);

    const exported = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/incidents/${incidentId}/exports`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { evidenceIds: [evidenceId] },
    });
    expect(exported.statusCode).toBe(200);
    const exportId = (exported.json() as { export: { id: string } }).export.id;

    const download = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${harbor}/incident-exports/${exportId}/download`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers["content-type"]).toContain("zip");
  });

  it("blocks cross-company incident reads and viewer exports", async () => {
    const adminCookie = await signIn(SEED_STAFF.admin.email);
    const listHarbor = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${harbor}/incidents`,
      headers: { cookie: adminCookie, origin: env.WEB_ORIGIN },
    });
    const harborIncident = (listHarbor.json() as { incidents: Array<{ id: string }> }).incidents[0]!;

    const techCookie = await signIn(SEED_STAFF.technician.email);
    // technician has Harbor+Cedar but Cedar must not see Harbor incident via Cedar path
    const cross = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${cedar}/incidents/${harborIncident.id}`,
      headers: { cookie: techCookie, origin: env.WEB_ORIGIN },
    });
    expect(cross.statusCode).toBe(404);

    const viewerCookie = await signIn(SEED_STAFF.viewer.email);
    const exportAttempt = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/incidents/${harborIncident.id}/exports`,
      headers: { cookie: viewerCookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { evidenceIds: [] },
    });
    expect(exportAttempt.statusCode).toBe(403);
  });

  it("rejects html evidence uploads", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const list = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${harbor}/incidents`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const incidentId = (list.json() as { incidents: Array<{ id: string }> }).incidents[0]!.id;
    const form = new FormData();
    form.append("file", new File(["<script>alert(1)</script>"], "x.html", { type: "text/html" }));
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${harbor}/incidents/${incidentId}/evidence/upload`,
      headers: { cookie, origin: env.WEB_ORIGIN },
      payload: form,
    });
    expect(upload.statusCode).toBe(422);
  });
});
