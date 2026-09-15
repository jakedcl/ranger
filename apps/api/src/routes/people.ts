import {
  accountLinkSchema,
  personCreateSchema,
  personPatchSchema,
} from "@ranger/contracts";
import {
  archivePerson,
  companyCostSummary,
  createPerson,
  getArchiveReadiness,
  getPerson,
  insertAuditEvent,
  linkAccountToPerson,
  listPeople,
  loadPersonProfile,
  updatePerson,
  withTransaction,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import {
  toAccount,
  toDevice,
  toDeviceAssignment,
  toGroupMembership,
  toLicenseAssignment,
  toMailboxAccess,
  toPerson,
  toTimelineEvent,
  toWorkItem,
} from "../serialize-inventory.ts";

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

export async function registerPeopleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/people", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const query = request.query as {
        q?: string;
        itStatus?: string;
        includeArchived?: string;
      };
      const people = await listPeople(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        q: query.q,
        itStatus: query.itStatus,
        includeArchived: query.includeArchived === "true" || query.includeArchived === "1",
      });
      return { people: people.map(toPerson) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post("/api/v1/companies/:companyId/people", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create people", request.correlationId);
    }
    const parsed = personCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid person", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const person = await createPerson(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data,
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "person.create",
        targetType: "person",
        targetId: person.id,
        summary: `Created person ${person.display_name}`,
        correlationId: request.correlationId,
      });
      return reply.status(201).send({ person: toPerson(person) });
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get("/api/v1/companies/:companyId/people/:personId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; personId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const profile = await loadPersonProfile(
        request.server.db,
        actor.organizationId,
        company.id,
        params.personId,
      );
      if (!profile) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return {
        person: toPerson(profile.person),
        accounts: profile.accounts.map(toAccount),
        groupMemberships: profile.groupMemberships.map((row) => ({
          ...toGroupMembership(row),
          groupName: row.group_name,
          groupType: row.group_type,
        })),
        mailboxAccess: profile.mailboxAccess.map((row) => ({
          ...toMailboxAccess(row),
          mailboxAddress: row.mailbox_address,
        })),
        assignments: profile.assignments.map(toLicenseAssignment),
        licenseAssignments: profile.assignments.map(toLicenseAssignment),
        devices: profile.devices.map((row) => ({
          ...toDeviceAssignment(row),
          device: row.device ? toDevice(row.device) : undefined,
        })),
        workItems: profile.workItems.map(toWorkItem),
        timeline: profile.timeline.map(toTimelineEvent),
        costs: profile.costs,
        costSummary: profile.costs.byCurrency.map((bucket) => ({
          currency: bucket.currency,
          assignedShare: bucket.total,
          unknownPrices: profile.costs.unknownCount > 0,
        })),
      };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.patch("/api/v1/companies/:companyId/people/:personId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update people", request.correlationId);
    }
    const parsed = personPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid person update", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; personId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updatePerson(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        personId: params.personId,
        ...parsed.data,
      });
      if (!updated) {
        const existing = await getPerson(
          request.server.db,
          actor.organizationId,
          company.id,
          params.personId,
        );
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(
          reply,
          409,
          "conflict",
          "This person changed since you loaded it. Refresh and try again.",
          request.correlationId,
        );
      }
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "person.update",
        targetType: "person",
        targetId: updated.id,
        summary: `Updated person ${updated.display_name}`,
        correlationId: request.correlationId,
      });
      return { person: toPerson(updated) };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.get(
    "/api/v1/companies/:companyId/people/:personId/archive-readiness",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params as { companyId: string; personId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const person = await getPerson(
          request.server.db,
          actor.organizationId,
          company.id,
          params.personId,
        );
        if (!person) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const readiness = await getArchiveReadiness(
          request.server.db,
          actor.organizationId,
          company.id,
          params.personId,
        );
        return readiness;
      } catch (error) {
        return handleDomain(reply, request.correlationId, error);
      }
    },
  );

  app.post("/api/v1/companies/:companyId/people/:personId/archive", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot archive", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; personId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const result = await withTransaction(request.server.db, async (client) =>
        archivePerson(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          personId: params.personId,
          actorStaffUserId: actor.staffUserId,
        }),
      );
      return { person: toPerson(result.person), readiness: result.readiness };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });

  app.post(
    "/api/v1/companies/:companyId/people/:personId/accounts/:accountId/link",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot link accounts", request.correlationId);
      }
      const parsed = accountLinkSchema.safeParse({
        ...(request.body as object),
        personId: (request.params as { personId: string }).personId,
      });
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid link request", request.correlationId);
      }
      try {
        const params = request.params as {
          companyId: string;
          personId: string;
          accountId: string;
        };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const account = await withTransaction(request.server.db, async (client) =>
          linkAccountToPerson(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            accountId: params.accountId,
            personId: params.personId,
            version: parsed.data.version,
            actorStaffUserId: actor.staffUserId,
          }),
        );
        return { account: toAccount(account) };
      } catch (error) {
        return handleDomain(reply, request.correlationId, error);
      }
    },
  );

  app.get("/api/v1/companies/:companyId/costs", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const costs = await companyCostSummary(
        request.server.db,
        actor.organizationId,
        company.id,
      );
      return { costs };
    } catch (error) {
      return handleDomain(reply, request.correlationId, error);
    }
  });
}
