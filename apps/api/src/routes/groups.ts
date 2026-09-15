import {
  groupCreateSchema,
  groupMembershipCreateSchema,
  groupPatchSchema,
} from "@ranger/contracts";
import {
  createGroup,
  createGroupMembership,
  getGroup,
  insertAuditEvent,
  listGroupMemberships,
  listGroups,
  updateGroup,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toGroup, toGroupMembership } from "../serialize-inventory.ts";

export async function registerGroupRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/groups", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const groups = await listGroups(request.server.db, actor.organizationId, company.id);
      return { groups: groups.map(toGroup) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/groups", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create groups", request.correlationId);
    }
    const parsed = groupCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid group", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const group = await createGroup(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data,
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "group.create",
        targetType: "group",
        targetId: group.id,
        summary: `Created group ${group.display_name}`,
        correlationId: request.correlationId,
      });
      return reply.status(201).send({ group: toGroup(group) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get("/api/v1/companies/:companyId/groups/:groupId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; groupId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const group = await getGroup(
        request.server.db,
        actor.organizationId,
        company.id,
        params.groupId,
      );
      if (!group) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const memberships = await listGroupMemberships(
        request.server.db,
        actor.organizationId,
        company.id,
        params.groupId,
      );
      return { group: toGroup(group), memberships: memberships.map(toGroupMembership) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.patch("/api/v1/companies/:companyId/groups/:groupId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update groups", request.correlationId);
    }
    const parsed = groupPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid group update", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; groupId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateGroup(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        groupId: params.groupId,
        ...parsed.data,
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Group changed or not found", request.correlationId);
      }
      return { group: toGroup(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/groups/:groupId/memberships", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot change memberships", request.correlationId);
    }
    const parsed = groupMembershipCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid membership", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; groupId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const membership = await createGroupMembership(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        groupId: params.groupId,
        ...parsed.data,
      });
      return reply.status(201).send({ membership: toGroupMembership(membership) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}
