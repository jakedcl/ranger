# Architecture

RANGER is one web app, one API, one worker, and PostgreSQL.

```text
┌─────────────┐     cookie/session      ┌──────────────────┐
│  apps/web   │ ───────────────────────▶│  apps/api        │
│  Vite/React │◀── JSON /api/v1 ───────│  Fastify         │
└─────────────┘                         └────────┬─────────┘
                                                 │ SQL
                                                 ▼
                                        ┌──────────────────┐
                                        │   PostgreSQL     │
                                        │  + pg-boss jobs  │
                                        └────────▲─────────┘
                                                 │
                                        ┌────────┴─────────┐
                                        │  apps/worker     │
                                        │  sync/workflow   │
                                        └──────────────────┘

Provider adapters (packages/integrations):
  demo ── fixtures / synthetic lifecycle (no live Graph)
  microsoft ── Graph reads/writes only when credentials + consent exist

Credentials: environment / secret manager only — never the browser.
Private evidence files: data/evidence/ (or EVIDENCE_STORAGE_DIR)
```

## Boundaries

- Authorization is enforced in API queries and mutation services, not by hiding navigation.
- Demo visitor workspaces (`/demo`) are isolated orgs cloned from the seed shell; they are not live Microsoft tenants.
- Worker owns durable sync and workflow execution; API enqueues and records evidence.

See [decisions/0001-architecture.md](./decisions/0001-architecture.md), [data-model.md](./data-model.md), [microsoft-setup.md](./microsoft-setup.md).
