import { connectionCreateSchema, syncNowSchema } from "@ranger/contracts";
import {
  createConnection,
  getConnection,
  listConnections,
  listSyncRuns,
  providerForConnection,
  runConnectionSync,
} from "@ranger/db";
import { ProviderError } from "@ranger/integrations";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";

function toConnection(row: {
  id: string;
  organization_id: string;
  company_id: string;
  provider_kind: "demo" | "microsoft";
  tenant_id: string | null;
  display_name: string;
  status: string;
  credential_ref: string | null;
  failure_mode: string | null;
  last_success_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
}) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    providerKind: row.provider_kind,
    tenantId: row.tenant_id,
    displayName: row.display_name,
    status: row.status,
    credentialRef: row.credential_ref,
    failureMode: row.failure_mode,
    lastSuccessAt: row.last_success_at?.toISOString() ?? null,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

function toSyncRun(row: {
  id: string;
  organization_id: string;
  company_id: string;
  connection_id: string;
  collection: string;
  status: string;
  started_at: Date | null;
  finished_at: Date | null;
  item_count: number;
  page_count: number;
  error_code: string | null;
  error_message: string | null;
  correlation_id: string | null;
  created_at: Date;
}) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    connectionId: row.connection_id,
    collection: row.collection,
    status: row.status,
    startedAt: row.started_at?.toISOString() ?? null,
    finishedAt: row.finished_at?.toISOString() ?? null,
    itemCount: row.item_count,
    pageCount: row.page_count,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    correlationId: row.correlation_id,
    createdAt: row.created_at.toISOString(),
  };
}

export async function registerIntegrationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/connections", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const connections = await listConnections(
        request.server.db,
        actor.organizationId,
        company.id,
      );
      return { connections: connections.map(toConnection) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/connections", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(
        reply,
        403,
        "forbidden",
        "Only admins can create provider connections",
        request.correlationId,
      );
    }
    const parsed = connectionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid connection", request.correlationId);
    }
    if (parsed.data.providerKind === "microsoft" && !parsed.data.tenantId) {
      return sendError(
        reply,
        400,
        "validation_error",
        "Microsoft connections require tenantId",
        request.correlationId,
      );
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const connection = await createConnection(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        providerKind: parsed.data.providerKind,
        displayName: parsed.data.displayName,
        tenantId: parsed.data.tenantId,
        credentialRef: parsed.data.credentialRef,
        failureMode: parsed.data.failureMode,
        status: parsed.data.providerKind === "demo" ? "connected" : "draft",
      });
      return reply.status(201).send({ connection: toConnection(connection) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get(
    "/api/v1/companies/:companyId/connections/:connectionId/capabilities",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params as { companyId: string; connectionId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const connection = await getConnection(
          request.server.db,
          actor.organizationId,
          company.id,
          params.connectionId,
        );
        if (!connection) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const provider = providerForConnection(connection);
        const capabilities = await provider.listCapabilities();
        return {
          connection: toConnection(connection),
          capabilities,
          liveVerified: false,
          note:
            connection.provider_kind === "demo"
              ? "Demo adapter — simulated observations only"
              : "Live Graph requires authorized tenant credentials (currently blocked if unset)",
        };
      } catch (error) {
        if (error instanceof ProviderError) {
          return sendError(reply, 422, error.code, error.message, request.correlationId);
        }
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.post(
    "/api/v1/companies/:companyId/connections/:connectionId/sync",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot sync", request.correlationId);
      }
      const parsed = syncNowSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid sync request", request.correlationId);
      }
      try {
        const params = request.params as { companyId: string; connectionId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const result = await runConnectionSync(request.server.db, {
          organizationId: actor.organizationId,
          companyId: company.id,
          connectionId: params.connectionId,
          collections: parsed.data.collections,
          correlationId: request.correlationId,
        });
        return { sync: result };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.get(
    "/api/v1/companies/:companyId/connections/:connectionId/sync-runs",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params as { companyId: string; connectionId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const runs = await listSyncRuns(request.server.db, {
          organizationId: actor.organizationId,
          companyId: company.id,
          connectionId: params.connectionId,
        });
        return { syncRuns: runs.map(toSyncRun) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.get("/api/v1/companies/:companyId/sync-runs", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const runs = await listSyncRuns(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
      });
      return { syncRuns: runs.map(toSyncRun) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}
