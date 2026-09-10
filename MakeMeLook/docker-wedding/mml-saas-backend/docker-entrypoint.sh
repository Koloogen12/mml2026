#!/bin/sh
# =============================================================================
# docker-entrypoint.sh — wait for Postgres, run migrations, start server.
# Relies on DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME from /app/.env
# (godotenv.Load() in config.go reads from the CWD).
# =============================================================================
set -e

cd /app

# --- load env so we can use DB_* vars in this script too ---
if [ -f /app/.env ]; then
  # export every KEY=VALUE line except comments/blank
  set -a
  . /app/.env
  set +a
fi

: "${DB_HOST:=postgres}"
: "${DB_PORT:=5432}"
: "${DB_USER:=makemelook}"
: "${DB_PASSWORD:=makemelook}"
: "${DB_NAME:=makemelook}"

echo "[entrypoint] waiting for postgres at ${DB_HOST}:${DB_PORT}..."
i=0
until PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c 'select 1' >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then
    echo "[entrypoint] ERROR: postgres not reachable after 60s" >&2
    exit 1
  fi
  sleep 1
done
echo "[entrypoint] postgres is up"

DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

echo "[entrypoint] running migrations..."
migrate -path /app/migrations -database "$DB_URL" up || {
  rc=$?
  # migrate exits 0 when "no change". Any other non-zero = real error.
  echo "[entrypoint] migrate exit=$rc"
  if [ "$rc" -ne 0 ]; then
    # Try graceful continue if error is "no change"
    echo "[entrypoint] checking migration status..."
    migrate -path /app/migrations -database "$DB_URL" version || true
  fi
}

echo "[entrypoint] starting server..."
exec /usr/local/bin/server
