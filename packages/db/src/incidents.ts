import { randomUUID } from "node:crypto";
import {
  EVIDENCE_PARSER_VERSION,
  NotFoundError,
  RELATED_SCORING_VERSION,
  UnprocessableError,
  isRelatedSuggestion,
  parseEvidenceText,
  scoreRelatedIncidents,
  validateEvidenceUpload,
  type RelatedScoreInput,
} from "@ranger/domain";
import type { DbClient } from "./pool.ts";

export type IncidentStatus = "open" | "investigating" | "waiting" | "resolved" | "closed";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentRow = {
  id: string;
  organization_id: string;
  company_id: string;
  title: string;
  reported_symptom: string;
  impact_description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner_staff_user_id: string | null;
  onset_at: Date | null;
  external_ticket_ref: string | null;
  tags: string[];
  resolution_summary: string | null;
  resolution_kind: "confirmed_cause" | "unresolved_hypothesis" | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  workflow_run_id: string | null;
  workflow_step_key: string | null;
  correlation_id: string | null;
  provider_error: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
};

export type IncidentEvidenceRow = {
  id: string;
  organization_id: string;
  company_id: string;
  incident_id: string;
  file_object_id: string | null;
  kind: string;
  source_label: string;
  original_filename: string | null;
  content_type: string | null;
  byte_size: number | null;
  sha256: string | null;
  storage_key: string | null;
  collection_time: Date | null;
  timestamp_precision: string | null;
  parser_version: string | null;
  parse_warnings: unknown;
  parsed_summary: unknown;
  redacted_from_evidence_id: string | null;
  is_redacted: boolean;
  ranger_event_ref: unknown;
  uploaded_by_staff_user_id: string | null;
  created_at: Date;
};

export type InvestigationEntryRow = {
  id: string;
  organization_id: string;
  company_id: string;
  incident_id: string;
  entry_kind: string;
  body: string;
  occurred_at: Date | null;
  time_precision: string;
  author_staff_user_id: string | null;
  linked_evidence_ids: string[];
  created_at: Date;
  updated_at: Date;
};

export async function listIncidents(
  client: DbClient,
  organizationId: string,
  companyId: string,
  filters?: { status?: string; personId?: string },
): Promise<IncidentRow[]> {
  const params: unknown[] = [organizationId, companyId];
  let sql = `SELECT * FROM incidents WHERE organization_id = $1 AND company_id = $2`;
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.personId) {
    params.push(filters.personId);
    sql += ` AND EXISTS (
      SELECT 1 FROM incident_affected_resources r
      WHERE r.incident_id = incidents.id AND r.resource_type = 'person' AND r.resource_id = $${params.length}
    )`;
  }
  sql += ` ORDER BY updated_at DESC`;
  const result = await client.query<IncidentRow>(sql, params);
  return result.rows;
}

export async function getIncident(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incidentId: string,
): Promise<IncidentRow | null> {
  const result = await client.query<IncidentRow>(
    `SELECT * FROM incidents WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, incidentId],
  );
  return result.rows[0] ?? null;
}

export async function listAffectedResources(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incidentId: string,
) {
  const result = await client.query<{
    id: string;
    resource_type: string;
    resource_id: string;
    label: string | null;
  }>(
    `SELECT id, resource_type, resource_id, label
     FROM incident_affected_resources
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
     ORDER BY created_at`,
    [organizationId, companyId, incidentId],
  );
  return result.rows;
}

export async function createIncident(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    title: string;
    reportedSymptom: string;
    impactDescription?: string | null;
    severity: IncidentSeverity;
    ownerStaffUserId?: string | null;
    onsetAt?: string | null;
    externalTicketRef?: string | null;
    tags?: string[];
    workflowRunId?: string | null;
    workflowStepKey?: string | null;
    correlationId?: string | null;
    providerError?: string | null;
    affected?: Array<{ resourceType: string; resourceId: string; label?: string | null }>;
  },
): Promise<IncidentRow> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO incidents (
      id, organization_id, company_id, title, reported_symptom, impact_description,
      severity, status, owner_staff_user_id, onset_at, external_ticket_ref, tags,
      workflow_run_id, workflow_step_key, correlation_id, provider_error
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.title,
      input.reportedSymptom,
      input.impactDescription ?? null,
      input.severity,
      input.ownerStaffUserId ?? null,
      input.onsetAt ? new Date(input.onsetAt) : null,
      input.externalTicketRef ?? null,
      input.tags ?? [],
      input.workflowRunId ?? null,
      input.workflowStepKey ?? null,
      input.correlationId ?? null,
      input.providerError ?? null,
    ],
  );
  for (const resource of input.affected ?? []) {
    await client.query(
      `INSERT INTO incident_affected_resources (
        id, organization_id, company_id, incident_id, resource_type, resource_id, label
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        input.organizationId,
        input.companyId,
        id,
        resource.resourceType,
        resource.resourceId,
        resource.label ?? null,
      ],
    );
  }
  const incident = await getIncident(client, input.organizationId, input.companyId, id);
  await refreshRelatedSuggestions(client, input.organizationId, input.companyId, id);
  return incident!;
}

export async function updateIncident(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    incidentId: string;
    version: number;
    title?: string;
    reportedSymptom?: string;
    impactDescription?: string | null;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    ownerStaffUserId?: string | null;
    tags?: string[];
    resolutionSummary?: string | null;
    resolutionKind?: "confirmed_cause" | "unresolved_hypothesis" | null;
  },
): Promise<IncidentRow> {
  const current = await getIncident(client, input.organizationId, input.companyId, input.incidentId);
  if (!current) throw new NotFoundError("Incident not found");
  if (current.version !== input.version) {
    throw new UnprocessableError("Incident was modified by another user; refresh and retry");
  }
  if (
    (input.status === "resolved" || input.status === "closed") &&
    !(input.resolutionSummary ?? current.resolution_summary)
  ) {
    throw new UnprocessableError("Resolution summary is required to resolve or close");
  }
  const result = await client.query<IncidentRow>(
    `UPDATE incidents SET
      title = COALESCE($4, title),
      reported_symptom = COALESCE($5, reported_symptom),
      impact_description = CASE WHEN $6::boolean THEN $7 ELSE impact_description END,
      severity = COALESCE($8, severity),
      status = COALESCE($9, status),
      owner_staff_user_id = CASE WHEN $10::boolean THEN $11 ELSE owner_staff_user_id END,
      tags = COALESCE($12, tags),
      resolution_summary = CASE WHEN $13::boolean THEN $14 ELSE resolution_summary END,
      resolution_kind = CASE WHEN $15::boolean THEN $16 ELSE resolution_kind END,
      resolved_at = CASE
        WHEN $9 = 'resolved' AND resolved_at IS NULL THEN NOW()
        WHEN $9 IN ('open', 'investigating', 'waiting') THEN NULL
        ELSE resolved_at
      END,
      closed_at = CASE WHEN $9 = 'closed' THEN NOW() ELSE closed_at END,
      version = version + 1,
      updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3 AND version = $17
     RETURNING *`,
    [
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.title ?? null,
      input.reportedSymptom ?? null,
      input.impactDescription !== undefined,
      input.impactDescription ?? null,
      input.severity ?? null,
      input.status ?? null,
      input.ownerStaffUserId !== undefined,
      input.ownerStaffUserId ?? null,
      input.tags ?? null,
      input.resolutionSummary !== undefined,
      input.resolutionSummary ?? null,
      input.resolutionKind !== undefined,
      input.resolutionKind ?? null,
      input.version,
    ],
  );
  if (!result.rows[0]) throw new UnprocessableError("Incident was modified by another user; refresh and retry");
  return result.rows[0];
}

export async function addAffectedResource(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    incidentId: string;
    resourceType: string;
    resourceId: string;
    label?: string | null;
  },
) {
  await client.query(
    `INSERT INTO incident_affected_resources (
      id, organization_id, company_id, incident_id, resource_type, resource_id, label
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT DO NOTHING`,
    [
      randomUUID(),
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.resourceType,
      input.resourceId,
      input.label ?? null,
    ],
  );
  await refreshRelatedSuggestions(client, input.organizationId, input.companyId, input.incidentId);
}

export async function listEvidence(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incidentId: string,
): Promise<IncidentEvidenceRow[]> {
  const result = await client.query<IncidentEvidenceRow>(
    `SELECT * FROM incident_evidence
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
     ORDER BY created_at`,
    [organizationId, companyId, incidentId],
  );
  return result.rows;
}

export async function getEvidence(
  client: DbClient,
  organizationId: string,
  companyId: string,
  evidenceId: string,
): Promise<IncidentEvidenceRow | null> {
  const result = await client.query<IncidentEvidenceRow>(
    `SELECT * FROM incident_evidence
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, evidenceId],
  );
  return result.rows[0] ?? null;
}

export async function evidenceTotals(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incidentId: string,
): Promise<{ count: number; bytes: number }> {
  const result = await client.query<{ count: string; bytes: string }>(
    `SELECT COUNT(*)::text AS count, COALESCE(SUM(byte_size), 0)::text AS bytes
     FROM incident_evidence
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
       AND kind IN ('upload', 'demo_service', 'redacted_derivative')`,
    [organizationId, companyId, incidentId],
  );
  return {
    count: Number(result.rows[0]?.count ?? 0),
    bytes: Number(result.rows[0]?.bytes ?? 0),
  };
}

export async function insertEvidenceRecord(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    incidentId: string;
    fileObjectId?: string | null;
    kind: string;
    sourceLabel: string;
    originalFilename?: string | null;
    contentType?: string | null;
    byteSize?: number | null;
    sha256?: string | null;
    storageKey?: string | null;
    collectionTime?: Date | null;
    timestampPrecision?: string | null;
    parserVersion?: string | null;
    parseWarnings?: unknown;
    parsedSummary?: unknown;
    redactedFromEvidenceId?: string | null;
    isRedacted?: boolean;
    rangerEventRef?: unknown;
    uploadedByStaffUserId?: string | null;
  },
): Promise<IncidentEvidenceRow> {
  const id = randomUUID();
  const result = await client.query<IncidentEvidenceRow>(
    `INSERT INTO incident_evidence (
      id, organization_id, company_id, incident_id, file_object_id, kind, source_label,
      original_filename, content_type, byte_size, sha256, storage_key, collection_time,
      timestamp_precision, parser_version, parse_warnings, parsed_summary,
      redacted_from_evidence_id, is_redacted, ranger_event_ref, uploaded_by_staff_user_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20::jsonb,$21
    ) RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.fileObjectId ?? null,
      input.kind,
      input.sourceLabel,
      input.originalFilename ?? null,
      input.contentType ?? null,
      input.byteSize ?? null,
      input.sha256 ?? null,
      input.storageKey ?? null,
      input.collectionTime ?? null,
      input.timestampPrecision ?? null,
      input.parserVersion ?? null,
      JSON.stringify(input.parseWarnings ?? []),
      JSON.stringify(input.parsedSummary ?? null),
      input.redactedFromEvidenceId ?? null,
      input.isRedacted ?? false,
      JSON.stringify(input.rangerEventRef ?? null),
      input.uploadedByStaffUserId ?? null,
    ],
  );
  return result.rows[0]!;
}

export function assertUploadAllowed(input: {
  filename: string;
  contentType: string;
  byteSize: number;
  existingFileCount: number;
  existingTotalBytes: number;
}): void {
  const result = validateEvidenceUpload(input);
  if (result.ok === false) throw new UnprocessableError(result.reason);
}

export function buildParsedSummary(filename: string, text: string) {
  const parsed = parseEvidenceText(filename, text);
  return {
    parserVersion: EVIDENCE_PARSER_VERSION,
    rowCount: parsed.rows.length,
    extractedErrorCodes: parsed.extractedErrorCodes,
    warnings: parsed.warnings,
    sampleRows: parsed.rows.slice(0, 50),
  };
}

export async function insertFileObject(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    storageKey: string;
    originalFilename: string;
    contentType: string;
    byteSize: number;
    sha256: string;
    createdByStaffUserId: string;
  },
): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO file_objects (
      id, organization_id, company_id, storage_key, original_filename, content_type,
      byte_size, sha256, created_by_staff_user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.storageKey,
      input.originalFilename,
      input.contentType,
      input.byteSize,
      input.sha256,
      input.createdByStaffUserId,
    ],
  );
  return id;
}

export async function listInvestigationEntries(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incidentId: string,
): Promise<InvestigationEntryRow[]> {
  const result = await client.query<InvestigationEntryRow>(
    `SELECT * FROM investigation_entries
     WHERE organization_id = $1 AND company_id = $2 AND incident_id = $3
     ORDER BY COALESCE(occurred_at, created_at), created_at`,
    [organizationId, companyId, incidentId],
  );
  return result.rows;
}

export async function createInvestigationEntry(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    incidentId: string;
    entryKind: string;
    body: string;
    occurredAt?: string | null;
    timePrecision?: string;
    authorStaffUserId: string;
    linkedEvidenceIds?: string[];
  },
): Promise<InvestigationEntryRow> {
  const id = randomUUID();
  const result = await client.query<InvestigationEntryRow>(
    `INSERT INTO investigation_entries (
      id, organization_id, company_id, incident_id, entry_kind, body,
      occurred_at, time_precision, author_staff_user_id, linked_evidence_ids
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.entryKind,
      input.body,
      input.occurredAt ? new Date(input.occurredAt) : null,
      input.timePrecision ?? (input.occurredAt ? "exact" : "unknown"),
      input.authorStaffUserId,
      input.linkedEvidenceIds ?? [],
    ],
  );
  return result.rows[0]!;
}

export async function linkRangerEventEvidence(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    incidentId: string;
    eventId: string;
    eventKind: string;
    summary: string;
    occurredAt?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    uploadedByStaffUserId: string;
  },
): Promise<IncidentEvidenceRow> {
  return insertEvidenceRecord(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    incidentId: input.incidentId,
    kind: "ranger_event",
    sourceLabel: "RANGER timeline",
    timestampPrecision: input.occurredAt ? "exact" : "unknown",
    collectionTime: input.occurredAt ? new Date(input.occurredAt) : null,
    rangerEventRef: {
      eventId: input.eventId,
      eventKind: input.eventKind,
      summary: input.summary,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
    parsedSummary: { note: "Source reference only — original timeline event not copied as editable text" },
    uploadedByStaffUserId: input.uploadedByStaffUserId,
  });
}

async function scoreInputForIncident(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incident: IncidentRow,
): Promise<RelatedScoreInput> {
  const resources = await listAffectedResources(client, organizationId, companyId, incident.id);
  const evidence = await listEvidence(client, organizationId, companyId, incident.id);
  const errorCodes: string[] = [];
  if (incident.provider_error) {
    const match = incident.provider_error.match(/\b([A-Za-z][A-Za-z0-9_]{2,})\b/);
    if (match) errorCodes.push(match[1]!);
  }
  for (const item of evidence) {
    const summary = item.parsed_summary as { extractedErrorCodes?: string[] } | null;
    for (const code of summary?.extractedErrorCodes ?? []) errorCodes.push(code);
  }
  return {
    errorCode: errorCodes[0] ?? null,
    applicationIds: resources
      .filter((r) => r.resource_type === "product" || r.resource_type === "subscription")
      .map((r) => r.resource_id),
    deviceIds: resources.filter((r) => r.resource_type === "device").map((r) => r.resource_id),
    tags: incident.tags,
  };
}

export async function refreshRelatedSuggestions(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incidentId: string,
): Promise<void> {
  const incident = await getIncident(client, organizationId, companyId, incidentId);
  if (!incident) return;
  const others = (await listIncidents(client, organizationId, companyId)).filter((i) => i.id !== incidentId);
  const left = await scoreInputForIncident(client, organizationId, companyId, incident);
  for (const other of others) {
    const right = await scoreInputForIncident(client, organizationId, companyId, other);
    const { score, reasons } = scoreRelatedIncidents(left, right);
    if (!isRelatedSuggestion(score)) continue;
    await client.query(
      `INSERT INTO related_incident_suggestions (
        id, organization_id, company_id, incident_id, suggested_incident_id,
        scoring_version, score, reasons, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'suggested')
      ON CONFLICT (organization_id, company_id, incident_id, suggested_incident_id, scoring_version)
      DO UPDATE SET
        score = EXCLUDED.score,
        reasons = EXCLUDED.reasons,
        updated_at = NOW(),
        status = CASE
          WHEN related_incident_suggestions.status = 'dismissed' THEN 'dismissed'
          WHEN related_incident_suggestions.status = 'linked' THEN 'linked'
          ELSE 'suggested'
        END`,
      [
        randomUUID(),
        organizationId,
        companyId,
        incidentId,
        other.id,
        RELATED_SCORING_VERSION,
        score,
        JSON.stringify(reasons),
      ],
    );
  }
}

export async function listRelatedSuggestions(
  client: DbClient,
  organizationId: string,
  companyId: string,
  incidentId: string,
) {
  const result = await client.query<{
    id: string;
    suggested_incident_id: string;
    scoring_version: number;
    score: number;
    reasons: unknown;
    status: string;
    title: string;
    provider_error: string | null;
  }>(
    `SELECT s.id, s.suggested_incident_id, s.scoring_version, s.score, s.reasons, s.status,
            i.title, i.provider_error
     FROM related_incident_suggestions s
     JOIN incidents i ON i.id = s.suggested_incident_id
     WHERE s.organization_id = $1 AND s.company_id = $2 AND s.incident_id = $3
       AND s.status = 'suggested'
     ORDER BY s.score DESC`,
    [organizationId, companyId, incidentId],
  );
  return result.rows;
}

export async function dismissRelatedSuggestion(
  client: DbClient,
  organizationId: string,
  companyId: string,
  suggestionId: string,
): Promise<void> {
  await client.query(
    `UPDATE related_incident_suggestions
     SET status = 'dismissed', updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, suggestionId],
  );
}

export async function linkRelatedSuggestion(
  client: DbClient,
  organizationId: string,
  companyId: string,
  suggestionId: string,
): Promise<void> {
  await client.query(
    `UPDATE related_incident_suggestions
     SET status = 'linked', updated_at = NOW()
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, suggestionId],
  );
}

export async function createProblem(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    title: string;
    workingCause?: string | null;
    ownerStaffUserId?: string | null;
    permanentFixWorkItemId?: string | null;
    incidentIds: string[];
  },
) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO problems (
      id, organization_id, company_id, title, working_cause, owner_staff_user_id, permanent_fix_work_item_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.title,
      input.workingCause ?? null,
      input.ownerStaffUserId ?? null,
      input.permanentFixWorkItemId ?? null,
    ],
  );
  for (const incidentId of input.incidentIds) {
    await client.query(
      `INSERT INTO problem_incidents (organization_id, company_id, problem_id, incident_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [input.organizationId, input.companyId, id, incidentId],
    );
  }
  const result = await client.query(
    `SELECT * FROM problems WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [input.organizationId, input.companyId, id],
  );
  return result.rows[0];
}

export async function listProblems(
  client: DbClient,
  organizationId: string,
  companyId: string,
) {
  const result = await client.query(
    `SELECT p.*, COALESCE(array_agg(pi.incident_id) FILTER (WHERE pi.incident_id IS NOT NULL), '{}') AS incident_ids
     FROM problems p
     LEFT JOIN problem_incidents pi
       ON pi.problem_id = p.id AND pi.organization_id = p.organization_id AND pi.company_id = p.company_id
     WHERE p.organization_id = $1 AND p.company_id = $2
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [organizationId, companyId],
  );
  return result.rows;
}

export async function insertIncidentExport(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    incidentId: string;
    createdByStaffUserId: string;
    selectedEvidenceIds: string[];
    selectedEntryIds: string[];
    excludedFields: string[];
    reportMarkdown: string;
    manifest: unknown;
    storageKey: string;
    sha256: string;
    byteSize: number;
  },
) {
  const id = randomUUID();
  const result = await client.query(
    `INSERT INTO incident_exports (
      id, organization_id, company_id, incident_id, created_by_staff_user_id,
      selected_evidence_ids, selected_entry_ids, excluded_fields, report_markdown,
      manifest, storage_key, sha256, byte_size
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13)
    RETURNING *`,
    [
      id,
      input.organizationId,
      input.companyId,
      input.incidentId,
      input.createdByStaffUserId,
      input.selectedEvidenceIds,
      input.selectedEntryIds,
      input.excludedFields,
      input.reportMarkdown,
      JSON.stringify(input.manifest),
      input.storageKey,
      input.sha256,
      input.byteSize,
    ],
  );
  return result.rows[0];
}

export async function getIncidentExport(
  client: DbClient,
  organizationId: string,
  companyId: string,
  exportId: string,
) {
  const result = await client.query(
    `SELECT * FROM incident_exports
     WHERE organization_id = $1 AND company_id = $2 AND id = $3`,
    [organizationId, companyId, exportId],
  );
  return result.rows[0] ?? null;
}

export async function listIncidentsForResource(
  client: DbClient,
  organizationId: string,
  companyId: string,
  resourceType: string,
  resourceId: string,
): Promise<IncidentRow[]> {
  const result = await client.query<IncidentRow>(
    `SELECT i.* FROM incidents i
     JOIN incident_affected_resources r
       ON r.incident_id = i.id AND r.organization_id = i.organization_id AND r.company_id = i.company_id
     WHERE i.organization_id = $1 AND i.company_id = $2
       AND r.resource_type = $3 AND r.resource_id = $4
     ORDER BY i.updated_at DESC`,
    [organizationId, companyId, resourceType, resourceId],
  );
  return result.rows;
}

export async function countOpenIncidents(
  client: DbClient,
  organizationId: string,
  companyIds: string[],
): Promise<number> {
  if (companyIds.length === 0) return 0;
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM incidents
     WHERE organization_id = $1 AND company_id = ANY($2::uuid[])
       AND status IN ('open', 'investigating', 'waiting')`,
    [organizationId, companyIds],
  );
  return Number(result.rows[0]?.count ?? 0);
}
