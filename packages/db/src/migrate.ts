import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { applyMigrations } from "./migrations.ts";
import { createPool } from "./pool.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
config({ path: path.join(repoRoot, ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required");
}

const pool = createPool(url);
try {
  const applied = await applyMigrations(pool);
  console.log(applied.length === 0 ? "Migrations already applied." : `Applied: ${applied.join(", ")}`);
} finally {
  await pool.end();
}
