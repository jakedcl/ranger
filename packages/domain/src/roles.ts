export type StaffRole = "admin" | "technician" | "viewer";
export type DeploymentEnvironment = "demo" | "private" | "live";
export type MutationKind = "read" | "manual" | "automation" | "admin" | "download";

export const STAFF_ROLES: readonly StaffRole[] = ["admin", "technician", "viewer"];

export function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}
