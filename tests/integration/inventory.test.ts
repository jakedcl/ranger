import { SEED_COMPANY_IDS, SEED_PERSON_IDS, SEED_PRODUCT_IDS, SEED_STAFF, SEED_SUBSCRIPTION_IDS } from "@ranger/test-fixtures";
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
      import_rows, import_batches, offboarding_obligations, timeline_events,
      work_items, device_assignments, devices, mailbox_access, shared_mailboxes,
      group_memberships, groups, license_assignments, license_pools, subscription_price_versions,
      subscriptions, products, accounts, people, file_objects, demo_workspaces, audit_events,
      company_grants, organization_memberships, companies, organizations, schema_migrations,
      person_link_proposals, sync_collection_state, sync_runs, provider_connections CASCADE;
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

describe("M1 inventory invariants", () => {
  it("lists seeded Harbor people including Alex Rivera", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(response.statusCode).toBe(200);
    const people = (response.json() as { people: Array<{ id: string; displayName: string }> }).people;
    expect(people.length).toBeGreaterThan(5);
    expect(people.some((person) => person.id === SEED_PERSON_IDS.alexRiveraHarbor)).toBe(true);
  });

  it("denies cross-company license assignment", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/subscriptions/${SEED_SUBSCRIPTION_IDS.harborSketchup}/assignments`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { personId: SEED_PERSON_IDS.sameNameCedar },
    });
    expect([404, 422]).toContain(response.statusCode);
  });

  it("enforces named-seat capacity on Harbor SketchUp", async () => {
    const cookie = await signIn(SEED_STAFF.technician.email);
    const people = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const candidates = (
      people.json() as { people: Array<{ id: string; itStatus: string; archivedAt: string | null }> }
    ).people.filter(
      (person) =>
        person.itStatus === "active" &&
        !person.archivedAt &&
        person.id !== SEED_PERSON_IDS.alexRiveraHarbor,
    );

    let lastStatus = 200;
    for (const person of candidates.slice(0, 8)) {
      const assign = await app.inject({
        method: "POST",
        url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/subscriptions/${SEED_SUBSCRIPTION_IDS.harborSketchup}/assignments`,
        headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
        payload: { personId: person.id, startEffectiveDate: "2026-09-30" },
      });
      lastStatus = assign.statusCode;
      if (assign.statusCode === 422 || assign.statusCode === 409) break;
    }
    expect([422, 409]).toContain(lastStatus);
  });

  it("rejects concurrent assignments beyond a fresh subscription capacity", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const productCreate = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        name: "Concurrent Seat Product",
        vendor: "Contoso",
        category: "tools",
        assignmentModel: "named_user",
      },
    });
    expect(productCreate.statusCode).toBe(201);
    const productId = (productCreate.json() as { product: { id: string } }).product.id;
    const subCreate = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/subscriptions`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        productId,
        purchasedQuantity: 2,
        currency: "USD",
        payer: "company",
        billingCadence: "monthly",
      },
    });
    expect(subCreate.statusCode).toBe(201);
    const subscriptionId = (subCreate.json() as { subscription: { id: string } }).subscription.id;

    const people = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    const candidates = (
      people.json() as { people: Array<{ id: string; itStatus: string; archivedAt: string | null }> }
    ).people
      .filter((person) => person.itStatus === "active" && !person.archivedAt)
      .slice(0, 5);

    const results = await Promise.all(
      candidates.map((person) =>
        app.inject({
          method: "POST",
          url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/subscriptions/${subscriptionId}/assignments`,
          headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
          payload: { personId: person.id, startEffectiveDate: "2026-09-30" },
        }),
      ),
    );
    expect(results.filter((row) => row.statusCode === 201).length).toBeLessThanOrEqual(2);
    expect(results.some((row) => row.statusCode === 409 || row.statusCode === 422)).toBe(true);
  });
  it("blocks archive when active assignment or mailbox access remains", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const readiness = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people/${SEED_PERSON_IDS.departedMailboxHarbor}/archive-readiness`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(readiness.statusCode).toBe(200);
    const body = readiness.json() as { ready: boolean; blockers: Array<{ code: string }> };
    expect(body.ready).toBe(false);
    expect(body.blockers.length).toBeGreaterThan(0);

    const archive = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people/${SEED_PERSON_IDS.departedMailboxHarbor}/archive`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(archive.statusCode).toBe(422);
  });

  it("preserves person id and relationships when email changes", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const before = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people/${SEED_PERSON_IDS.alexRiveraHarbor}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(before.statusCode).toBe(200);
    const person = (before.json() as { person: { id: string; version: number; workEmail: string } }).person;
    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people/${SEED_PERSON_IDS.alexRiveraHarbor}`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { workEmail: "alex.rivera.renamed@harbor.example", version: person.version },
    });
    expect(patch.statusCode).toBe(200);
    const updated = (patch.json() as { person: { id: string; workEmail: string } }).person;
    expect(updated.id).toBe(SEED_PERSON_IDS.alexRiveraHarbor);
    expect(updated.workEmail).toBe("alex.rivera.renamed@harbor.example");
  });

  it("treats duplicate people import as upsert no-op", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const csv = `display_name,work_email,it_status
Alex Rivera,alex.rivera.renamed@harbor.example,active
`;
    const preview = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/imports/preview`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { resourceKind: "people", filename: "people.csv", csvText: csv },
    });
    expect(preview.statusCode).toBe(200);
    const batchId = (preview.json() as { batch: { id: string } }).batch.id;
    const apply = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/imports/${batchId}/apply`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {},
    });
    expect(apply.statusCode).toBe(200);
    const result = apply.json() as { noop: number; applied: number };
    expect(result.noop + result.applied).toBeGreaterThanOrEqual(1);
  });

  it("exposes SketchUp product in the org catalog", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/products",
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(response.statusCode).toBe(200);
    const products = (response.json() as { products: Array<{ id: string; name: string }> }).products;
    expect(products.some((product) => product.id === SEED_PRODUCT_IDS.sketchupPro)).toBe(true);
  });

  it("returns person profile with shared assignment relationships", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const person = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/people/${SEED_PERSON_IDS.alexRiveraHarbor}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(person.statusCode).toBe(200);
    const body = person.json() as {
      assignments: Array<{ productId: string; status: string; subscriptionId: string | null }>;
      devices: unknown[];
      timeline: unknown[];
    };
    expect(body.assignments.some((row) => row.productId === SEED_PRODUCT_IDS.sketchupPro)).toBe(
      true,
    );
    expect(body.devices.length).toBeGreaterThan(0);
    expect(body.timeline.length).toBeGreaterThan(0);

    const sub = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/subscriptions/${SEED_SUBSCRIPTION_IDS.harborSketchup}`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(sub.statusCode).toBe(200);
    const subBody = sub.json() as {
      subscription: { assignments?: Array<{ personId: string | null }> };
    };
    expect(
      (subBody.subscription.assignments ?? []).some(
        (row) => row.personId === SEED_PERSON_IDS.alexRiveraHarbor,
      ),
    ).toBe(true);
  });

  it("retires a catalog product and blocks new subscriptions", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        name: "Temp Retire Product",
        vendor: "Contoso",
        category: "tools",
        assignmentModel: "named_user",
      },
    });
    expect(create.statusCode).toBe(201);
    const product = (create.json() as { product: { id: string; version: number } }).product;
    const retire = await app.inject({
      method: "POST",
      url: `/api/v1/products/${product.id}/retire`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: { version: product.version },
    });
    expect(retire.statusCode).toBe(200);
    const sub = await app.inject({
      method: "POST",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/subscriptions`,
      headers: { cookie, origin: env.WEB_ORIGIN, "content-type": "application/json" },
      payload: {
        productId: product.id,
        purchasedQuantity: 1,
        currency: "USD",
        payer: "company",
        billingCadence: "monthly",
      },
    });
    expect([422, 409]).toContain(sub.statusCode);
  });

  it("keeps USD and EUR company costs separate with Unknown prices", async () => {
    const cookie = await signIn(SEED_STAFF.admin.email);
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${SEED_COMPANY_IDS.harbor}/costs`,
      headers: { cookie, origin: env.WEB_ORIGIN },
    });
    expect(response.statusCode).toBe(200);
    const costs = (
      response.json() as {
        costs: { byCurrency: Array<{ currency: string; total: string }>; unknownCount: number };
      }
    ).costs;
    const currencies = costs.byCurrency.map((row) => row.currency).sort();
    expect(currencies).toContain("USD");
    expect(currencies).toContain("EUR");
    expect(costs.unknownCount).toBeGreaterThan(0);
  });
});
