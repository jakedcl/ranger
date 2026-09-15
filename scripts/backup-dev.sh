#!/usr/bin/env bash
# Backup local RANGER Postgres + evidence for M5 operational verification.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  # Load only KEY=VALUE lines (ignore comments / tips)
  DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (set in env or .env)" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$ROOT/var/backups/$STAMP"
mkdir -p "$OUT/evidence"

echo "Dumping database…"
pg_dump --format=custom --file="$OUT/database.dump" "$DATABASE_URL"

if [[ -d "$ROOT/data/evidence" ]]; then
  echo "Copying evidence…"
  cp -R "$ROOT/data/evidence/." "$OUT/evidence/" || true
fi

cat >"$OUT/README.txt" <<EOF
RANGER backup $STAMP
Restore with: ./scripts/restore-dev.sh $OUT <TARGET_DATABASE_URL>
Evidence path after restore: set EVIDENCE_STORAGE_DIR or copy evidence/ → data/evidence/
EOF

echo "Backup written to $OUT"
