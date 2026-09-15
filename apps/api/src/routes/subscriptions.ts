import {
  licenseAssignSchema,
  licenseEndSchema,
  licenseReassignSchema,
  subscriptionCreateSchema,
  subscriptionPatchSchema,
  subscriptionPriceVersionCreateSchema,
} from "@ranger/contracts";
import {
  appendPriceVersion,
  assignLicense,
  createSubscription,
  endLicenseAssignment,
  getLicenseAssignment,
  getProduct,
  getSubscription,
  insertAuditEvent,
  listLicenseAssignments,
  listPriceVersions,
  listSubscriptions,
  reassignLicense,
  updateSubscription,
  withTransaction,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import {
  toLicenseAssignment,
  toPriceVersion,
  toSubscription,
} from "../serialize-inventory.ts";

const nestedAssignSchema = z.object({
  personId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  startEffectiveDate: z.string().optional().nullable(),
  dateProvenance: z.string().max(200).optional().nullable(),
  source: z.string().min(1).max(100).optional(),
});

export async function registerSubscriptionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/subscriptions", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const subscriptions = await listSubscriptions(
        request.server.db,
        actor.organizationId,
        company.id,
      );
      return { subscriptions: subscriptions.map(toSubscription) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/subscriptions", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create subscriptions", request.correlationId);
    }
    const parsed = subscriptionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid subscription", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const subscription = await createSubscription(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data,
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "subscription.create",
        targetType: "subscription",
        targetId: subscription.id,
        summary: "Created subscription",
        correlationId: request.correlationId,
      });
      return reply.status(201).send({ subscription: toSubscription(subscription) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get("/api/v1/companies/:companyId/subscriptions/:subscriptionId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; subscriptionId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const subscription = await getSubscription(
        request.server.db,
        actor.organizationId,
        company.id,
        params.subscriptionId,
      );
      if (!subscription) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const priceVersions = await listPriceVersions(
        request.server.db,
        actor.organizationId,
        company.id,
        subscription.id,
      );
      const assignments = await listLicenseAssignments(
        request.server.db,
        actor.organizationId,
        company.id,
        { subscriptionId: subscription.id },
      );
      const product = await getProduct(
        request.server.db,
        actor.organizationId,
        subscription.product_id,
      );
      const mappedAssignments = assignments.map(toLicenseAssignment);
      const currentPrice = priceVersions[0] ? toPriceVersion(priceVersions[0]) : null;
      return {
        subscription: {
          ...toSubscription(subscription),
          productName: product?.name ?? null,
          assignments: mappedAssignments,
          assignedQuantity: mappedAssignments.filter(
            (row) => row.status === "active" || row.status === "removal_pending",
          ).length,
          currentUnitPrice: currentPrice?.unitPrice ?? null,
        },
        priceVersions: priceVersions.map(toPriceVersion),
        licenseAssignments: mappedAssignments,
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.patch("/api/v1/companies/:companyId/subscriptions/:subscriptionId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update subscriptions", request.correlationId);
    }
    const parsed = subscriptionPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid subscription update", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; subscriptionId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateSubscription(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        subscriptionId: params.subscriptionId,
        ...parsed.data,
      });
      if (!updated) {
        const existing = await getSubscription(
          request.server.db,
          actor.organizationId,
          company.id,
          params.subscriptionId,
        );
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(reply, 409, "conflict", "Subscription changed since you loaded it", request.correlationId);
      }
      return { subscription: toSubscription(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post(
    "/api/v1/companies/:companyId/subscriptions/:subscriptionId/price-versions",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot add price versions", request.correlationId);
      }
      const parsed = subscriptionPriceVersionCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid price version", request.correlationId);
      }
      try {
        const params = request.params as { companyId: string; subscriptionId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const version = await withTransaction(request.server.db, async (client) =>
          appendPriceVersion(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            subscriptionId: params.subscriptionId,
            ...parsed.data,
          }),
        );
        return reply.status(201).send({ priceVersion: toPriceVersion(version) });
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.post(
    "/api/v1/companies/:companyId/subscriptions/:subscriptionId/assignments",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot assign licenses", request.correlationId);
      }
      const parsed = nestedAssignSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid assignment", request.correlationId);
      }
      try {
        const params = request.params as { companyId: string; subscriptionId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const subscription = await getSubscription(
          request.server.db,
          actor.organizationId,
          company.id,
          params.subscriptionId,
        );
        if (!subscription) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const assignment = await withTransaction(request.server.db, async (client) =>
          assignLicense(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            personId: parsed.data.personId,
            accountId: parsed.data.accountId,
            productId: subscription.product_id,
            subscriptionId: subscription.id,
            startEffectiveDate: parsed.data.startEffectiveDate,
            dateProvenance: parsed.data.dateProvenance,
            source: parsed.data.source ?? "manual",
            actorStaffUserId: actor.staffUserId,
          }),
        );
        const mapped = toLicenseAssignment(assignment);
        return reply.status(201).send({ assignment: mapped, licenseAssignment: mapped });
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.post(
    "/api/v1/companies/:companyId/subscriptions/:subscriptionId/assignments/:assignmentId/end",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot end assignments", request.correlationId);
      }
      const parsed = licenseEndSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid end request", request.correlationId);
      }
      try {
        const params = request.params as {
          companyId: string;
          subscriptionId: string;
          assignmentId: string;
        };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const existing = await getLicenseAssignment(
          request.server.db,
          actor.organizationId,
          company.id,
          params.assignmentId,
        );
        if (!existing || existing.subscription_id !== params.subscriptionId) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        const assignment = await withTransaction(request.server.db, async (client) =>
          endLicenseAssignment(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            assignmentId: params.assignmentId,
            ...parsed.data,
            actorStaffUserId: actor.staffUserId,
          }),
        );
        const mapped = toLicenseAssignment(assignment);
        return { assignment: mapped, licenseAssignment: mapped };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.get("/api/v1/companies/:companyId/license-assignments", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const query = request.query as { personId?: string; subscriptionId?: string };
      const assignments = await listLicenseAssignments(
        request.server.db,
        actor.organizationId,
        company.id,
        query,
      );
      return { licenseAssignments: assignments.map(toLicenseAssignment) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/license-assignments", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot assign licenses", request.correlationId);
    }
    const parsed = licenseAssignSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid assignment", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const assignment = await withTransaction(request.server.db, async (client) =>
        assignLicense(client, {
          organizationId: actor.organizationId,
          companyId: company.id,
          ...parsed.data,
          actorStaffUserId: actor.staffUserId,
        }),
      );
      return reply.status(201).send({ licenseAssignment: toLicenseAssignment(assignment) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post(
    "/api/v1/companies/:companyId/license-assignments/:assignmentId/end",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot end assignments", request.correlationId);
      }
      const parsed = licenseEndSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid end request", request.correlationId);
      }
      try {
        const params = request.params as { companyId: string; assignmentId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const assignment = await withTransaction(request.server.db, async (client) =>
          endLicenseAssignment(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            assignmentId: params.assignmentId,
            ...parsed.data,
            actorStaffUserId: actor.staffUserId,
          }),
        );
        return { licenseAssignment: toLicenseAssignment(assignment) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.post(
    "/api/v1/companies/:companyId/license-assignments/:assignmentId/reassign",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot reassign", request.correlationId);
      }
      const parsed = licenseReassignSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid reassign request", request.correlationId);
      }
      try {
        const params = request.params as { companyId: string; assignmentId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const result = await withTransaction(request.server.db, async (client) =>
          reassignLicense(client, {
            organizationId: actor.organizationId,
            companyId: company.id,
            assignmentId: params.assignmentId,
            ...parsed.data,
            actorStaffUserId: actor.staffUserId,
          }),
        );
        return {
          ended: toLicenseAssignment(result.ended),
          created: toLicenseAssignment(result.created),
        };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );

  app.get(
    "/api/v1/companies/:companyId/license-assignments/:assignmentId",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      try {
        const params = request.params as { companyId: string; assignmentId: string };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const assignment = await getLicenseAssignment(
          request.server.db,
          actor.organizationId,
          company.id,
          params.assignmentId,
        );
        if (!assignment) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return { licenseAssignment: toLicenseAssignment(assignment) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );
}
