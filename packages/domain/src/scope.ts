import { ForbiddenError, NotFoundError } from "./errors.ts";
import type { MutationKind, StaffRole } from "./roles.ts";

export type AuthorizedActor = {
  staffUserId: string;
  organizationId: string;
  role: StaffRole;
  companyIds: string[];
  automationExecute: boolean;
};

export function canAccessCompany(actor: AuthorizedActor, companyId: string): boolean {
  if (actor.role === "admin") {
    return true;
  }
  return actor.companyIds.includes(companyId);
}

export function requireCompanyAccess(actor: AuthorizedActor, companyId: string): void {
  if (!canAccessCompany(actor, companyId)) {
    throw new NotFoundError();
  }
}

export function canMutate(actor: AuthorizedActor, kind: MutationKind): boolean {
  if (kind === "read") {
    return true;
  }
  if (kind === "download") {
    return actor.role !== "viewer";
  }
  if (actor.role === "viewer") {
    return false;
  }
  if (kind === "admin") {
    return actor.role === "admin";
  }
  if (kind === "automation") {
    return actor.role === "admin" || actor.automationExecute;
  }
  return actor.role === "admin" || actor.role === "technician";
}

export function requireMutation(actor: AuthorizedActor, kind: MutationKind): void {
  if (!canMutate(actor, kind)) {
    throw new ForbiddenError();
  }
}

export function assertSameCompany(parentCompanyId: string, childCompanyId: string): void {
  if (parentCompanyId !== childCompanyId) {
    throw new ForbiddenError("Cross-company relationship is not allowed");
  }
}

export function assertCompatibleOrganization(
  parentOrganizationId: string,
  childOrganizationId: string,
): void {
  if (parentOrganizationId !== childOrganizationId) {
    throw new ForbiddenError("Cross-organization relationship is not allowed");
  }
}

export function filterCompaniesByGrant<T extends { id: string }>(
  actor: AuthorizedActor,
  companies: T[],
): T[] {
  if (actor.role === "admin") {
    return companies;
  }
  const allowed = new Set(actor.companyIds);
  return companies.filter((company) => allowed.has(company.id));
}
