import { createPool } from "@ranger/db";
import type { FastifyInstance } from "fastify";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./app.ts";
import { loadEnv } from "./env.ts";

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

let appPromise: Promise<FastifyInstance> | null = null;

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    const env = loadEnv();
    const pool = createPool(env.DATABASE_URL);
    appPromise = buildApp(env, pool);
  }
  return appPromise;
}

/**
 * Vercel Node serverless entry — same Fastify app as local `index.ts`.
 * Static Vite assets are served separately; this only handles /api, /health, /ready.
 */
const handler: NodeHandler = async (req, res) => {
  const app = await getApp();
  await app.ready();
  app.server.emit("request", req, res);
};

export default handler;
