import cors from "@fastify/cors";
import {
  getOrganization,
  type createPool,
} from "@ranger/db";
import Fastify, { type FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { createAuth, type Auth } from "./auth.ts";
import { loadActor } from "./authz.ts";
import type { Env } from "./env.ts";
import { correlationIdFrom, sendError } from "./http.ts";
import { isAllowedWebOrigin, localDevOrigins } from "./origins.ts";
import { fromNodeHeaders } from "better-auth/node";
import { registerAccountRoutes } from "./routes/accounts.ts";
import { registerCompanyRoutes } from "./routes/companies.ts";
import { registerDemoRoutes } from "./routes/demo.ts";
import { registerDeviceRoutes } from "./routes/devices.ts";
import { registerFileRoutes } from "./routes/files.ts";
import { registerGroupRoutes } from "./routes/groups.ts";
import { registerImportRoutes } from "./routes/imports.ts";
import { registerIncidentRoutes } from "./routes/incidents.ts";
import { registerIntegrationRoutes } from "./routes/integrations.ts";import { registerMailboxRoutes } from "./routes/mailboxes.ts";
import { registerOverviewRoutes } from "./routes/overview.ts";
import { registerPeopleRoutes } from "./routes/people.ts";
import { registerProductRoutes } from "./routes/products.ts";
import { registerSessionRoutes } from "./routes/session.ts";
import { registerSubscriptionRoutes } from "./routes/subscriptions.ts";
import { registerWorkItemRoutes } from "./routes/work-items.ts";
import { registerWorkflowRoutes } from "./routes/workflows.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
    auth: Auth;
    env: Env;
  }
  interface FastifyRequest {
    correlationId: string;
    actor: import("@ranger/domain").AuthorizedActor | null;
  }
}

export async function buildApp(env: Env, pool: ReturnType<typeof createPool>): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });
  const auth = createAuth(pool, env);

  app.decorate("db", pool);
  app.decorate("auth", auth);
  app.decorate("env", env);

  await app.register(cors, {
    origin: localDevOrigins(env.WEB_ORIGIN),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-Id"],
  });

  app.addHook("onRequest", async (request, reply) => {
    request.correlationId = correlationIdFrom(request);
    request.actor = null;
    reply.header("x-request-id", request.correlationId);
  });

  app.addHook("preHandler", async (request, reply) => {
    const mutating = ["POST", "PATCH", "PUT", "DELETE"].includes(request.method);
    if (!mutating) {
      return;
    }
    if (request.url.startsWith("/api/auth")) {
      return;
    }
    const ok = isAllowedWebOrigin(
      typeof request.headers.origin === "string" ? request.headers.origin : undefined,
      typeof request.headers.referer === "string" ? request.headers.referer : undefined,
      env.WEB_ORIGIN,
    );
    if (!ok) {
      return sendError(reply, 403, "origin_forbidden", "Origin check failed", request.correlationId);
    }
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error, correlationId: request.correlationId }, "unhandled");
    if (reply.sent) {
      return;
    }
    return sendError(reply, 500, "internal_error", "Unexpected server error", request.correlationId);
  });

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const url = new URL(request.url, env.BETTER_AUTH_URL);
      const headers = fromNodeHeaders(request.headers);
      const init: RequestInit = {
        method: request.method,
        headers,
      };
      if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
        init.body = JSON.stringify(request.body);
      }
      const response = await auth.handler(new Request(url.toString(), init));
      reply.status(response.status);
      const cookies = response.headers.getSetCookie?.() ?? [];
      if (cookies.length > 0) {
        reply.header("set-cookie", cookies);
      }
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          return;
        }
        reply.header(key, value);
      });
      const text = await response.text();
      if (!text) {
        return reply.send(null);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return reply.send(JSON.parse(text) as unknown);
      }
      return reply.type(contentType || "text/plain").send(text);
    },
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    await pool.query("SELECT 1");
    return reply.send({ status: "ready", database: "ok" });
  });

  app.addHook("preHandler", async (request) => {
    if (request.url.startsWith("/api/v1")) {
      request.actor = await loadActor(request);
    }
  });

  await registerSessionRoutes(app);
  await registerCompanyRoutes(app);
  await registerOverviewRoutes(app);
  await registerFileRoutes(app);
  await registerDemoRoutes(app);
  await registerPeopleRoutes(app);
  await registerAccountRoutes(app);
  await registerProductRoutes(app);
  await registerSubscriptionRoutes(app);
  await registerGroupRoutes(app);
  await registerMailboxRoutes(app);
  await registerDeviceRoutes(app);
  await registerWorkItemRoutes(app);
  await registerWorkflowRoutes(app);
  await registerIncidentRoutes(app);
  await registerImportRoutes(app);
  await registerIntegrationRoutes(app);

  app.get("/api/v1/organization", async (request, reply) => {
    if (!request.actor) {
      return sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    }
    const organization = await getOrganization(pool, request.actor.organizationId);
    if (!organization) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    return {
      organization: {
        id: organization.id,
        name: organization.name,
        environment: organization.deployment_environment,
      },
    };
  });

  return app;
}
