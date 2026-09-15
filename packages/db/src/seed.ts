import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createPool } from "./pool.ts";
import { seedPrivateDevelopment } from "./seed-data.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
config({ path: path.join(repoRoot, ".env") });

const url = process.env.DATABASE_URL;
const password = process.env.SEED_STAFF_PASSWORD;
if (!url) {
  throw new Error("DATABASE_URL is required");
}
if (!password) {
  throw new Error("SEED_STAFF_PASSWORD is required");
}

const pool = createPool(url);
try {
  await seedPrivateDevelopment(pool, password);
  console.log("Seeded Northstar IT — Demo with Harbor, Cedar, and Summit.");
} finally {
  await pool.end();
}
