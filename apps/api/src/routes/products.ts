import { productCreateSchema, productPatchSchema } from "@ranger/contracts";
import {
  createProduct,
  getProduct,
  insertAuditEvent,
  listProducts,
  retireProduct,
  updateProduct,
} from "@ranger/db";
import { DomainError } from "@ranger/domain";
import type { FastifyInstance } from "fastify";
import { requireActor } from "../authz.ts";
import { sendError } from "../http.ts";
import { toProduct } from "../serialize-inventory.ts";

export async function registerProductRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/products", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const products = await listProducts(request.server.db, actor.organizationId);
    return { products: products.map(toProduct) };
  });

  app.post("/api/v1/products", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(reply, 403, "forbidden", "Only admins can edit the product catalog", request.correlationId);
    }
    const parsed = productCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid product", request.correlationId);
    }
    const product = await createProduct(request.server.db, {
      organizationId: actor.organizationId,
      ...parsed.data,
    });
    await insertAuditEvent(request.server.db, {
      organizationId: actor.organizationId,
      actorStaffUserId: actor.staffUserId,
      action: "product.create",
      targetType: "product",
      targetId: product.id,
      summary: `Created product ${product.name}`,
      correlationId: request.correlationId,
    });
    return reply.status(201).send({ product: toProduct(product) });
  });

  app.get("/api/v1/products/:productId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    const product = await getProduct(
      request.server.db,
      actor.organizationId,
      (request.params as { productId: string }).productId,
    );
    if (!product) {
      return sendError(reply, 404, "not_found", "Not found", request.correlationId);
    }
    return { product: toProduct(product) };
  });

  app.patch("/api/v1/products/:productId", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(reply, 403, "forbidden", "Only admins can edit the product catalog", request.correlationId);
    }
    const parsed = productPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "validation_error", "Invalid product update", request.correlationId);
    }
    const productId = (request.params as { productId: string }).productId;
    const updated = await updateProduct(request.server.db, {
      organizationId: actor.organizationId,
      productId,
      ...parsed.data,
    });
    if (!updated) {
      const existing = await getProduct(request.server.db, actor.organizationId, productId);
      if (!existing) {
        return sendError(reply, 404, "not_found", "Not found", request.correlationId);
      }
      return sendError(reply, 409, "conflict", "Product changed since you loaded it", request.correlationId);
    }
    return { product: toProduct(updated) };
  });

  app.post("/api/v1/products/:productId/retire", async (request, reply) => {
    const actor = await requireActor(request, reply);
    if (!actor) return;
    if (actor.role !== "admin") {
      return sendError(reply, 403, "forbidden", "Only admins can retire products", request.correlationId);
    }
    const body = request.body as { version?: number };
    if (typeof body?.version !== "number") {
      return sendError(reply, 400, "validation_error", "version is required", request.correlationId);
    }
    try {
      const productId = (request.params as { productId: string }).productId;
      const retired = await retireProduct(
        request.server.db,
        actor.organizationId,
        productId,
        body.version,
      );
      if (!retired) {
        const existing = await getProduct(request.server.db, actor.organizationId, productId);
        if (!existing) {
          return sendError(reply, 404, "not_found", "Not found", request.correlationId);
        }
        return sendError(reply, 409, "conflict", "Product could not be retired", request.correlationId);
      }
      return { product: toProduct(retired) };
    } catch (error) {
      if (error instanceof DomainError) {
        return sendError(reply, error.statusCode, error.code, error.message, request.correlationId);
      }
      throw error;
    }
  });
}
