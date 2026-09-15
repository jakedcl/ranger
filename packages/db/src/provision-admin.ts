import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { SEED_ORGANIZATION_ID } from "@ranger/test-fixtures";
import { createPool } from "./pool.ts";
import { ensureStaffUser } from "./seed-data.ts";
import { withTransaction } from "./pool.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
config({ path: path.join(repoRoot, ".env") });

const url = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "RANGER Administrator";
if (!url || !email || !password) {
  throw new Error("DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD are required");
}

const pool = createPool(url);
try {
  await withTransaction(pool, async (client) => {
    const org = await client.query("SELECT id FROM organizations WHERE id = $1", [SEED_ORGANIZATION_ID]);
    if (!org.rows[0]) {
      throw new Error("Seed organization is missing. Run npm run db:migrate && npm run db:seed first.");
    }
    const userId = await ensureStaffUser(client, { email, name, password });
    await client.query(
      `INSERT INTO organization_memberships (organization_id, staff_user_id, role, active, automation_execute)
       VALUES ($1,$2,'admin',TRUE,TRUE)
       ON CONFLICT (organization_id, staff_user_id)
       DO UPDATE SET role = 'admin', active = TRUE, automation_execute = TRUE`,
      [SEED_ORGANIZATION_ID, userId],
    );
  });
  console.log(`Provisioned administrator ${email}`);
} finally {
  await pool.end();
}
