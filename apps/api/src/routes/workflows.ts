import { randomUUID } from "node:crypto";
import {
  approveWorkflowRun,
  cancelWorkflowRun,
  executeWorkflowRun,
  fulfillManualStep,
  getWorkflowRun,
  listCompanyBindings,
  listNotifications,
  listRoleTemplates,
  listWorkflowRuns,
  listWorkflowSteps,
  previewOffboarding,
  previewOnboarding,
  previewStatusChange,
  retryFailedSteps,
  upsertCompanyBinding,
} from "@ranger/db";
import { DomainError, canMutate, type PersonItStatus } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
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

function toRun(row: Awaited<ReturnType<typeof getWorkflowRun>>) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    personId: row.person_id,
    kind: row.kind,
    status: row.status,
    templateId: row.template_id,
    templateVersionId: row.template_version_id,
    frozenPlan: row.frozen_plan,
    actorStaffUserId: row.actor_staff_user_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    approvedAt: row.approved_at?.toISOString() ?? null,
    canceledAt: row.canceled_at?.toISOString() ?? null,
  };
}

function toStep(row: Awaited<ReturnType<typeof listWorkflowSteps>>[number]) {
  return {
    id: row.id,
    key: row.step_key,
    kind: row.kind,
    executionMethod: row.execution_method,
    dependsOn: row.depends_on,
    status: row.status,
    summary: row.summary,
    params: row.params,
    evidence: row.result_evidence,
    error: row.error_message,
  };
}

export async function registerWorkflowRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/role-templates", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const templates = await listRoleTemplates(request.server.db, actor.organizationId);
    return {
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        currentVersion: t.currentVersion
          ? {
              id: t.currentVersion.id,
              versionNumber: t.currentVersion.version_number,
              intents: t.currentVersion.intents,
            }
          : null,
      })),
    };
  });

  app.get("/api/v1/notifications", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const items = await listNotifications(request.server.db, actor.organizationId, actor.staffUserId);
    return {
      notifications: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        runId: n.run_id,
        createdAt: n.created_at.toISOString(),
        readAt: n.read_at?.toISOString() ?? null,
      })),
    };
  });

  app.get("/api/v1/companies/:companyId/template-bindings", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(request, (request.params as { companyId: string }).companyId);
      const templateId = (request.query as { templateId?: string }).templateId;
      if (!templateId) {
        return sendError(reply, 400, "invalid_request", "templateId is required", request.correlationId);
      }
      const bindings = await listCompanyBindings(request.server.db, actor.organizationId, company.id, templateId);
      return {
        bindings: bindings.map((b) => ({
          id: b.id,
          bindingKey: b.binding_key,
          resourceType: b.resource_type,
          resourceId: b.resource_id,
        })),
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.put("/api/v1/companies/:companyId/template-bindings", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "admin") && actor.role !== "technician") {
      return sendError(reply, 403, "forbidden", "Cannot edit bindings", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(request, (request.params as { companyId: string }).companyId);
      const body = request.body as {
        templateId: string;
        bindingKey: string;
        resourceType: "group" | "subscription";
        resourceId: string;
      };
      const binding = await upsertCompanyBinding(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        templateId: body.templateId,
        bindingKey: body.bindingKey,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
      });
      return { binding };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/workflows", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(request, (request.params as { companyId: string }).companyId);
      const personId = (request.query as { personId?: string }).personId;
      const runs = await listWorkflowRuns(request.server.db, actor.organizationId, company.id, personId);
      return { runs: runs.map((r) => toRun(r)) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/workflows/:runId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; runId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const run = await getWorkflowRun(request.server.db, actor.organizationId, company.id, params.runId);
      if (!run) return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      const steps = await listWorkflowSteps(request.server.db, run.id);
      return { run: toRun(run), steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/people/:personId/workflows", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot start workflows", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; personId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as {
        kind: "onboarding" | "offboarding" | "status_change";
        templateId?: string;
        templateVersionId?: string;
        usageLocation?: string;
        toStatus?: PersonItStatus;
        departureDate?: string | null;
        idempotencyKey?: string;
      };
      const key = body.idempotencyKey ?? randomUUID();
      const args = {
        organizationId: actor.organizationId,
        companyId: company.id,
        personId: params.personId,
        actorStaffUserId: actor.staffUserId,
        idempotencyKey: key,
        correlationId: request.correlationId,
      };
      const result =
        body.kind === "onboarding"
          ? await previewOnboarding(request.server.db, {
              ...args,
              templateId: body.templateId!,
              templateVersionId: body.templateVersionId!,
              usageLocation: body.usageLocation,
            })
          : body.kind === "offboarding"
            ? await previewOffboarding(request.server.db, args)
            : await previewStatusChange(request.server.db, {
                ...args,
                toStatus: body.toStatus ?? "active",
                departureDate: body.departureDate,
              });
      const steps = await listWorkflowSteps(request.server.db, result.run.id);
      return { run: toRun(result.run), plan: result.plan, steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  async function mutateRun(
    request: import("fastify").FastifyRequest,
    reply: import("fastify").FastifyReply,
    action: "approve" | "execute" | "retry" | "cancel",
  ) {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const needsExecute = action === "execute" || action === "retry";
    if (!canMutate(actor, needsExecute ? "automation" : "manual")) {
      return sendError(
        reply,
        403,
        "forbidden",
        needsExecute ? "Automation execute permission required" : "Cannot mutate workflow",
        request.correlationId,
      );
    }
    try {
      const params = request.params as { companyId: string; runId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const ids = { organizationId: actor.organizationId, companyId: company.id, runId: params.runId };
      if (action === "approve") await approveWorkflowRun(request.server.db, ids);
      else if (action === "execute") await executeWorkflowRun(request.server.db, ids);
      else if (action === "retry") await retryFailedSteps(request.server.db, ids);
      else await cancelWorkflowRun(request.server.db, ids);
      const run = await getWorkflowRun(request.server.db, actor.organizationId, company.id, params.runId);
      const steps = run ? await listWorkflowSteps(request.server.db, run.id) : [];
      return { run: toRun(run), steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  }

  app.post("/api/v1/companies/:companyId/workflows/:runId/approve", (request, reply) =>
    mutateRun(request, reply, "approve"),
  );
  app.post("/api/v1/companies/:companyId/workflows/:runId/execute", (request, reply) =>
    mutateRun(request, reply, "execute"),
  );
  app.post("/api/v1/companies/:companyId/workflows/:runId/retry", (request, reply) =>
    mutateRun(request, reply, "retry"),
  );
  app.post("/api/v1/companies/:companyId/workflows/:runId/cancel", (request, reply) =>
    mutateRun(request, reply, "cancel"),
  );

  app.post("/api/v1/companies/:companyId/workflows/:runId/steps/:stepId/fulfill", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Cannot fulfill steps", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; runId: string; stepId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const body = request.body as { evidence?: string };
      if (!body.evidence?.trim()) {
        return sendError(reply, 400, "invalid_request", "Evidence is required", request.correlationId);
      }
      await fulfillManualStep(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        runId: params.runId,
        stepId: params.stepId,
        actorStaffUserId: actor.staffUserId,
        evidence: body.evidence.trim(),
      });
      const run = await getWorkflowRun(request.server.db, actor.organizationId, company.id, params.runId);
      const steps = run ? await listWorkflowSteps(request.server.db, run.id) : [];
      return { run: toRun(run), steps: steps.map(toStep) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
}
