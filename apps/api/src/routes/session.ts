import { getOrganization } from "@ranger/db";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { requireActor } from "../authz.ts";
import { sendError } from "../http.ts";

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/session", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    const session = await request.server.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    const organization = await getOrganization(request.server.db, actor.organizationId);
    if (!session?.user || !organization) {
      return sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    }
    return {
      user: {
        id: actor.staffUserId,
        email: session.user.email,
        name: session.user.name,
        role: actor.role,
        organizationId: actor.organizationId,
        organizationName: organization.name,
        environment: organization.deployment_environment,
        companyIds: actor.companyIds,
        automationExecute: actor.automationExecute,
      },
    };
  });
}
