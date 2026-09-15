import { describe, expect, it } from "vitest";
import { assertSameCompany, canMutate, filterCompaniesByGrant } from "./scope.ts";
import { ForbiddenError } from "./errors.ts";

const admin = {
  staffUserId: "a",
  organizationId: "o",
  role: "admin" as const,
  companyIds: [],
  automationExecute: true,
};

const technician = {
  staffUserId: "t",
  organizationId: "o",
  role: "technician" as const,
  companyIds: ["harbor"],
  automationExecute: false,
};

const viewer = {
  staffUserId: "v",
  organizationId: "o",
  role: "viewer" as const,
  companyIds: ["harbor"],
  automationExecute: false,
};

describe("authorization scope", () => {
  it("lets admins see every company and keeps technicians inside grants", () => {
    const companies = [{ id: "harbor" }, { id: "summit" }];
    expect(filterCompaniesByGrant(admin, companies)).toHaveLength(2);
    expect(filterCompaniesByGrant(technician, companies)).toEqual([{ id: "harbor" }]);
  });

  it("blocks viewer mutations and technician automation without an execute grant", () => {
    expect(canMutate(viewer, "manual")).toBe(false);
    expect(canMutate(technician, "manual")).toBe(true);
    expect(canMutate(technician, "automation")).toBe(false);
    expect(canMutate(admin, "automation")).toBe(true);
  });

  it("rejects mixed-company relationships", () => {
    expect(() => assertSameCompany("harbor", "summit")).toThrow(ForbiddenError);
  });
});
