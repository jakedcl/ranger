#!/usr/bin/env bash
# One-time: push Neon + auth secrets into the linked Vercel project.
# Usage:
#   export DATABASE_URL='postgresql://...@...neon.tech/neondb?sslmode=require'
#   export BETTER_AUTH_SECRET='...'   # openssl rand -base64 32
#   export SEED_STAFF_PASSWORD='...'  # must match the password used when seeding Neon
#   ./scripts/push-vercel-env.sh
set -euo pipefail

PROD_URL="${WEB_ORIGIN:-https://ranger-nu-seven.vercel.app}"

: "${DATABASE_URL:?Set DATABASE_URL to the Neon pooled connection string}"
: "${BETTER_AUTH_SECRET:?Set BETTER_AUTH_SECRET (min 32 chars)}"
: "${SEED_STAFF_PASSWORD:?Set SEED_STAFF_PASSWORD to the Neon seed password}"

for env in production preview development; do
  printf '%s' "$DATABASE_URL" | npx vercel env add DATABASE_URL "$env" --force --yes
  printf '%s' "$BETTER_AUTH_SECRET" | npx vercel env add BETTER_AUTH_SECRET "$env" --force --yes
  printf '%s' "$PROD_URL" | npx vercel env add BETTER_AUTH_URL "$env" --force --yes
  printf '%s' "$PROD_URL" | npx vercel env add WEB_ORIGIN "$env" --force --yes
  printf '%s' "$SEED_STAFF_PASSWORD" | npx vercel env add SEED_STAFF_PASSWORD "$env" --force --yes
  printf '%s' "${RANGER_MODE:-demo}" | npx vercel env add RANGER_MODE "$env" --force --yes
  printf '%s' "${EVIDENCE_STORAGE_DIR:-/tmp/ranger-evidence}" | npx vercel env add EVIDENCE_STORAGE_DIR "$env" --force --yes
done

npx vercel env ls
echo "Done. Redeploy with: npx vercel deploy --prod --yes"
