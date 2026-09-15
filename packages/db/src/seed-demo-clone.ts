import { randomUUID } from "node:crypto";
import type { DbClient } from "./pool.ts";
import { createIncident, createInvestigationEntry } from "./incidents.ts";

/**
 * Compact Harbor story for visitor /demo clones — enough for the guided tour
 * without copying the entire Northstar seed (fixed UUIDs stay on the seed org).
 */
export async function seedVisitorDemoStory(
  client: DbClient,
  input: {
    organizationId: string;
    harborCompanyId: string;
    actorStaffUserId: string;
  },
): Promise<{ alexId: string; caseyId: string; licenseIncidentId: string }> {
  const alexId = randomUUID();
  const caseyId = randomUUID();
  const productId = randomUUID();
  const subscriptionId = randomUUID();
  const priceId = randomUUID();
  const assignmentId = randomUUID();

  await client.query(
    `INSERT INTO products (
      id, organization_id, name, vendor, category, assignment_model, version
    ) VALUES ($1,$2,'SketchUp Pro','Trimble','design','named_user',1)`,
    [productId, input.organizationId],
  );

  await client.query(
    `INSERT INTO people (
      id, organization_id, company_id, display_name, work_email, role_title, department,
      it_status, start_date, end_date, version
    ) VALUES
      ($1,$3,$4,'Alex Rivera','alex.rivera@harbor.example','Contractor','Studio','active','2026-09-03','2026-09-17',1),
      ($2,$3,$4,'Casey Nguyen','casey.nguyen@harbor.example','Designer','Studio','planned','2026-10-06',NULL,1)`,
    [alexId, caseyId, input.organizationId, input.harborCompanyId],
  );

  await client.query(
    `INSERT INTO subscriptions (
      id, organization_id, company_id, product_id, supplier, external_reference,
      purchased_quantity, currency, payer, billing_cadence,
      commitment_start, commitment_end, renewal_date, state
    ) VALUES (
      $1,$2,$3,$4,'MSP reseller','DEMO-SKP-5',5,'USD','msp','annual',
      '2026-01-01','2026-12-31','2027-01-01','active'
    )`,
    [subscriptionId, input.organizationId, input.harborCompanyId, productId],
  );

  await client.query(
    `INSERT INTO subscription_price_versions (
      id, organization_id, company_id, subscription_id, effective_from, effective_to,
      unit_price, price_kind, cadence, source
    ) VALUES ($1,$2,$3,$4,'2026-01-01',NULL,299.00,'unit','annual','demo-clone')`,
    [priceId, input.organizationId, input.harborCompanyId, subscriptionId],
  );

  await client.query(
    `INSERT INTO license_assignments (
      id, organization_id, company_id, person_id, account_id, product_id, subscription_id,
      status, start_effective_date, end_effective_date, date_provenance, source
    ) VALUES (
      $1,$2,$3,$4,NULL,$5,$6,'ended','2026-09-03','2026-09-17','seed','demo-clone'
    )`,
    [assignmentId, input.organizationId, input.harborCompanyId, alexId, productId, subscriptionId],
  );

  const incident = await createIncident(client, {
    organizationId: input.organizationId,
    companyId: input.harborCompanyId,
    title: "Earlier SketchUp license assign failure",
    reportedSymptom: "Onboarding could not assign SketchUp after account create",
    impactDescription: "Contractor blocked from design tools for one day",
    severity: "high",
    ownerStaffUserId: input.actorStaffUserId,
    tags: ["onboarding", "license"],
    providerError: "LicenseAssignmentFailed",
    affected: [
      { resourceType: "person", resourceId: alexId, label: "Alex Rivera" },
      { resourceType: "product", resourceId: productId, label: "SketchUp Pro" },
    ],
  });

  await client.query(
    `UPDATE incidents SET
      status = 'resolved',
      resolution_summary = $2,
      resolution_kind = 'confirmed_cause',
      resolved_at = NOW() - INTERVAL '14 days',
      version = version + 1
     WHERE id = $1`,
    [incident.id, "SKU pool exhausted; purchased seat then retried assignLicense successfully"],
  );

  await createInvestigationEntry(client, {
    organizationId: input.organizationId,
    companyId: input.harborCompanyId,
    incidentId: incident.id,
    entryKind: "result",
    body: "Confirmed cause: purchasedQuantity exhausted. Retry after capacity increase succeeded.",
    authorStaffUserId: input.actorStaffUserId,
    occurredAt: "2026-09-16T18:00:00.000Z",
    timePrecision: "exact",
  });

  return { alexId, caseyId, licenseIncidentId: incident.id };
}
