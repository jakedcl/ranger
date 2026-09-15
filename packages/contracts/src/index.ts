import { z } from "zod";

export const staffRoleSchema = z.enum(["admin", "technician", "viewer"]);
export const deploymentEnvironmentSchema = z.enum(["demo", "private", "live"]);

export const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    correlationId: z.string(),
  }),
});

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: staffRoleSchema,
  organizationId: z.string(),
  organizationName: z.string(),
  environment: deploymentEnvironmentSchema,
  companyIds: z.array(z.string()),
  automationExecute: z.boolean(),
});

export const companySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  domains: z.array(z.string()),
  itContactName: z.string().nullable(),
  itContactEmail: z.string().nullable(),
  itNotes: z.string().nullable(),
  environment: deploymentEnvironmentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export const companyPatchSchema = z.object({
  itNotes: z.string().max(4000).nullable(),
  version: z.number().int(),
});

export const overviewSchema = z.object({
  organization: z.object({
    id: z.string(),
    name: z.string(),
    environment: deploymentEnvironmentSchema,
  }),
  companyScope: z.string().nullable(),
  companies: z.array(companySchema),
  asOf: z.string().optional(),
  queues: z.object({
    failedWorkflowSteps: z.number().int(),
    peopleOffboarding: z.number().int(),
    upcomingContractorReviews: z.number().int(),
    staleConnections: z.number().int(),
    openIncidents: z.number().int(),
  }),
  lifecycle: z
    .object({
      startsSoon: z.array(z.record(z.string(), z.unknown())),
      leavesSoon: z.array(z.record(z.string(), z.unknown())),
      offboarding: z.array(z.record(z.string(), z.unknown())),
      waitingRuns: z.array(z.record(z.string(), z.unknown())),
      activeSeats: z.array(z.record(z.string(), z.unknown())),
    })
    .optional(),
  laterMilestones: z.array(
    z.object({
      section: z.string(),
      status: z.enum(["not_implemented", "partial"]),
      message: z.string(),
    }),
  ),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type Company = z.infer<typeof companySchema>;
export type CompanyPatch = z.infer<typeof companyPatchSchema>;
export type Overview = z.infer<typeof overviewSchema>;

export * from "./inventory.ts";
export * from "./provider-sync.ts";
