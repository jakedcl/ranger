#!/usr/bin/env node
/**
 * Lightweight list latency sample against a running API (M5 P03).
 * Usage: node scripts/perf-sample.mjs
 * Requires: npm run dev, seeded DB, SEED_STAFF_PASSWORD in .env
 */
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

function env(key) {
  const line = readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : process.env[key];
}

const origin = env("WEB_ORIGIN") || "http://127.0.0.1:5173";
const api = `http://${env("API_HOST") || "127.0.0.1"}:${env("API_PORT") || "4000"}`;
const password = env("SEED_STAFF_PASSWORD");
const email = "admin@northstar.example";

async function main() {
  const signIn = await fetch(`${api}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password }),
  });
  if (!signIn.ok) {
    console.error("Sign-in failed", signIn.status, await signIn.text());
    process.exit(1);
  }
  const cookie = signIn.headers.getSetCookie?.().join("; ") || signIn.headers.get("set-cookie") || "";

  const companies = await fetch(`${api}/api/v1/companies`, {
    headers: { cookie, origin },
  }).then((r) => r.json());
  const harbor = companies.companies.find((c) => c.slug === "harbor-architecture") || companies.companies[0];

  async function timed(label, url) {
    const t0 = performance.now();
    const res = await fetch(url, { headers: { cookie, origin } });
    const ms = performance.now() - t0;
    const body = await res.json().catch(() => ({}));
    const size = JSON.stringify(body).length;
    console.log(`${label}\t${res.status}\t${ms.toFixed(1)}ms\t~${size}B`);
  }

  console.log(`API ${api}`);
  console.log(`Fixture: Northstar seed · company ${harbor?.name}`);
  console.log("label\tstatus\tlatency\tbody");
  await timed("companies", `${api}/api/v1/companies`);
  await timed("people", `${api}/api/v1/companies/${harbor.id}/people`);
  await timed("incidents", `${api}/api/v1/companies/${harbor.id}/incidents`);
  await timed("overview", `${api}/api/v1/overview`);
  console.log("Record hardware/OS separately when filing verification/M5.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
