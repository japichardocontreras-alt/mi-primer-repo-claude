# Prueba integral en navegador

Recorre en un navegador real el flujo obligatorio completo y los escenarios de permisos y fallas de conexión:

1. Primer acceso del administrador y cambio de contraseña.
2. Chofer y dos ayudantes → cliente nuevo + solicitud de **$4,500** → confirmación como servicio con fecha, unidad y personal.
3. Anticipo **$2,000** (cobro parcial) → cierre operativo con kilometraje y gastos → pago al personal → pago final **$2,500** (liquidado).
4. Odómetro de la unidad, Finanzas y Resultados del mes con las mismas cifras.
5. Usuario Administrativo sin acceso a Resultados, Finanzas, Configuración ni a la exportación de cobros (HTTP 403).
6. Sin red: aviso claro y el formulario conserva lo capturado.
7. *(Opcional)* Base de datos detenida: mensaje «No hay conexión…», `/api/health` 503, exportaciones 503, pantalla «Reintentar»; al volver la base, se recupera sin iniciar sesión de nuevo y los folios siguen consecutivos.
8. Registro inexistente: «No encontrado».

## Requisitos
* Una base **separada** cuyo nombre contenga `e2e` (p. ej. `erp_e2e`). Nunca la base real.
* Chromium o Chrome instalado (`CHROMIUM_PATH`).

## Ejecución
```bash
# 1. Preparar la base aislada (migraciones + datos vacíos + catálogos + administrador de prueba)
E2E_DATABASE_URL="postgresql://usuario:clave@localhost:5432/erp_e2e" npm run e2e:reset

# 2. Levantar el ERP conectado a esa base, en otro puerto
npm run build
DATABASE_URL="$E2E_DATABASE_URL" STORAGE_DIR=/tmp/erp-e2e-archivos PORT=3200 node .next/standalone/server.js

# 3. Correr el recorrido (capturas en la carpeta indicada)
E2E_BASE_URL=http://localhost:3200 CHROMIUM_PATH=/ruta/a/chrome npm run e2e -- ./e2e-capturas
```
Para incluir la simulación de base de datos caída (solo en un equipo de pruebas, nunca en producción):
`E2E_DB_STOP_CMD="service postgresql stop" E2E_DB_START_CMD="service postgresql start"`.

El script espera una base recién preparada (los folios esperados son `SOL-…-000001`, `MM-…-000001`); ejecute `npm run e2e:reset` antes de cada corrida.
