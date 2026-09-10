#!/usr/bin/env bash
# Бэкап БД платформы: pg_dump со сжатием + ротация 14 дней.
# По cron, напр.: 0 3 * * *  /opt/makemelook/platform/deploy/backup-db.sh
set -euo pipefail

DB="${PG_DB:-mml_platform}"
USER="${PG_USER:-platform}"
HOST="${PG_HOST:-127.0.0.1}"
PORT="${PG_PORT:-5432}"
OUT="${BACKUP_DIR:-/var/backups/mml-platform}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$OUT"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$OUT/${DB}-${STAMP}.sql.gz"

# PGPASSWORD берётся из окружения (или ~/.pgpass).
pg_dump -h "$HOST" -p "$PORT" -U "$USER" "$DB" | gzip > "$FILE"
echo "backup: $FILE ($(du -h "$FILE" | cut -f1))"

# Ротация: удалить дампы старше KEEP_DAYS.
find "$OUT" -name "${DB}-*.sql.gz" -mtime +"$KEEP_DAYS" -delete

# ВАЖНО: копию выгружать ВОВНЕ сервера (S3/Minio/другой хост) — локальный дамп
# не спасёт при потере диска. Добавьте sync в объектное хранилище тут.
