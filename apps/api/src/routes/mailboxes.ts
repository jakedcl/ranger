import {
  mailboxAccessCreateSchema,
  mailboxCreateSchema,
  mailboxPatchSchema,
} from "@ranger/contracts";
import {
  createMailbox,
  createMailboxAccess,
  getMailbox,
  insertAuditEvent,
  listMailboxAccess,
  listMailboxes,
  updateMailbox,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toMailbox, toMailboxAccess } from "../serialize-inventory.ts";

export async function registerMailboxRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/mailboxes", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const mailboxes = await listMailboxes(request.server.db, actor.organizationId, company.id);
      return { mailboxes: mailboxes.map(toMailbox) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/mailboxes", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create mailboxes", request.correlationId);
    }
    const parsed = mailboxCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid mailbox", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const mailbox = await createMailbox(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data,
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "mailbox.create",
        targetType: "shared_mailbox",
        targetId: mailbox.id,
        summary: `Created shared mailbox ${mailbox.address}`,
        correlationId: request.correlationId,
      });
      return reply.status(201).send({ mailbox: toMailbox(mailbox) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get("/api/v1/companies/:companyId/mailboxes/:mailboxId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; mailboxId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const mailbox = await getMailbox(
        request.server.db,
        actor.organizationId,
        company.id,
        params.mailboxId,
      );
      if (!mailbox) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const access = await listMailboxAccess(
        request.server.db,
        actor.organizationId,
        company.id,
        params.mailboxId,
      );
      return { mailbox: toMailbox(mailbox), access: access.map(toMailboxAccess) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.patch("/api/v1/companies/:companyId/mailboxes/:mailboxId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update mailboxes", request.correlationId);
    }
    const parsed = mailboxPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid mailbox update", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; mailboxId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateMailbox(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        mailboxId: params.mailboxId,
        ...parsed.data,
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Mailbox changed or not found", request.correlationId);
      }
      return { mailbox: toMailbox(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/mailboxes/:mailboxId/access", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot grant mailbox access", request.correlationId);
    }
    const parsed = mailboxAccessCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid mailbox access", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; mailboxId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const access = await createMailboxAccess(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        mailboxId: params.mailboxId,
        ...parsed.data,
      });
      return reply.status(201).send({ access: toMailboxAccess(access) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}
