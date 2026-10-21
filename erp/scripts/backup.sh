#!/usr/bin/env bash
# Respaldo de la base de datos del ERP con rotación.
# Uso:   DATABASE_URL=... BACKUP_DIR=/ruta/respaldos KEEP_DAYS=30 ./scripts/backup.sh
# Cron diario 02:30:  30 2 * * * cd /opt/erp && ./scripts/backup.sh >> /var/log/erp-backup.log 2>&1
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" && -f .env ]]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
fi
: "${DATABASE_URL:?Defina DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
URL="${DATABASE_URL%%\?*}"   # pg_dump no acepta ?schema=

mkdir -p "$BACKUP_DIR"
STAMP=$(TZ=America/Mexico_City date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/erp-$STAMP.dump"

pg_dump --format=custom --no-owner --no-privileges --file="$FILE.tmp" "$URL"
mv "$FILE.tmp" "$FILE"
# Verifica que el archivo sea legible antes de rotar los anteriores.
pg_restore --list "$FILE" > /dev/null
find "$BACKUP_DIR" -name 'erp-*.dump' -type f -mtime +"$KEEP_DAYS" -delete

echo "[$(date -Iseconds)] Respaldo OK: $FILE ($(du -h "$FILE" | cut -f1))"
