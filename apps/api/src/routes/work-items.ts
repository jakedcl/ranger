import { workItemCreateSchema, workItemPatchSchema } from "@ranger/contracts";
import {
  createWorkItem,
  getWorkItem,
  insertAuditEvent,
  listWorkItems,
  updateWorkItem,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toWorkItem } from "../serialize-inventory.ts";

export async function registerWorkItemRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/work-items", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const query = request.query as { status?: string };
      let workItems = await listWorkItems(
        request.server.db,
        actor.organizationId,
        company.id,
      );
      if (query.status) {
        workItems = workItems.filter((item) => item.status === query.status);
      }
      return { workItems: workItems.map(toWorkItem) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/work-items", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create work items", request.correlationId);
    }
    const parsed = workItemCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid work item", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const workItem = await createWorkItem(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ownerStaffUserId: actor.staffUserId,
        ...parsed.data,
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "work_item.create",
        targetType: "work_item",
        targetId: workItem.id,
        summary: `Created work item ${workItem.title}`,
        correlationId: request.correlationId,
      });
      return reply.status(201).send({ workItem: toWorkItem(workItem) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get("/api/v1/companies/:companyId/work-items/:workItemId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; workItemId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const workItem = await getWorkItem(
        request.server.db,
        actor.organizationId,
        company.id,
        params.workItemId,
      );
      if (!workItem) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return { workItem: toWorkItem(workItem) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.patch("/api/v1/companies/:companyId/work-items/:workItemId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update work items", request.correlationId);
    }
    const parsed = workItemPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid work item update", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; workItemId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateWorkItem(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        workItemId: params.workItemId,
        ...parsed.data,
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Work item changed or not found", request.correlationId);
      }
      return { workItem: toWorkItem(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}
