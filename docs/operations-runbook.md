# Operations runbook

Synthetic demo and private development. Live Microsoft actions remain blocked until an authorized tenant is configured.

## Failed sync

1. Open company → **Integrations**.
2. Check connection status and last sync run error.
3. Demo adapter: use **Sync now** after toggling recovery if the connection was marked failed.
4. Live adapter (when configured): confirm `MICROSOFT_*` env vars, tenant consent, and app permissions. Missing credentials must fail clearly — never silently fall back to demo data on a live-labeled connection.

## Expired / revoked consent

- Inventory reads should surface insufficient-permission or connection-failed errors.
- Queued workflow Graph steps that lose automation permission after queue must not execute writes.
- Re-consent / rotate secrets outside RANGER; store only `credential_ref` names in connection rows.

## Failed workflow step

1. Open **Automations** → run → failed step evidence/error.
2. Fix the underlying cause (capacity, binding, manual mailbox).
3. **Retry** only failed steps — successful creates must not duplicate (reconcile by UPN/external id).
4. Optional: **Create incident** from the failed step for investigation handoff.

## Incomplete offboarding

1. Person shows **Departed** + `offboarding_in_progress` while cleanup runs.
2. Complete Graph/demo steps and manual mailbox evidence.
3. **Archive readiness** remains blocked until obligations clear — no force archive.
4. Cancel stops future steps; completed work is not rolled back.

## Evidence export

1. Incident → select evidence (prefer redacted derivatives) → **Export**.
2. ZIP contains `report.md`, `manifest.json`, and selected attachments under `data/evidence/`.
3. Viewers cannot export. Downloads require current company authorization.

## Backup

```bash
./scripts/backup-dev.sh
```

Creates a timestamped directory under `var/backups/` with:

- `database.dump` — `pg_dump` custom format
- `evidence/` — copy of `data/evidence` when present
- `README.txt` — restore hint

## Restore (separate database)

```bash
createdb ranger_restore_dev   # example target
./scripts/restore-dev.sh var/backups/<stamp> postgres://USER@127.0.0.1:5432/ranger_restore_dev
```

Verify people, incidents, and evidence downloads still resolve. Do not restore over a live tenant database as a casual operation.

## Worker restart

pg-boss jobs for `ranger.sync` / `ranger.workflow` are durable in PostgreSQL. Restart the worker process; in-flight steps should resume without duplicating succeeded Graph/demo operations (covered by workflow integration tests).

## Demo reset

```bash
npm run db:reset
```

Drops app tables, migrates, and reseeds Northstar. Does not touch live Microsoft tenants. Visitor `/demo` workspaces are separate orgs — purge via SQL or reset.
