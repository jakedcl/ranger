import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

export function correlationIdFrom(request: FastifyRequest): string {
  const incoming = request.headers["x-request-id"];
  if (typeof incoming === "string" && incoming.length > 0 && incoming.length < 128) {
    return incoming;
  }
  return randomUUID();
}

export async function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  correlationId: string,
) {
  return reply.status(status).send({
    error: { code, message, correlationId },
  });
}
