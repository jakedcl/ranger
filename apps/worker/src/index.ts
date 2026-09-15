import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createPool, executeWorkflowRun, listConnectionsForScheduledSync, listRunnableWorkflows, runConnectionSync } from "@ranger/db";
import PgBoss from "pg-boss";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
config({ path: path.join(repoRoot, ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = createPool(connectionString);
const boss = new PgBoss({ connectionString, application_name: "ranger-worker" });

boss.on("error", (error) => {
  console.error("pg-boss error", error);
});

await boss.start();
await boss.createQueue("ranger.heartbeat");
await boss.createQueue("ranger.provider-sync");
await boss.createQueue("ranger.workflow");

await boss.schedule("ranger.heartbeat", "*/5 * * * *", { source: "worker" });
/** Every 15 minutes — demo + connected Microsoft inventory sync. */
await boss.schedule("ranger.provider-sync", "*/15 * * * *", { source: "worker" });
await boss.schedule("ranger.workflow", "* * * * *", { source: "worker" });

await boss.work("ranger.heartbeat", async (jobs) => {
  for (const job of jobs) {
    console.log("heartbeat", { id: job.id, at: new Date().toISOString() });
  }
});

await boss.work("ranger.provider-sync", async (jobs) => {
  for (const job of jobs) {
    const connections = await listConnectionsForScheduledSync(pool);
    console.log("provider-sync start", {
      jobId: job.id,
      connections: connections.length,
      at: new Date().toISOString(),
    });
    for (const connection of connections) {
      try {
        const result = await runConnectionSync(pool, {
          organizationId: connection.organization_id,
          companyId: connection.company_id,
          connectionId: connection.id,
          correlationId: `worker-${job.id}-${connection.id}`,
        });
        console.log("provider-sync connection", {
          connectionId: connection.id,
          companyId: connection.company_id,
          provider: connection.provider_kind,
          runs: result.runs,
        });
      } catch (error) {
        console.error("provider-sync failed", {
          connectionId: connection.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
});

await boss.work("ranger.workflow", async (jobs) => {
  for (const job of jobs) {
    const runs = await listRunnableWorkflows(pool);
    console.log("workflow start", { jobId: job.id, runs: runs.length });
    for (const run of runs) {
      try {
        await executeWorkflowRun(pool, {
          organizationId: run.organization_id,
          companyId: run.company_id,
          runId: run.id,
        });
      } catch (error) {
        console.error("workflow execute failed", {
          runId: run.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
});

console.log("RANGER worker started (heartbeat + provider-sync + workflow)");

const shutdown = async () => {
  await boss.stop({ graceful: true, timeout: 10_000 });
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
