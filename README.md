# RANGER

RANGER helps IT staff understand a person's digital setup, run joiner/leaver checklists, investigate failures, and keep evidence of what happened.

**Current milestone: M5** — verification and portfolio delivery. Live Microsoft Graph smoke remains **Blocked** without an authorized test tenant.

Authoritative specification: [RANGER-M0-M5-BUILD-SPEC.md](./RANGER-M0-M5-BUILD-SPEC.md) · Status: [docs/build-status.md](./docs/build-status.md)

## Quickstart

Prerequisites: Node.js 22+ (24 LTS preferred), PostgreSQL. Optional Postgres via Docker: `docker compose -f infra/compose.yaml up -d`.

```bash
cp .env.example .env
# set DATABASE_URL, BETTER_AUTH_SECRET (≥32 chars), SEED_STAFF_PASSWORD
createdb ranger_dev
createdb ranger_test
npm install
npm run setup
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) (localhost also accepted).

| Staff | Access |
|---|---|
| `admin@northstar.example` | Harbor, Cedar, Summit |
| `technician@northstar.example` | Harbor, Cedar |
| `viewer@northstar.example` | Harbor (read-only) |

Password: `SEED_STAFF_PASSWORD` in `.env`. Scenario clock for seed stories: **2026-09-30**.

Synthetic visitor demo: [/demo](http://127.0.0.1:5173/demo) (creates an isolated org — not live Graph).

## What works (demo)

- Manual inventory, capacity, costs, archive gate, CSV import
- Demo Microsoft read sync + lifecycle execute (synthetic)
- Onboarding / offboarding / status-change checklists
- Incidents, private evidence, related suggestions, escalation ZIP export

## What is blocked

- Live Graph inventory smoke and write actions (need tenant + disposable test user)
- Optional Microsoft audit collection
- Public hosted URL (local/container package is the deliverable unless you deploy)

## Walkthroughs

- [docs/demo-guide.md](./docs/demo-guide.md) — ~6 minute script
- [docs/walkthrough-m1.md](./docs/walkthrough-m1.md) · [m3](./docs/walkthrough-m3.md) · [m4](./docs/walkthrough-m4.md)

## Commands

| Command | Purpose |
|---|---|
| `npm run setup` | Migrate + seed |
| `npm run db:reset` | Drop app tables, migrate, seed |
| `npm run dev` | API, worker, web |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |
| `./scripts/backup-dev.sh` | DB + evidence backup |
| `./scripts/restore-dev.sh …` | Restore into a separate DB |
| `node scripts/perf-sample.mjs` | List latency sample (API must be up) |
| `node apps/api/scripts/demo-auth-events.mjs` | Demo JSONL emitter |

## Docs

| Doc | Topic |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | Boundaries |
| [docs/data-model.md](./docs/data-model.md) | Entities |
| [docs/microsoft-setup.md](./docs/microsoft-setup.md) | Demo vs live Graph |
| [docs/operations-runbook.md](./docs/operations-runbook.md) | Failures, backup, worker |
| [docs/security-and-limitations.md](./docs/security-and-limitations.md) | Isolation & non-goals |
| [docs/case-study.md](./docs/case-study.md) | Product narrative |
| [docs/verification/M5.md](./docs/verification/M5.md) | Acceptance matrix |

## Layout

`apps/web` · `apps/api` · `apps/worker` · `packages/{domain,db,contracts,integrations,test-fixtures}`
