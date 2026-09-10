#!/usr/bin/env bash
#
# Seed avatars: upload images to Minio and insert records into PostgreSQL.
# Idempotent — skips avatars that already exist (matched by photo_key).
#
# Usage:
#   ./seeds/seed-avatars.sh
#
# Requires:
#   - mc (Minio Client) configured with alias "local" (or set MC_ALIAS)
#   - psql (PostgreSQL client)
#   - jq (JSON processor)
#   - .env file in the backend root (or DB_*/MINIO_* env vars)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AVATARS_DIR="$SCRIPT_DIR/avatars"
AVATARS_JSON="$SCRIPT_DIR/avatars.json"

# Load .env if exists
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a
  source "$BACKEND_DIR/.env"
  set +a
fi

# Config with defaults
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-makemelook}"
DB_USER="${DB_USER:-makemelook}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
MINIO_BUCKET="${MINIO_BUCKET:-makemelook}"
MC_ALIAS="${MC_ALIAS:-makemelook}"
MINIO_PREFIX="avatars"

export PGPASSWORD="$DB_PASSWORD"

# Check dependencies
for cmd in mc psql jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not installed." >&2
    exit 1
  fi
done

if [ ! -f "$AVATARS_JSON" ]; then
  echo "Error: $AVATARS_JSON not found" >&2
  exit 1
fi

echo "=== Seeding avatars ==="
echo "Minio bucket: $MINIO_BUCKET"
echo "DB: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""

COUNT=$(jq length "$AVATARS_JSON")
UPLOADED=0
SKIPPED=0

for i in $(seq 0 $((COUNT - 1))); do
  ROW=$(jq ".[$i]" "$AVATARS_JSON")
  FILE=$(echo "$ROW" | jq -r '.file')
  GENDER=$(echo "$ROW" | jq -r '.gender')
  FIGURE_TYPE=$(echo "$ROW" | jq -r '.figure_type')
  HEIGHT_MIN=$(echo "$ROW" | jq -r '.height_min')
  HEIGHT_MAX=$(echo "$ROW" | jq -r '.height_max')
  WEIGHT_MIN=$(echo "$ROW" | jq -r '.weight_min')
  WEIGHT_MAX=$(echo "$ROW" | jq -r '.weight_max')
  SIZE_EU=$(echo "$ROW" | jq -r '.size_eu')
  SORT_ORDER=$(echo "$ROW" | jq -r '.sort_order')

  PHOTO_KEY="$MINIO_PREFIX/$FILE"
  LOCAL_FILE="$AVATARS_DIR/$FILE"

  if [ ! -f "$LOCAL_FILE" ]; then
    echo "  SKIP $FILE (file not found)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check if avatar already exists in DB by photo_key
  EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM avatars WHERE photo_key = '$PHOTO_KEY' AND deleted_at IS NULL;")

  if [ "$EXISTS" -gt 0 ]; then
    echo "  SKIP $FILE (already in DB)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Upload to Minio
  echo "  Uploading $FILE to $MINIO_BUCKET/$PHOTO_KEY ..."
  mc cp "$LOCAL_FILE" "$MC_ALIAS/$MINIO_BUCKET/$PHOTO_KEY" --quiet

  # Insert into DB
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q <<SQL
INSERT INTO avatars (gender, figure_type, height_min, height_max, weight_min, weight_max, size_eu, photo_key, is_active, sort_order, created_at)
VALUES ('$GENDER', '$FIGURE_TYPE', $HEIGHT_MIN, $HEIGHT_MAX, $WEIGHT_MIN, $WEIGHT_MAX, '$SIZE_EU', '$PHOTO_KEY', true, $SORT_ORDER, NOW());
SQL

  echo "  OK $FILE"
  UPLOADED=$((UPLOADED + 1))
done

echo ""
echo "=== Done: $UPLOADED uploaded, $SKIPPED skipped (of $COUNT total) ==="
