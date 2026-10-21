# Respaldos y recuperación

## Respaldo manual desde la aplicación
*Configuración → Respaldos → Descargar respaldo*. Requiere el permiso «Descargar respaldos» y que el servidor tenga `pg_dump` (misma versión mayor que PostgreSQL). Queda registrado en Auditoría.

## Respaldo automático (servidor)
```bash
# Diario a las 02:30, conservando 30 días
30 2 * * * cd /opt/erp && BACKUP_DIR=/var/backups/erp KEEP_DAYS=30 ./scripts/backup.sh >> /var/log/erp-backup.log 2>&1
```
El script toma `DATABASE_URL` y `STORAGE_DIR` del entorno o del archivo `.env`, crea `erp-AAAAMMDD-HHMMSS.dump` (base de datos) y `erp-archivos-AAAAMMDD-HHMMSS.tar.gz` (fotos y documentos adjuntos), **verifica** que ambos sean legibles y solo entonces elimina los respaldos con más de `KEEP_DAYS` días.

La descarga desde *Configuración → Respaldos* incluye solo la base de datos; los adjuntos se respaldan con el script.

**Recomendado:** copiar la carpeta de respaldos fuera del servidor (otro disco, almacenamiento en la nube) — un respaldo en el mismo servidor no protege contra la pérdida del servidor. Respalde también la carpeta `STORAGE_DIR` (archivos adjuntos).

## Recuperación
1. Cree una base vacía: `createdb -O erp erp_restaurada`
2. Restaure: `./scripts/restore.sh /var/backups/erp/erp-20261021-023000.dump "postgresql://erp:CLAVE@localhost:5432/erp_restaurada"`
3. Revise el resumen (usuarios, solicitudes, servicios, última auditoría).
4. Restaure los adjuntos: `tar -xzf /var/backups/erp/erp-archivos-20261021-023000.tar.gz -C /var/lib/erp/archivos`
5. Cambie `DATABASE_URL` a la base restaurada y reinicie la aplicación (`sudo systemctl restart erp`).

El script se niega a restaurar sobre una base con tablas; para reemplazar a propósito use `FORCE=1` (operación destructiva; hágalo solo tras respaldar la base actual).

## Prueba realizada
Fase 10: respaldo de base y adjuntos con `backup.sh`; restauración en una base nueva (2 usuarios, 40 solicitudes, 24 servicios, auditoría al día) y extracción de los 15 archivos adjuntos, idénticos en número a los originales.

En el entorno de desarrollo se generó un respaldo con `backup.sh`, se restauró en una base nueva con `restore.sh` (usuarios y auditoría presentes) y se comprobó que el script rechaza restaurar sobre una base existente.
