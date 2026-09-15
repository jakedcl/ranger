import { importPreviewRequestSchema } from "@ranger/contracts";
import {
  applyPeopleImport,
  getImportBatch,
  listImportRows,
  previewPeopleImport,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";

const uiPreviewSchema = z.object({
  resourceKind: z.string().default("people"),
  filename: z.string().min(1),
  csvText: z.string().min(1).optional(),
  csv: z.string().min(1).optional(),
});

function toBatch(row: {
  id: string;
  organization_id: string;
  company_id: string;
  resource_kind: string;
  original_filename: string;
  status: string;
  created_at: Date;
  applied_at: Date | null;
}) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyId: row.company_id,
    resourceKind: row.resource_kind,
    filename: row.original_filename,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    appliedAt: row.applied_at?.toISOString() ?? null,
  };
}

export async function registerImportRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/companies/:companyId/imports/preview", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot import", request.correlationId);
    }
    const ui = uiPreviewSchema.safeParse(request.body);
    if (!ui.success) {
      return sendError(reply, 400, "validation_error", "Invalid import preview", request.correlationId);
    }
    const csv = ui.data.csv ?? ui.data.csvText;
    if (!csv) {
      return sendError(reply, 400, "validation_error", "csv or csvText is required", request.correlationId);
    }
    const parsed = importPreviewRequestSchema.safeParse({
      resourceKind: "people",
      filename: ui.data.filename,
      csv,
    });
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid import preview", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      if (ui.data.resourceKind !== "people") {
        return sendError(
          reply,
          422,
          "unprocessable",
          "Only people CSV import is implemented in M1",
          request.correlationId,
        );
      }
      const result = await previewPeopleImport(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        filename: parsed.data.filename,
        csv: parsed.data.csv,
        createdByStaffUserId: actor.staffUserId,
      });
      return {
        batch: toBatch(result.batch),
        rows: result.rows.map((row) => ({
          rowNumber: row.row_number,
          validationStatus: row.validation_status,
          validationErrors: row.validation_errors,
          dedupeKey: row.dedupe_key,
          applyStatus: row.apply_status,
          raw: row.raw_data,
        })),
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/imports/:batchId/apply", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot import", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; batchId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const result = await applyPeopleImport(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        batchId: params.batchId,
        actorStaffUserId: actor.staffUserId,
      });
      return {
        batch: toBatch(result.batch),
        applied: result.applied,
        noop: result.noop,
        failed: result.failed,
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get("/api/v1/companies/:companyId/imports/:batchId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; batchId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const batch = await getImportBatch(
        request.server.db,
        actor.organizationId,
        company.id,
        params.batchId,
      );
      if (!batch) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const rows = await listImportRows(
        request.server.db,
        actor.organizationId,
        company.id,
        params.batchId,
      );
      return {
        batch: toBatch(batch),
        rows: rows.map((row) => ({
          rowNumber: row.row_number,
          validationStatus: row.validation_status,
          validationErrors: row.validation_errors,
          dedupeKey: row.dedupe_key,
          applyStatus: row.apply_status,
          raw: row.raw_data,
        })),
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}
