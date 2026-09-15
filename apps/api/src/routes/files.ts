import { DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { authorizePrivateDownload, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";

export async function registerFileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/files/:fileId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    try {
      await authorizePrivateDownload(request, (request.params as { fileId: string }).fileId);
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
    return sendError(
      reply,
      404,
      "not_found",
      "No stored file exists for this identifier",
      request.correlationId,
    );
  });
}
