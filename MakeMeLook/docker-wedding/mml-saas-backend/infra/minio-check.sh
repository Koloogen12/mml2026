#!/usr/bin/env bash
#
# Minio health check & bucket provisioning for MakeMeLook.
# Creates missing buckets and sets anonymous download policies.
#
# Reads MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY from ../.env
#
# Usage:
#   ./minio-check.sh              # uses default alias "makemelook"
#   ./minio-check.sh myalias      # uses custom mc alias
#
set -euo pipefail

ALIAS="${1:-makemelook}"

# ── Load .env ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Error: .env file not found at ${ENV_FILE}"
  exit 1
fi

# Read MINIO_* vars from .env (source only MINIO_ variables)
eval "$(grep -E '^MINIO_(ENDPOINT|ACCESS_KEY|SECRET_KEY|USE_SSL)=' "${ENV_FILE}")"

if [ -z "${MINIO_ENDPOINT:-}" ] || [ -z "${MINIO_ACCESS_KEY:-}" ] || [ -z "${MINIO_SECRET_KEY:-}" ]; then
  echo "Error: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY must be set in .env"
  exit 1
fi

# Build endpoint URL
if [ "${MINIO_USE_SSL:-false}" = "true" ]; then
  MINIO_URL="https://${MINIO_ENDPOINT}"
else
  MINIO_URL="http://${MINIO_ENDPOINT}"
fi

# ── Bucket definitions ───────────────────────────────────────────────────────
# Format: "bucket_name:policy"
#   policy = "download" (public read) or "none" (private)
BUCKETS=(
  "makemelook:download"
  "product-photos:download"
  "user-avatars:none"
  "project-logos:download"
  "widget-logos:download"
)

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

# ── Pre-flight ───────────────────────────────────────────────────────────────
if ! command -v mc &>/dev/null; then
  fail "mc (Minio Client) not found in PATH"
  exit 1
fi

echo "Minio check — alias: ${ALIAS}"
echo ""

# Set up mc alias from .env
echo "1. Connectivity (${MINIO_URL})"
echo "   endpoint: ${MINIO_URL}"
echo "   user: ${MINIO_ACCESS_KEY}"
mc alias set "${ALIAS}" "${MINIO_URL}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"

if mc ls "${ALIAS}" 2>&1; then
  ok "Minio is reachable"
else
  fail "Cannot connect to Minio at ${MINIO_URL}"
  exit 1
fi

# ── Buckets ──────────────────────────────────────────────────────────────────
echo ""
echo "2. Buckets"

EXISTING=$(mc ls "${ALIAS}" 2>/dev/null | awk '{print $NF}' | tr -d '/')
CREATED=0
SKIPPED=0

for entry in "${BUCKETS[@]}"; do
  BUCKET="${entry%%:*}"
  POLICY="${entry##*:}"

  if echo "${EXISTING}" | grep -qx "${BUCKET}"; then
    ok "${BUCKET} — exists"
  else
    warn "${BUCKET} — missing, creating..."
    mc mb "${ALIAS}/${BUCKET}"
    ok "${BUCKET} — created"
    ((CREATED++))
  fi
done

# ── Anonymous policies ───────────────────────────────────────────────────────
echo ""
echo "3. Anonymous access policies"

for entry in "${BUCKETS[@]}"; do
  BUCKET="${entry%%:*}"
  POLICY="${entry##*:}"

  CURRENT=$(mc anonymous get "${ALIAS}/${BUCKET}" 2>/dev/null || true)

  if [ "${POLICY}" = "download" ]; then
    if echo "${CURRENT}" | grep -qi "download"; then
      ok "${BUCKET} — public read"
    else
      warn "${BUCKET} — setting public read..."
      mc anonymous set download "${ALIAS}/${BUCKET}"
      ok "${BUCKET} — public read set"
    fi
  else
    if echo "${CURRENT}" | grep -qi "none\|Access permission.*none"; then
      ok "${BUCKET} — private"
    else
      ok "${BUCKET} — private (default)"
    fi
  fi
done

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Done. Buckets created: ${CREATED}"
