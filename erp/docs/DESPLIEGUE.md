# Despliegue en producción (preliminar — se completa en la Fase 10)

## Requisitos
* Node.js 22 LTS
* PostgreSQL 16 (con `pg_dump`/`pg_restore` de la misma versión en el servidor de la aplicación)
* Un dominio con HTTPS (Nginx/Caddy como proxy inverso, o una plataforma administrada)

## Pasos
```bash
git clone <repo> /opt/erp-src && cd /opt/erp-src/erp
cp .env.example .env          # complete las variables (ver README)
npm ci
npx prisma migrate deploy     # aplica migraciones (no destructivo)
npm run db:seed               # catálogos + administrador inicial
npm run build
# Next.js genera un servidor autónomo:
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
cd .next/standalone && node server.js        # usa PORT y HOSTNAME
```
Ejecútelo con un administrador de procesos (systemd o pm2) para que se reinicie solo.

## Proxy inverso (Caddy, HTTPS automático)
```
erp.mudanzasmetepec.com {
  reverse_proxy 127.0.0.1:3000
}
```
La cookie de sesión es `Secure` en producción: **la aplicación debe servirse por HTTPS**.

## Actualizaciones
```bash
./scripts/backup.sh            # siempre respaldar antes
git pull && npm ci && npx prisma migrate deploy && npm run build
# copiar static/public a standalone y reiniciar el proceso
```

## Monitoreo
`GET /api/health` → `{"status":"ok","db":"ok"}` (503 si la base no responde).

> Pendiente para la Fase 10: imagen Docker / docker-compose, guía para un proveedor específico, y pruebas de carga.
> En el entorno de desarrollo no había servicio Docker disponible, por eso no se incluye todavía una imagen sin probar.
