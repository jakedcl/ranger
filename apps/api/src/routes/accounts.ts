import { accountCreateSchema, accountPatchSchema } from "@ranger/contracts";
import {
  createAccount,
  getAccount,
  insertAuditEvent,
  listAccounts,
  unlinkAccountFromPerson,
  updateAccount,
  withTransaction,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toAccount } from "../serialize-inventory.ts";

export async function registerAccountRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/accounts", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const accounts = await listAccounts(request.server.db, actor.organizationId, company.id);
      return { accounts: accounts.map(toAccount) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/accounts", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create accounts", request.correlationId);
    }
    const parsed = accountCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid account", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const account = await createAccount(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data,
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "account.create",
        targetType: "account",
        targetId: account.id,
        summary: `Created account ${account.login_name}`,
        correlationId: request.correlationId,
      });
      return reply.status(201).send({ account: toAccount(account) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get("/api/v1/companies/:companyId/accounts/:accountId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; accountId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const account = await getAccount(
        request.server.db,
        actor.organizationId,
        company.id,
        params.accountId,
      );
      if (!account) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return { account: toAccount(account) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.patch("/api/v1/companies/:companyId/accounts/:accountId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update accounts", request.correlationId);
    }
    const parsed = accountPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid account update", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; accountId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateAccount(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        accountId: params.accountId,
        ...parsed.data,
      });
      if (!updated) {
        const existing = await getAccount(
          request.server.db,
          actor.organizationId,
          company.id,
          params.accountId,
        );
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(reply, 409, "conflict", "Account changed since you loaded it", request.correlationId);
      }
      return { account: toAccount(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post(
    "/api/v1/companies/:companyId/accounts/:accountId/unlink",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot unlink", request.correlationId);
      }
      const body = request.body as { version?: number };
      if (typeof body?.version !== "number") {
        return sendError(reply, 400, "validation_error", "version is required", request.correlationId);
      }
      try {
        const params = request.params as { companyId: string; accountId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const account = await withTransaction(request.server.db, async (client) =>
          unlinkAccountFromPerson(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            accountId: params.accountId,
            version: body.version!,
            actorStaffUserId: actor.staffUserId,
          }),
        );
        return { account: toAccount(account) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );
}
