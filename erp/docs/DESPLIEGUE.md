# Despliegue en producción

Dos opciones: **A) servidor Linux con Node.js y PostgreSQL** (probada en el entorno de desarrollo) o **B) Docker Compose** (archivos incluidos, *no se pudieron construir en el entorno de desarrollo* por no tener Docker: pruébelos primero en un servidor de pruebas).

## Requisitos
* Servidor Linux (Ubuntu 24.04 o Debian 12), 2 GB de RAM mínimo, 20 GB de disco.
* Node.js 22 LTS · PostgreSQL 16 (con `pg_dump`/`pg_restore` 16).
* Un dominio (p. ej. `erp.mudanzasmetepec.com`) apuntando al servidor. **HTTPS es obligatorio**: la cookie de sesión es `Secure`.

---

## Opción A — Servidor con Node.js (recomendada)

### 1. Base de datos
```bash
sudo apt install -y postgresql-16
sudo -u postgres createuser --pwprompt erp          # contraseña fuerte, guárdela en un gestor
sudo -u postgres createdb -O erp erp
```
No use la base de pruebas (`erp_test`) ni la de recorridos (`erp_e2e`) para datos reales.

### 2. Aplicación
```bash
sudo useradd -r -m -d /opt/erp -s /usr/sbin/nologin erp
sudo mkdir -p /var/lib/erp/archivos /var/backups/erp && sudo chown erp:erp /var/lib/erp/archivos /var/backups/erp
sudo -u erp git clone <URL-del-repositorio> /opt/erp && cd /opt/erp/erp
sudo -u erp cp .env.example .env && sudo chmod 600 .env
sudo -u erp nano .env        # DATABASE_URL, STORAGE_DIR=/var/lib/erp/archivos, SEED_ADMIN_* (ver docs/VARIABLES.md)
sudo -u erp npm ci
sudo -u erp npx prisma migrate deploy      # crea las tablas (no borra datos)
sudo -u erp npm run db:seed                # catálogos, 4 unidades iniciales y administrador inicial
sudo -u erp npm run build                  # compila y prepara el servidor autónomo
```
Prueba rápida: `sudo -u erp PORT=3000 npm start` → `curl localhost:3000/api/health` debe responder `{"status":"ok","db":"ok"}`.

### 3. Servicio (arranque automático)
```bash
sudo cp deploy/erp.service /etc/systemd/system/erp.service
sudo systemctl daemon-reload && sudo systemctl enable --now erp
sudo systemctl status erp          # registros: journalctl -u erp -f
```

### 4. HTTPS
* **Caddy** (certificado automático): `sudo apt install caddy`, copie `deploy/Caddyfile` a `/etc/caddy/Caddyfile` con su dominio y `sudo systemctl reload caddy`.
* **Nginx**: use `deploy/nginx.conf` y `sudo certbot --nginx -d su-dominio`.

Ambos permiten archivos de hasta 120 MB (fotos de evidencia). Cierre en el firewall todo excepto 22, 80 y 443; PostgreSQL no debe estar expuesto a internet.

### 5. Primer acceso
Entre con `SEED_ADMIN_EMAIL` y la contraseña temporal; el sistema pedirá cambiarla. Luego:
1. **Configuración → General:** datos de la empresa, tiempos de operación, alertas, tasa de IVA, método de depreciación y criterio de asignación de costos.
2. **Flotilla:** complete las 4 unidades (placas, kilometraje inicial, valor de compra, vida útil) y agregue la de 3.5 t cuando llegue.
3. **Personal:** registre choferes y ayudantes; **Personal → Tarifas** para los pagos por servicio.
4. **Configuración → Usuarios:** cree los usuarios del área administrativa; **Roles y permisos** para ajustar qué ven.
5. Borre `SEED_ADMIN_PASSWORD` del `.env`.

### 6. Respaldos automáticos
```bash
sudo -u erp crontab -e
# Diario 02:30 (hora del servidor): base de datos + archivos adjuntos, conserva 30 días
30 2 * * * cd /opt/erp/erp && BACKUP_DIR=/var/backups/erp KEEP_DAYS=30 ./scripts/backup.sh >> /var/backups/erp/respaldo.log 2>&1
```
Copie `/var/backups/erp` **fuera del servidor** (otro disco o nube). Recuperación: `docs/RESPALDOS.md`.

### 7. Actualizar a una nueva versión
```bash
cd /opt/erp/erp
sudo -u erp ./scripts/backup.sh                 # SIEMPRE respaldar antes
sudo -u erp git pull
sudo -u erp npm ci
sudo -u erp npx prisma migrate deploy           # aplica solo migraciones nuevas
sudo -u erp npm run build
sudo systemctl restart erp
curl -s https://su-dominio/api/health
```
Si algo falla: `git checkout <versión anterior>`, `npm ci && npm run build`, reinicie; si una migración ya se aplicó, restaure el respaldo tomado antes de actualizar.

---

## Opción B — Docker Compose (no probada aquí)
```bash
cp .env.example .env     # agregue POSTGRES_PASSWORD y SEED_ADMIN_*
docker compose build
docker compose run --rm migrate     # migraciones + catálogos + administrador
docker compose up -d app            # escucha en 127.0.0.1:3000; publíquelo con Caddy/Nginx (HTTPS)
```
Volúmenes: `pgdata` (base) y `archivos` (adjuntos). Respaldos: `docker compose exec db pg_dump -U erp -Fc erp > erp-$(date +%F).dump` y copia del volumen `archivos`.

---

## Monitoreo
* `GET /api/health` → 200 `{"status":"ok","db":"ok"}`; **503** si la base no responde (úselo en UptimeRobot o similar).
* Registros: `journalctl -u erp`. Los errores mostrados al usuario incluyen una «Referencia» que aparece en el registro.
* Tras reiniciar PostgreSQL la aplicación se reconecta sola (las lecturas se reintentan); no hace falta reiniciar el ERP.

## Seguridad aplicada
Contraseñas con bcrypt (12 rondas), bloqueo tras 5 intentos fallidos, sesiones en base de datos revocables, cookie `HttpOnly`/`Secure`/`SameSite=Lax`, permisos validados en el servidor en cada acción y API, auditoría inmutable, encabezados `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, adjuntos fuera de la carpeta pública y servidos solo con sesión, sin credenciales en el código.

## Mantenimiento de dependencias
Revisión de `npm audit --omit=dev` al cierre de la Fase 10 (octubre 2026): 7 avisos, ninguno explotable en el uso que hace el ERP, y todos requieren saltos de versión mayor:

| Paquete | Aviso | Por qué no afecta hoy | Solución |
|---|---|---|---|
| `postcss` (dentro de `next`) | XSS / lectura de archivos con CSS o mapas controlados por un atacante | Solo procesa el CSS propio durante la compilación | Next.js 16 |
| `deepmerge-ts` (dentro de `prisma`) | Agotamiento de pila con objetos recursivos | Solo se usa al leer la configuración de la CLI de Prisma | Prisma 7 |
| `uuid` (dentro de `exceljs`) | Falta de verificación de límites cuando se pasa un búfer | ExcelJS no se llama con búfer externo | Nueva versión de ExcelJS |

Recomendación: planear la actualización a Next.js 16 y Prisma 7 como un cambio aparte, en un servidor de pruebas y con `npm test` + `npm run e2e` antes de llevarla a producción.
