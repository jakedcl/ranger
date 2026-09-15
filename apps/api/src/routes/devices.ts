import { deviceAssignSchema, deviceCreateSchema, devicePatchSchema } from "@ranger/contracts";
import {
  assignDevice,
  createDevice,
  getDevice,
  insertAuditEvent,
  listDeviceAssignments,
  listDevices,
  returnDeviceAssignment,
  updateDevice,
} from "@ranger/db";
import { canMutate, DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authorizeCompanyRead, requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toDevice, toDeviceAssignment } from "../serialize-inventory.ts";

const returnSchema = z.object({
  custodyDisposition: z.string().max(200).nullable().optional(),
  evidenceNote: z.string().max(4000).nullable().optional(),
});

export async function registerDeviceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/companies/:companyId/devices", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const devices = await listDevices(request.server.db, actor.organizationId, company.id);
      return { devices: devices.map(toDevice) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/devices", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot create devices", request.correlationId);
    }
    const parsed = deviceCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid device", request.correlationId);
    }
    try {
      const { company } = await authorizeCompanyRead(
        request,
        (request.params as { companyId: string }).companyId,
      );
      const device = await createDevice(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        ...parsed.data,
      });
      await insertAuditEvent(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        actorStaffUserId: actor.staffUserId,
        action: "device.create",
        targetType: "device",
        targetId: device.id,
        summary: `Created device ${device.asset_tag ?? device.serial ?? device.id}`,
        correlationId: request.correlationId,
      });
      return reply.status(201).send({ device: toDevice(device) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.get("/api/v1/companies/:companyId/devices/:deviceId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    try {
      const params = request.params as { companyId: string; deviceId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const device = await getDevice(
        request.server.db,
        actor.organizationId,
        company.id,
        params.deviceId,
      );
      if (!device) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      const assignments = await listDeviceAssignments(
        request.server.db,
        actor.organizationId,
        company.id,
        params.deviceId,
      );
      return { device: toDevice(device), assignments: assignments.map(toDeviceAssignment) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.patch("/api/v1/companies/:companyId/devices/:deviceId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot update devices", request.correlationId);
    }
    const parsed = devicePatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid device update", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; deviceId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const updated = await updateDevice(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        deviceId: params.deviceId,
        ...parsed.data,
      });
      if (!updated) {
        return sendError(reply, 409, "conflict", "Device changed or not found", request.correlationId);
      }
      return { device: toDevice(updated) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post("/api/v1/companies/:companyId/devices/:deviceId/assignments", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (!canMutate(actor, "manual")) {
      return sendError(reply, 403, "forbidden", "Viewers cannot assign devices", request.correlationId);
    }
    const parsed = deviceAssignSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid device assignment", request.correlationId);
    }
    try {
      const params = request.params as { companyId: string; deviceId: string };
      const { company } = await authorizeCompanyRead(request, params.companyId);
      const assignment = await assignDevice(request.server.db, {
        organizationId: actor.organizationId,
        companyId: company.id,
        deviceId: params.deviceId,
        ...parsed.data,
      });
      return reply.status(201).send({ assignment: toDeviceAssignment(assignment) });
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });

  app.post(
    "/api/v1/companies/:companyId/devices/:deviceId/assignments/:assignmentId/return",
    async (request, reply) => {
      const actor = await requireActor(request, reply);
      if (!actor) return;
      if (!canMutate(actor, "manual")) {
        return sendError(reply, 403, "forbidden", "Viewers cannot return devices", request.correlationId);
      }
      const parsed = returnSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return sendError(reply, 400, "validation_error", "Invalid return", request.correlationId);
      }
      try {
        const params = request.params as {
          companyId: string;
          deviceId: string;
          assignmentId: string;
        };
        const { company } = await authorizeCompanyRead(request, params.companyId);
        const assignment = await returnDeviceAssignment(request.server.db, {
          organizationId: actor.organizationId,
          companyId: company.id,
          assignmentId: params.assignmentId,
          ...parsed.data,
        });
        if (!assignment) {
          return sendError(reply, 404, "not_found", "Assignment not found", request.correlationId);
        }
        return { assignment: toDeviceAssignment(assignment) };
      } catch (error) {
        if (error instanceof DomainError) {
          return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
        }
        throw error;
      }
    },
  );
}
