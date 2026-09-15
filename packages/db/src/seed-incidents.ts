import { SEED_COMPANY_IDS, SEED_ORGANIZATION_ID, SEED_PERSON_IDS, SEED_PRODUCT_IDS } from "@ranger/test-fixtures";
import type { DbClient } from "./pool.ts";
import { createIncident, createInvestigationEntry, refreshRelatedSuggestions } from "./incidents.ts";

const PRIOR_LICENSE_INCIDENT = "88888888-8888-4888-8888-888888888881";

/** Seed Harbor incidents for related-suggestion and demo-log scenarios. */
export async function seedIncidents(client: DbClient, actorStaffUserId: string): Promise<void> {
  await client.query(`DELETE FROM incident_exports WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM problem_incidents WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM problems WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM related_incident_suggestions WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM investigation_entries WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM incident_evidence WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM incident_affected_resources WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);
  await client.query(`DELETE FROM incidents WHERE organization_id = $1`, [SEED_ORGANIZATION_ID]);

  await client.query(
    `INSERT INTO incidents (
      id, organization_id, company_id, title, reported_symptom, impact_description,
      severity, status, tags, provider_error, resolution_summary, resolution_kind, resolved_at,
      owner_staff_user_id
    ) VALUES (
      $1,$2,$3,
      'Earlier SketchUp license assign failure',
      'Onboarding could not assign SketchUp after account create',
      'Contractor blocked from design tools for one day',
      'high', 'resolved', ARRAY['onboarding','license'],
      'LicenseAssignmentFailed',
      'SKU pool exhausted; purchased seat then retried assignLicense successfully',
      'confirmed_cause', NOW() - INTERVAL '14 days', $4
    )`,
    [PRIOR_LICENSE_INCIDENT, SEED_ORGANIZATION_ID, SEED_COMPANY_IDS.harbor, actorStaffUserId],
  );
  await client.query(
    `INSERT INTO incident_affected_resources (
      id, organization_id, company_id, incident_id, resource_type, resource_id, label
    ) VALUES
      (gen_random_uuid(), $1, $2, $3, 'person', $4, 'Alex Rivera'),
      (gen_random_uuid(), $1, $2, $3, 'product', $5, 'SketchUp Pro')`,
    [
      SEED_ORGANIZATION_ID,
      SEED_COMPANY_IDS.harbor,
      PRIOR_LICENSE_INCIDENT,
      SEED_PERSON_IDS.alexRiveraHarbor,
      SEED_PRODUCT_IDS.sketchupPro,
    ],
  );
  await createInvestigationEntry(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    incidentId: PRIOR_LICENSE_INCIDENT,
    entryKind: "result",
    body: "Confirmed cause: purchasedQuantity exhausted. Retry after capacity increase succeeded.",
    authorStaffUserId: actorStaffUserId,
    occurredAt: "2026-09-16T18:00:00.000Z",
    timePrecision: "exact",
  });

  const authIncident = await createIncident(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    title: "Demo auth error burst after CA policy change",
    reportedSymptom: "Multiple AuthFailed events after conditional access change",
    impactDescription: "Harbor users briefly unable to sign in to demo auth service",
    severity: "medium",
    ownerStaffUserId: actorStaffUserId,
    tags: ["auth", "demo-service"],
    providerError: "AuthFailed",
    affected: [
      {
        resourceType: "person",
        resourceId: SEED_PERSON_IDS.alexRiveraHarbor,
        label: "Alex Rivera",
      },
      {
        resourceType: "product",
        resourceId: SEED_PRODUCT_IDS.m365,
        label: "Microsoft 365",
      },
    ],
  });

  await createInvestigationEntry(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    incidentId: authIncident.id,
    entryKind: "observation",
    body: "Imported samples/demo-auth-events.jsonl. Config change at 15:00:30Z precedes AuthFailed burst. No automatic causation claimed.",
    authorStaffUserId: actorStaffUserId,
    occurredAt: "2026-09-30T15:00:30.000Z",
    timePrecision: "exact",
  });
  await createInvestigationEntry(client, {
    organizationId: SEED_ORGANIZATION_ID,
    companyId: SEED_COMPANY_IDS.harbor,
    incidentId: authIncident.id,
    entryKind: "hypothesis",
    body: "Conditional access misconfiguration may have blocked token exchange.",
    authorStaffUserId: actorStaffUserId,
  });

  await refreshRelatedSuggestions(client, SEED_ORGANIZATION_ID, SEED_COMPANY_IDS.harbor, PRIOR_LICENSE_INCIDENT);
  await refreshRelatedSuggestions(client, SEED_ORGANIZATION_ID, SEED_COMPANY_IDS.harbor, authIncident.id);
}
