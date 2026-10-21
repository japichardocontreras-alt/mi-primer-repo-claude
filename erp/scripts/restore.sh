#!/usr/bin/env bash
# Recupera un respaldo en una base de datos DESTINO.
# Uso:   ./scripts/restore.sh backups/erp-AAAAMMDD-HHMMSS.dump "postgresql://usuario:clave@host:5432/erp_restaurada"
#
# Recomendación: restaurar primero en una base NUEVA, verificar y después
# apuntar DATABASE_URL a ella. Este script se niega a restaurar sobre una base
# que ya tenga tablas, salvo que se indique FORCE=1 (reemplaza los objetos).
set -euo pipefail

FILE="${1:?Indique el archivo .dump}"
TARGET="${2:?Indique la URL de la base de datos destino}"
TARGET="${TARGET%%\?*}"

pg_restore --list "$FILE" > /dev/null || { echo "El archivo no es un respaldo válido."; exit 1; }

TABLES=$(psql "$TARGET" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [[ "$TABLES" != "0" && "${FORCE:-0}" != "1" ]]; then
  echo "La base destino ya contiene $TABLES tablas. Use una base vacía o FORCE=1 para reemplazar."
  exit 1
fi

if [[ "${FORCE:-0}" == "1" ]]; then
  pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction --dbname="$TARGET" "$FILE"
else
  pg_restore --no-owner --no-privileges --single-transaction --dbname="$TARGET" "$FILE"
fi

echo "Restauración completa. Verificación:"
psql "$TARGET" -c "SELECT (SELECT count(*) FROM users) AS usuarios, (SELECT count(*) FROM requests) AS solicitudes, (SELECT count(*) FROM services) AS servicios, (SELECT max(\"createdAt\") FROM audit_logs) AS ultima_auditoria;"
