#!/usr/bin/env node
/**
 * Local demo event emitter for M4 (spec §M4.3).
 * Emits JSONL: normal auth → config change → auth error burst → recovery.
 * Independent of paid services. Does not talk to Microsoft.
 *
 * Usage:
 *   node apps/api/scripts/demo-auth-events.mjs
 *   node apps/api/scripts/demo-auth-events.mjs > samples/demo-auth-events.jsonl
 */
const now = Date.parse("2026-09-30T15:00:00.000Z");

function line(offsetSec, payload) {
  const timestamp = new Date(now + offsetSec * 1000).toISOString();
  return JSON.stringify({ timestamp, service: "ranger-demo-auth", correlationId: "demo-corr-harbor-001", ...payload });
}

const events = [
  line(0, { level: "info", message: "auth.ok", user: "alex.rivera@harbor.example" }),
  line(5, { level: "info", message: "auth.ok", user: "casey.nguyen@harbor.example" }),
  line(30, {
    level: "info",
    message: "config.changed",
    change: "conditional_access_policy",
    actor: "northstar-admin",
  }),
  line(45, { level: "error", errorCode: "AuthFailed", message: "token exchange rejected", user: "alex.rivera@harbor.example" }),
  line(46, { level: "error", errorCode: "AuthFailed", message: "token exchange rejected", user: "jordan.blake@cedar.example" }),
  line(47, { level: "error", errorCode: "AuthFailed", message: "token exchange rejected", user: "alex.rivera@harbor.example" }),
  line(120, {
    level: "info",
    message: "config.changed",
    change: "conditional_access_policy_rollback",
    actor: "northstar-admin",
  }),
  line(130, { level: "info", message: "auth.ok", user: "alex.rivera@harbor.example" }),
];

for (const event of events) {
  process.stdout.write(`${event}\n`);
}
