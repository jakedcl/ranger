import { randomUUID } from "node:crypto";
import multipart from "@fastify/multipart";import {
  addAffectedResource,
  assertUploadAllowed,
  buildParsedSummary,
  createIncident,
  createInvestigationEntry,
  createProblem,
  dismissRelatedSuggestion,
  evidenceTotals,
  getEvidence,
  getIncident,
  getIncidentExport,
  insertEvidenceRecord,
  insertFileObject,
  insertIncidentExport,
  linkRangerEventEvidence,
  linkRelatedSuggestion,
  listAffectedResources,
  listEvidence,
  listIncidents,
  listIncidentsForResource,
  listInvestigationEntries,
  listProblems,
  listRelatedSuggestions,
  listTimelineForEntity,
  refreshRelatedSuggestions,
  updateIncident,
  withTransaction,
} from "@ranger/db";
import { DomainError, canMutate } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import JSZip from "jszip";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { evidenceRoot, readEvidenceBytes, redactTextAssistance, storeEvidenceBytes } from "../evidence-storage.ts";
import { sendError } from "../http.ts";

async function handleDomain(
  reply: import("fastify").FastifyReply,
  correlationId: string,
  error: unknown,
) {
  if (error instanceof DomainError) {
    return sendError(reply, error.statusCode, error.code, error.message, correlationId);
  }
  throw error;
}

function toIncident(row: NonNullable<Awaited<ReturnType<typeof getIncident>>>) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    title: row.title,
    reportedSymptom: row.reported_symptom,
    impactDescription: row.impact_description,
    severity: row.severity,
    status: row.status,
    ownerStaffUserId: row.owner_staff_user_id,
    onsetAt: row.onset_at?.toISOString() ?? null,
    externalTicketRef: row.external_ticket_ref,
    tags: row.tags,
    resolutionSummary: row.resolution_summary,
    resolutionKind: row.resolution_kind,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    closedAt: row.closed_at?.toISOString() ?? null,
    workflowRunId: row.workflow_run_id,
    workflowStepKey: row.workflow_step_key,
    correlationId: row.correlation_id,
    providerError: row.provider_error,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toEvidence(row: Awaited<ReturnType<typeof listEvidence>>[number]) {
  return {
    id: row.id,
    kind: row.kind,
    sourceLabel: row.source_label,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    collectionTime: row.collection_time?.toISOString() ?? null,
    timestampPrecision: row.timestamp_precision,
    parserVersion: row.parser_version,
    parseWarnings: row.parse_warnings,
    parsedSummary: row.parsed_summary,
    isRedacted: row.is_redacted,
    redactedFromEvidenceId: row.redacted_from_evidence_id,
    rangerEventRef: row.ranger_event_ref,
    createdAt: row.created_at.toISOString(),
  };
}

function toEntry(row: Awaited<ReturnType<typeof listInvestigationEntries>>[number]) {
  return {
    id: row.id,
    entryKind: row.entry_kind,
    body: row.body,
    occurredAt: row.occurred_at?.toISOString() ?? null,
    timePrecision: row.time_precision,
    authorStaffUserId: row.author_staff_user_id,
    linkedEvidenceIds: row.linked_evidence_ids,
    createdAt: row.created_at.toISOString(),
  };
}

function buildReportMarkdown(input: {
  incident: ReturnType<typeof toIncident>;
  resources: Array<{ resource_type: string; resource_id: string; label: string | null }>;
  entries: ReturnType<typeof toEntry>[];
  evidence: ReturnType<typeof toEvidence>[];
  excludedFields: string[];
}): string {
  const lines = [
    `# Escalation: ${input.incident.title}`,
    "",
    `- Company: ${input.incident.companyId}`,
    `- Status: ${input.incident.status}`,
    `- Severity: ${input.incident.severity}`,
    `- Generated for handoff (private package)`,
    "",
    "## Reported symptom",
    input.excludedFields.includes("reportedSymptom") ? "_[excluded]_" : input.incident.reportedSymptom,
    "",
    "## Impact",
    input.excludedFields.includes("impactDescription")
      ? "_[excluded]_"
      : (input.incident.impactDescription ?? "—"),
    "",
    "## Affected resources",
    ...input.resources.map((r) => `- ${r.resource_type} ${r.label ?? r.resource_id}`),
    "",
    "## Investigation timeline",
  ];
  for (const entry of input.entries) {
    lines.push(
      `### ${entry.entryKind} (${entry.timePrecision}${entry.occurredAt ? ` · ${entry.occurredAt}` : " · unknown time"})`,
    );
    lines.push(entry.body);
    lines.push("");
  }
  lines.push("## Selected evidence");
  for (const item of input.evidence) {
    lines.push(
      `- ${item.sourceLabel}${item.originalFilename ? ` · ${item.originalFilename}` : ""}${
        item.isRedacted ? " · redacted derivative" : ""
      } · sha256=${item.sha256 ?? "n/a"}`,
    );
  }
  lines.push("");
  lines.push("## Confirmed findings / hypotheses");
  const findings = input.entries.filter((e) => e.entryKind === "result" || e.entryKind === "hypothesis");
  if (findings.length === 0) lines.push("_None recorded._");
  for (const f of findings) lines.push(`- (${f.entryKind}) ${f.body}`);
  lines.push("");
  lines.push("## Known data limitations");
  lines.push("- Temporal correlation alone is not root cause.");
  lines.push("- Unknown log timezones remain labeled; do not assume local time.");
  if (input.incident.providerError) {
    lines.push(`- Provider error attached: ${input.incident.providerError}`);
  }
  lines.push("");
  return lines.join("\n");
}

export async function registerIncidentRoutes(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  app.get("/api/v1/companies/:companyId/incidents", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string };
      const query = request.query as { status?: string; personId?: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incidents = await listIncidents(request.server.db, actor.organizationId, company.id, {
        status: query.status,
        personId: query.personId,
      });
      return { incidents: incidents.map(toIncident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/incidents/:incidentId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; incidentId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incident = await getIncident(request.server.db, actor.organizationId, company.id, params.incidentId);
      if (!incident) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const [resources, evidence, entries, related, problems] = await Promise.all([
        listAffectedResources(request.server.db, actor.organizationId, company.id, incident.id),
        listEvidence(request.server.db, actor.organizationId, company.id, incident.id),
        listInvestigationEntries(request.server.db, actor.organizationId, company.id, incident.id),
        listRelatedSuggestions(request.server.db, actor.organizationId, company.id, incident.id),
        listProblems(request.server.db, actor.organizationId, company.id),
      ]);
      return {
        incident: toIncident(incident),
        affectedResources: resources.map((r) => ({
          id: r.id,
          resourceType: r.resource_type,
          resourceId: r.resource_id,
          label: r.label,
        })),
        evidence: evidence.map(toEvidence),
        entries: entries.map(toEntry),
        related: related.map((r) => ({
          id: r.id,
          suggestedIncidentId: r.suggested_incident_id,
          scoringVersion: r.scoring_version,
          score: r.score,
          reasons: r.reasons,
          status: r.status,
          title: r.title,
          providerError: r.provider_error,
        })),
        problems: problems
          .filter((p) => ((p.incident_ids as string[]) ?? []).includes(incident.id))
          .map((p) => ({
            id: p.id,
            title: p.title,
            workingCause: p.working_cause,
            status: p.status,
            incidentIds: p.incident_ids,
          })),
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create incidents", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as {
        title: string;
        reportedSymptom: string;
        impactDescription?: string | null;
        severity?: "low" | "medium" | "high" | "critical";
        tags?: string[];
        workflowRunId?: string | null;
        workflowStepKey?: string | null;
        correlationId?: string | null;
        providerError?: string | null;
        affected?: Array<{ resourceType: string; resourceId: string; label?: string | null }>;
      };
      const incident = await withTransaction(request.server.db, (client) =>
        createIncident(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          title: body.title,
          reportedSymptom: body.reportedSymptom,
          impactDescription: body.impactDescription,
          severity: body.severity ?? "medium",
          ownerStaffUserId: actor.staffUserId,
          tags: body.tags ?? [],
          workflowRunId: body.workflowRunId,
          workflowStepKey: body.workflowStepKey,
          correlationId: body.correlationId ?? request.correlationId,
          providerError: body.providerError,
          affected: body.affected,
        }),
      );
      return { incident: toIncident(incident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.patch("/api/v1/companies/:companyId/incidents/:incidentId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update incidents", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; incidentId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as Record<string, unknown>;
      const incident = await updateIncident(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: params.incidentId,
        version: Number(body.version),
        title: body.title as string | undefined,
        reportedSymptom: body.reportedSymptom as string | undefined,
        impactDescription: body.impactDescription as string | null | undefined,
        severity: body.severity as "low" | "medium" | "high" | "critical" | undefined,
        status: body.status as
          | "open"
          | "investigating"
          | "waiting"
          | "resolved"
          | "closed"
          | undefined,
        tags: body.tags as string[] | undefined,
        resolutionSummary: body.resolutionSummary as string | null | undefined,
        resolutionKind: body.resolutionKind as
          | "confirmed_cause"
          | "unresolved_hypothesis"
          | null
          | undefined,
      });
      return { incident: toIncident(incident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/resources", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; incidentId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as { resourceType: string; resourceId: string; label?: string | null };
      await addAffectedResource(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: params.incidentId,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        label: body.label,
      });
      return { ok: true };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/entries", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; incidentId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as {
        entryKind: string;
        body: string;
        occurredAt?: string | null;
        timePrecision?: string;
        linkedEvidenceIds?: string[];
      };
      const entry = await createInvestigationEntry(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: params.incidentId,
        entryKind: body.entryKind,
        body: body.body,
        occurredAt: body.occurredAt,
        timePrecision: body.timePrecision,
        authorStaffUserId: actor.staffUserId,
        linkedEvidenceIds: body.linkedEvidenceIds,
      });
      return { entry: toEntry(entry) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/evidence/upload", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; incidentId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incident = await getIncident(request.server.db, actor.organizationId, company.id, params.incidentId);
      if (!incident) return sendError(reply, 404, "not_found", "Not found", request.correlationId);

      const file = await request.file();
      if (!file) return sendError(reply, 400, "validation_error", "File required", request.correlationId);
      const buffer = await file.toBuffer();
      const totals = await evidenceTotals(request.server.db, actor.organizationId, company.id, incident.id);
      assertUploadAllowed({
        filename: file.filename,
        contentType: file.mimetype,
        byteSize: buffer.byteLength,
        existingFileCount: totals.count,
        existingTotalBytes: totals.bytes,
      });

      const root = evidenceRoot(process.env.EVIDENCE_STORAGE_DIR);
      const fileId = randomUUID();
      const { storageKey, sha256 } = await storeEvidenceBytes(
        root,
        actor.organizationId,
        company.id,
        fileId,
        buffer,
      );
      const textLike = /\.(txt|log|csv|json|jsonl)$/i.test(file.filename);
      const parsed = textLike ? buildParsedSummary(file.filename, buffer.toString("utf8")) : null;

      const evidence = await withTransaction(request.server.db, async (client) => {
        const fileObjectId = await insertFileObject(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          storageKey,
          originalFilename: file.filename,
          contentType: file.mimetype,
          byteSize: buffer.byteLength,
          sha256,
          createdByStaffUserId: actor.staffUserId,
        });
        const row = await insertEvidenceRecord(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          incidentId: incident.id,
          fileObjectId,
          kind: "upload",
          sourceLabel: "Uploaded evidence",
          originalFilename: file.filename,
          contentType: file.mimetype,
          byteSize: buffer.byteLength,
          sha256,
          storageKey,
          parserVersion: parsed?.parserVersion ?? null,
          parseWarnings: parsed?.warnings ?? [],
          parsedSummary: parsed,
          uploadedByStaffUserId: actor.staffUserId,
        });
        await refreshRelatedSuggestions(client, actor.organizationId, company.id, incident.id);
        return row;
      });
      return { evidence: toEvidence(evidence) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/evidence/:evidenceId/redact", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; incidentId: string; evidenceId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const source = await getEvidence(request.server.db, actor.organizationId, company.id, params.evidenceId);
      if (!source?.storage_key) {
        return sendError(reply, 404, "not_found", "Evidence file not found", request.correlationId);
      }
      const root = evidenceRoot(process.env.EVIDENCE_STORAGE_DIR);
      const original = await readEvidenceBytes(root, source.storage_key);
      const { text, note } = redactTextAssistance(original.toString("utf8"));
      const bytes = Buffer.from(text, "utf8");
      const fileId = randomUUID();
      const { storageKey, sha256 } = await storeEvidenceBytes(
        root,
        actor.organizationId,
        company.id,
        fileId,
        bytes,
      );
      const evidence = await withTransaction(request.server.db, async (client) => {
        const fileObjectId = await insertFileObject(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          storageKey,
          originalFilename: `redacted-${source.original_filename ?? "evidence.txt"}`,
          contentType: "text/plain",
          byteSize: bytes.byteLength,
          sha256,
          createdByStaffUserId: actor.staffUserId,
        });
        return insertEvidenceRecord(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          incidentId: params.incidentId,
          fileObjectId,
          kind: "redacted_derivative",
          sourceLabel: "Redacted derivative",
          originalFilename: `redacted-${source.original_filename ?? "evidence.txt"}`,
          contentType: "text/plain",
          byteSize: bytes.byteLength,
          sha256,
          storageKey,
          redactedFromEvidenceId: source.id,
          isRedacted: true,
          parseWarnings: [note],
          parsedSummary: buildParsedSummary("redacted.txt", text),
          uploadedByStaffUserId: actor.staffUserId,
        });
      });
      return { evidence: toEvidence(evidence) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/incidents/:incidentId/evidence/:evidenceId/download", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; incidentId: string; evidenceId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const evidence = await getEvidence(request.server.db, actor.organizationId, company.id, params.evidenceId);
      if (!evidence || evidence.incident_id !== params.incidentId || !evidence.storage_key) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const bytes = await readEvidenceBytes(evidenceRoot(process.env.EVIDENCE_STORAGE_DIR), evidence.storage_key);
      reply.header("Content-Type", evidence.content_type ?? "application/octet-stream");
      reply.header(
        "Content-Disposition",
        `attachment; filename="${(evidence.original_filename ?? "evidence").replace(/"/g, "")}"`,
      );
      reply.header("X-Content-Type-Options", "nosniff");
      return reply.send(bytes);
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/evidence/ranger-events", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; incidentId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as {
        entityType: string;
        entityId: string;
        eventIds?: string[];
      };
      const events = await listTimelineForEntity(
        request.server.db,
        actor.organizationId,
        body.entityType,
        body.entityId,
      );
      const selected = body.eventIds?.length
        ? events.filter((e) => body.eventIds!.includes(e.id))
        : events.slice(0, 20);
      const created = [];
      for (const event of selected) {
        created.push(
          await linkRangerEventEvidence(request.server.db, {
            organizationId: actor.organizationId,
            companyId: company.id,
            incidentId: params.incidentId,
            eventId: event.id,
            eventKind: event.event_kind,
            summary: event.summary,
            occurredAt: event.effective_at?.toISOString?.() ?? event.recorded_at?.toISOString?.() ?? null,
            entityType: body.entityType,
            entityId: body.entityId,
            uploadedByStaffUserId: actor.staffUserId,
          }),
        );
      }
      return { evidence: created.map(toEvidence) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/related/:suggestionId/dismiss", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; suggestionId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      await dismissRelatedSuggestion(request.server.db, actor.organizationId, company.id, params.suggestionId);
      return { ok: true };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/related/:suggestionId/link", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; suggestionId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      await linkRelatedSuggestion(request.server.db, actor.organizationId, company.id, params.suggestionId);
      return { ok: true };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/problems", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const problems = await listProblems(request.server.db, actor.organizationId, company.id);
      return {
        problems: problems.map((p) => ({
          id: p.id,
          title: p.title,
          workingCause: p.working_cause,
          resolution: p.resolution,
          status: p.status,
          incidentIds: p.incident_ids,
        })),
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/problems", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Forbidden", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as {
        title: string;
        workingCause?: string | null;
        incidentIds: string[];
        permanentFixWorkItemId?: string | null;
      };
      const problem = await createProblem(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        title: body.title,
        workingCause: body.workingCause,
        ownerStaffUserId: actor.staffUserId,
        permanentFixWorkItemId: body.permanentFixWorkItemId,
        incidentIds: body.incidentIds ?? [],
      });
      return { problem };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/incidents/:incidentId/exports", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "download")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot export evidence packages", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; incidentId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as {
        evidenceIds: string[];
        entryIds?: string[];
        excludedFields?: string[];
      };
      const incident = await getIncident(request.server.db, actor.organizationId, company.id, params.incidentId);
      if (!incident) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const [resources, allEvidence, allEntries] = await Promise.all([
        listAffectedResources(request.server.db, actor.organizationId, company.id, incident.id),
        listEvidence(request.server.db, actor.organizationId, company.id, incident.id),
        listInvestigationEntries(request.server.db, actor.organizationId, company.id, incident.id),
      ]);
      const evidence = allEvidence.filter((e) => body.evidenceIds.includes(e.id));
      // Prefer redacted derivatives when both selected incorrectly — never include raw if redacted twin selected for same parent
      const selectedEvidence = evidence.filter((e) => {
        if (!e.is_redacted) {
          const hasRedactedTwin = evidence.some(
            (other) => other.is_redacted && other.redacted_from_evidence_id === e.id,
          );
          return !hasRedactedTwin;
        }
        return true;
      });
      const entries = allEntries.filter((e) => !(body.entryIds?.length) || body.entryIds.includes(e.id));
      const excludedFields = body.excludedFields ?? [];
      const report = buildReportMarkdown({
        incident: toIncident(incident),
        resources,
        entries: entries.map(toEntry),
        evidence: selectedEvidence.map(toEvidence),
        excludedFields,
      });
      const zip = new JSZip();
      zip.file("report.md", report);
      const manifest = {
        incidentId: incident.id,
        companyId: company.id,
        generatedAt: new Date().toISOString(),
        createdByStaffUserId: actor.staffUserId,
        selectedEvidence: selectedEvidence.map((e) => ({
          id: e.id,
          sha256: e.sha256,
          isRedacted: e.is_redacted,
          filename: e.original_filename,
        })),
        selectedEntries: entries.map((e) => e.id),
        excludedFields,
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const root = evidenceRoot(process.env.EVIDENCE_STORAGE_DIR);
      for (const item of selectedEvidence) {
        if (!item.storage_key) continue;
        const bytes = await readEvidenceBytes(root, item.storage_key);
        zip.file(`attachments/${item.original_filename ?? item.id}`, bytes);
      }
      const zipBytes = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
      const exportId = randomUUID();
      const { storageKey, sha256 } = await storeEvidenceBytes(
        root,
        actor.organizationId,
        company.id,
        `export-${exportId}`,
        zipBytes,
      );
      const record = await insertIncidentExport(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        incidentId: incident.id,
        createdByStaffUserId: actor.staffUserId,
        selectedEvidenceIds: selectedEvidence.map((e) => e.id),
        selectedEntryIds: entries.map((e) => e.id),
        excludedFields,
        reportMarkdown: report,
        manifest,
        storageKey,
        sha256,
        byteSize: zipBytes.byteLength,
      });
      return {
        export: {
          id: record.id,
          sha256: record.sha256,
          byteSize: record.byte_size,
          createdAt: record.created_at.toISOString(),
          downloadPath: `/api/v1/companies/${company.id}/incident-exports/${record.id}/download`,
        },
        reportMarkdown: report,
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/incident-exports/:exportId/download", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "download")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot download export packages", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; exportId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const record = await getIncidentExport(request.server.db, actor.organizationId, company.id, params.exportId);
      if (!record) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const bytes = await readEvidenceBytes(
        evidenceRoot(process.env.EVIDENCE_STORAGE_DIR),
        record.storage_key,
      );
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="incident-export-${record.id}.zip"`);
      reply.header("X-Content-Type-Options", "nosniff");
      return reply.send(bytes);
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/resources/:resourceType/:resourceId/incidents", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; resourceType: string; resourceId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const incidents = await listIncidentsForResource(
        request.server.db,
        actor.organizationId,
        company.id,
        params.resourceType,
        params.resourceId,
      );
      return { incidents: incidents.map(toIncident) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
}
