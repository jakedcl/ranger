#!/usr/bin/env bash
# Restore a RANGER backup into a TARGET database URL (preferably empty/separate).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BACKUP_DIR="${1:-}"
TARGET_URL="${2:-}"

if [[ -z "$BACKUP_DIR" || -z "$TARGET_URL" ]]; then
  echo "Usage: ./scripts/restore-dev.sh var/backups/<stamp> postgres://USER@127.0.0.1:5432/ranger_restore_dev" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_DIR/database.dump" ]]; then
  echo "Missing $BACKUP_DIR/database.dump" >&2
  exit 1
fi

echo "Restoring database dump into target…"
pg_restore --clean --if-exists --no-owner --dbname="$TARGET_URL" "$BACKUP_DIR/database.dump"

if [[ -d "$BACKUP_DIR/evidence" ]]; then
  mkdir -p "$ROOT/data/evidence"
  cp -R "$BACKUP_DIR/evidence/." "$ROOT/data/evidence/"
  echo "Evidence copied to data/evidence/ (point EVIDENCE_STORAGE_DIR here if needed)"
fi

echo "Restore complete. Point DATABASE_URL at the target to verify linked records."
