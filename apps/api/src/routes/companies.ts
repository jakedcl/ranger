import { companyPatchSchema } from "@ranger/contracts";
import {
  getOrganization,
  insertAuditEvent,
  listCompaniesForOrganization,
  updateCompanyNotes,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toCompany } from "../serialize.ts";

export async function registerCompanyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    const organization = await getOrganization(request.server.db, actor.organizationId);
    if (!organization) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const companies = await listCompaniesForOrganization(request.server.db, actor.organizationId);
    const visible =
      actor.role === "admin"
        ? companies
        : companies.filter((company) => actor.companyIds.includes(company.id));
    return { companies: visible.map((company) => toCompany(company, organization.deployment_environment)) };
  });

  app.get("/api/v1/companies/:companyId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const organization = await getOrganization(request.server.db, actor.organizationId);
      if (!organization) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return { company: toCompany(company, organization.deployment_environment) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.patch("/api/v1/companies/:companyId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot change company records", request.correlationId);
    }
    const parsed = companyPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid company update", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const updated = await updateCompanyNotes(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        itNotes: parsed.data.itNotes,
        version: parsed.data.version,
      });
      if (!updated) {
        return sendError(
          reply,
          409,
          "conflict",
          "This company changed since you loaded it. Refresh and try again.",
          request.correlationId,
        );
      }
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "company.notes.update",
        targetType: "company",
        targetId: company.id,
        summary: "Updated IT notes",
        beforeSummary: company.it_notes,
        afterSummary: updated.it_notes,
        correlationId: request.correlationId,
      });
      const organization = await getOrganization(request.server.db, actor.organizationId);
      return { company: toCompany(updated, organization?.deployment_environment ?? "demo") };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}
