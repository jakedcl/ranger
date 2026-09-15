import { randomBytes } from "node:crypto";
import { cloneDemoWorkspace, countDemoCreatesSince, withTransaction } from "@ranger/db";
import type { FastifyInstance } from "fastify";
import { sendError } from "../http.ts";

const DEMO_TTL_MS = 8 * 60 * 60 * 1000;

async function copyAuthCookies(from: Response, reply: { header: (name: string, value: string) => unknown }) {
  const getSetCookie = from.headers.getSetCookie?.bind(from.headers);
  const cookies = getSetCookie ? getSetCookie() : [];
  if (cookies.length > 0) {
    reply.header("set-cookie", cookies.join(", "));
    for (const cookie of cookies) {
      reply.header("set-cookie", cookie);
    }
  } else {
    const single = from.headers.get("set-cookie");
    if (single) {
      reply.header("set-cookie", single);
    }
  }
}

export async function registerDemoRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/demo/sessions", async (request, reply) => {
    const recent = await countDemoCreatesSince(request.server.db, new Date(Date.now() - 60 * 60 * 1000));
    if (recent >= 20) {
      return sendError(
        reply,
        429,
        "rate_limited",
        "Demo creation is temporarily limited. Try again later.",
        request.correlationId,
      );
    }

    const staffPassword = `demo-${randomBytes(18).toString("hex")}`;
    const created = await withTransaction(request.server.db, (client) =>
      cloneDemoWorkspace(client, {
        staffPassword,
        expiresAt: new Date(Date.now() + DEMO_TTL_MS),
      }),
    );

    const signIn = new Request(`${request.server.env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: request.server.env.WEB_ORIGIN,
        cookie: "",
      },
      body: JSON.stringify({ email: created.email, password: staffPassword }),
    });
    const authResponse = await request.server.auth.handler(signIn);
    await copyAuthCookies(authResponse, reply);

    return {
      environment: "demo",
      organizationId: created.organizationId,
      email: created.email,
      expiresInHours: 8,
    };
  });

  app.get("/api/v1/search", async (request, reply) => {
    const actor = request.actor;
    if (!actor) {
      return sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    }
    const q = String((request.query as { q?: string }).q ?? "").trim().toLowerCase();
    if (!q) {
      return { results: [] };
    }
    const { listCompaniesForOrganization, getOrganization } = await import("@ranger/db");
    const organization = await getOrganization(request.server.db, actor.organizationId);
    const companies = await listCompaniesForOrganization(request.server.db, actor.organizationId);
    const visible =
      actor.role === "admin"
        ? companies
        : companies.filter((company) => actor.companyIds.includes(company.id));
    return {
      results: visible
        .filter((company) => company.name.toLowerCase().includes(q) || company.slug.includes(q))
        .map((company) => ({
          type: "company",
          id: company.id,
          title: company.name,
          company: company.name,
          environment: organization?.deployment_environment ?? "demo",
        })),
    };
  });
}
