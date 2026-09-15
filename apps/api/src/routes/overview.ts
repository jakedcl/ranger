import {
  countOpenIncidents,
  countPeopleOffboarding,
  countStaleConnections,
  countUpcomingLifecycleReviews,
  countWaitingWorkflowSteps,
  getOrganization,
  listCompaniesForOrganization,
  listLifecycleBoard,
} from "@ranger/db";
import { intervalProgress } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toCompany } from "../serialize.ts";

/** Demo seed clock — duration math for overview uses this, not wall clock. */
const AS_OF = "2026-09-30";

export async function registerOverviewRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/overview", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) {
      return;
    }
    const organization = await getOrganization(request.server.db, actor.organizationId);
    if (!organization) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const query = request.query as { companyId?: string };
    if (query.companyId && actor.role !== "admin" && !actor.companyIds.includes(query.companyId)) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const companies = await listCompaniesForOrganization(request.server.db, actor.organizationId);
    const visible =
      actor.role === "admin"
        ? companies
        : companies.filter((company) => actor.companyIds.includes(company.id));
    const scoped = query.companyId ? visible.filter((company) => company.id === query.companyId) : visible;
    if (query.companyId && scoped.length === 0) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    const companyIds = scoped.map((company) => company.id);
    const [staleConnections, failedWorkflowSteps, peopleOffboarding, upcomingReviews, board, openIncidents] =
      await Promise.all([
        countStaleConnections(request.server.db, actor.organizationId, companyIds),
        countWaitingWorkflowSteps(request.server.db, actor.organizationId, companyIds),
        countPeopleOffboarding(request.server.db, actor.organizationId, companyIds),
        countUpcomingLifecycleReviews(request.server.db, actor.organizationId, companyIds, AS_OF),
        listLifecycleBoard(request.server.db, actor.organizationId, companyIds, AS_OF),
        countOpenIncidents(request.server.db, actor.organizationId, companyIds),
      ]);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        environment: organization.deployment_environment,
      },
      companyScope: query.companyId ?? null,
      companies: scoped.map((company) => toCompany(company, organization.deployment_environment)),
      asOf: AS_OF,
      queues: {
        failedWorkflowSteps,
        peopleOffboarding,
        upcomingContractorReviews: upcomingReviews,
        staleConnections,
        openIncidents,
      },
      lifecycle: {
        startsSoon: board.startsSoon.map((p) => ({
          id: p.id,
          companyId: p.company_id,
          companyName: p.company_name,
          displayName: p.display_name,
          itStatus: p.it_status,
          workflowBadge: p.workflow_badge,
          startDate: p.start_date,
          endDate: p.end_date,
          timing: intervalProgress({ start: p.start_date, end: p.end_date, asOf: AS_OF }).summary,
        })),
        leavesSoon: board.leavesSoon.map((p) => ({
          id: p.id,
          companyId: p.company_id,
          companyName: p.company_name,
          displayName: p.display_name,
          itStatus: p.it_status,
          workflowBadge: p.workflow_badge,
          startDate: p.start_date,
          endDate: p.end_date,
          timing: intervalProgress({ start: p.start_date, end: p.end_date, asOf: AS_OF }).summary,
        })),
        offboarding: board.offboarding.map((p) => ({
          id: p.id,
          companyId: p.company_id,
          companyName: p.company_name,
          displayName: p.display_name,
          itStatus: p.it_status,
          workflowBadge: p.workflow_badge,
          startDate: p.start_date,
          endDate: p.end_date,
          timing: intervalProgress({ start: p.start_date, end: p.end_date, asOf: AS_OF }).summary,
        })),
        waitingRuns: board.waitingRuns.map((r) => ({
          id: r.id,
          companyId: r.company_id,
          companyName: r.company_name,
          personId: r.person_id,
          personName: r.person_name,
          kind: r.kind,
          status: r.status,
          createdAt: r.created_at.toISOString(),
        })),
        activeSeats: board.activeAssignments.map((a) => ({
          id: a.id,
          companyId: a.company_id,
          companyName: a.company_name,
          personId: a.person_id,
          personName: a.person_name,
          productName: a.product_name,
          status: a.status,
          startDate: a.start_effective_date,
          endDate: a.end_effective_date,
          timing: intervalProgress({
            start: a.start_effective_date,
            end: a.end_effective_date,
            asOf: AS_OF,
          }).summary,
        })),
      },
      laterMilestones: [
        {
          section: "Incidents",
          status: "not_implemented" as const,
          message: "Investigations stay out of this joiner/leaver board until reviewed.",
        },
      ],
    };
  });
}
