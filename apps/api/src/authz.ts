import { DomainError, type AuthorizedActor } from "@ranger/domain";
import {
  getCompany,
  getFileObject,
  getMembership,
  listCompaniesForOrganization,
  listCompanyGrantIds,
} from "@ranger/db";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "./http.ts";

declare module "fastify" {
  interface FastifyRequest {
    correlationId: string;
    actor: AuthorizedActor | null;
  }
}

export async function loadActor(request: FastifyRequest): Promise<AuthorizedActor | null> {
  const session = await request.server.auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session?.user) {
    return null;
  }

  const membership = await getMembership(request.server.db, session.user.id);
  if (!membership) {
    return null;
  }

  const companyIds =
    membership.role === "admin"
      ? (await listCompaniesForOrganization(request.server.db, membership.organization_id)).map(
          (company) => company.id,
        )
      : await listCompanyGrantIds(
          request.server.db,
          membership.organization_id,
          membership.staff_user_id,
        );

  return {
    staffUserId: membership.staff_user_id,
    organizationId: membership.organization_id,
    role: membership.role,
    companyIds,
    automationExecute: membership.automation_execute,
  };
}

export async function requireActor(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthorizedActor | null> {
  const actor = request.actor ?? (await loadActor(request));
  request.actor = actor;
  if (!actor) {
    await sendError(reply, 401, "unauthenticated", "Sign in required", request.correlationId);
    return null;
  }
  return actor;
}

export async function authorizeCompanyRead(
  request: FastifyRequest,
  companyId: string,
) {
  const actor = request.actor;
  if (!actor) {
    throw new DomainError("Sign in required", "unauthenticated", 401);
  }
  const company = await getCompany(request.server.db, actor.organizationId, companyId);
  if (!company) {
    throw new DomainError("Not found", "not_found", 404);
  }
  if (actor.role !== "admin" && !actor.companyIds.includes(companyId)) {
    throw new DomainError("Not found", "not_found", 404);
  }
  return { actor, company };
}

export async function authorizePrivateDownload(
  request: FastifyRequest,
  fileId: string,
) {
  const actor = request.actor;
  if (!actor) {
    throw new DomainError("Sign in required", "unauthenticated", 401);
  }
  const file = await getFileObject(request.server.db, actor.organizationId, fileId);
  if (!file) {
    throw new DomainError("Not found", "not_found", 404);
  }
  if (actor.role !== "admin" && !actor.companyIds.includes(file.company_id)) {
    throw new DomainError("Not found", "not_found", 404);
  }
  return file;
}
