# Variables de entorno

Se definen en el archivo `.env` (copia de `.env.example`, **nunca** se sube al repositorio; permisos `600`) o en el entorno del proceso (systemd, Docker). Las variables del entorno tienen prioridad sobre `.env`.

## Producción
| Variable | Obligatoria | Valor por defecto | Para qué sirve |
|---|---|---|---|
| `DATABASE_URL` | **Sí** | — | Conexión a PostgreSQL 16. Use un usuario que solo tenga permisos sobre la base del ERP. Ej.: `postgresql://erp:CLAVE@localhost:5432/erp?schema=public` |
| `STORAGE_DIR` | Recomendada | `storage` (dentro de la carpeta del proyecto) | Carpeta **privada** de fotos y documentos adjuntos. En producción use una ruta absoluta fuera del código, p. ej. `/var/lib/erp/archivos`. Debe respaldarse. |
| `SESSION_TTL_HOURS` | No | `12` | Duración de la sesión. |
| `PORT` | No | `3000` | Puerto del servidor. |
| `HOSTNAME` | No | `0.0.0.0` | Interfaz de escucha. Detrás de un proxy use `127.0.0.1`. |
| `PG_DUMP_PATH` | No | `pg_dump` | Ruta a `pg_dump` (misma versión mayor que PostgreSQL) para *Configuración → Respaldos*. |
| `INSECURE_COOKIES` | No | — | Solo para probar en una red local **sin HTTPS**: `1` quita el atributo `Secure` de la cookie de sesión. Nunca en producción. |

## Solo al instalar (semilla inicial)
| Variable | Uso |
|---|---|
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` | `npm run db:seed` crea el primer administrador si no existe ningún usuario. La contraseña es **temporal**: el sistema obliga a cambiarla al primer acceso. Después puede borrarlas del `.env`. |

## Solo desarrollo y pruebas
| Variable | Uso |
|---|---|
| `TEST_DATABASE_URL` | Base exclusiva de `npm test` (se vacía en cada corrida). El nombre debe contener «test» y ser distinta de `DATABASE_URL`; si no, las pruebas se niegan a correr. |
| `E2E_DATABASE_URL` | Base exclusiva del recorrido en navegador (`npm run e2e:reset`). Nombre con «e2e». |
| `E2E_BASE_URL`, `CHROMIUM_PATH`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_TEMP_PASSWORD`, `E2E_DB_STOP_CMD`, `E2E_DB_START_CMD` | Ver `e2e/README.md`. |

## Respaldos (`scripts/backup.sh`)
| Variable | Valor por defecto | Uso |
|---|---|---|
| `BACKUP_DIR` | `./backups` | Carpeta de respaldos. |
| `KEEP_DAYS` | `30` | Días que se conservan. |

## Zona horaria
No hace falta configurar la del servidor: todas las fechas se calculan y muestran explícitamente en `America/Mexico_City` y se guardan en UTC.
