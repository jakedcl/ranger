import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool } from "@ranger/db";
import { config } from "dotenv";
import { buildApp } from "./app.ts";
import { loadEnv } from "./env.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
config({ path: path.join(repoRoot, ".env") });

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const app = await buildApp(env, pool);

const shutdown = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: env.API_HOST, port: env.API_PORT });
