# MUDANZAS METEPEC | ERP

Sistema administrativo y operativo de Mudanzas Metepec: **solicitud → cotización manual → confirmación → agenda → servicio → nómina / flotilla / finanzas → resultados**.

* Arquitectura y modelo de datos: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
* Respaldos: [`docs/RESPALDOS.md`](docs/RESPALDOS.md)
* Despliegue: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)
* Manual de uso: [`docs/MANUAL.md`](docs/MANUAL.md)
* Fórmulas financieras: [`docs/FORMULAS.md`](docs/FORMULAS.md)

## Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Arquitectura, base de datos completa, autenticación, permisos, diseño, navegación, configuración, auditoría, respaldos | ✅ Entregada y probada |
| 2 | Clientes, solicitudes, cotizaciones manuales, seguimiento comercial | ✅ Entregada y probada |
| 3 | Confirmación, agenda, asignación de unidades y personal | ✅ Entregada y probada |
| 4 | Servicios realizados y cierre operativo | ✅ Entregada y probada |
| 5 | Personal y nómina por servicio | ✅ Entregada y probada |
| 6 | Flotilla, kilometraje, mantenimiento, depreciación | ✅ Entregada y probada |
| 7 | Finanzas y gastos | ✅ Entregada y probada |
| 8 | Dashboard de resultados | ✅ Entregada y probada |
| 9 | Integración, pruebas del flujo completo | Pendiente |
| 10 | Producción y manual de uso | Pendiente |

Los módulos pendientes muestran un aviso «se entrega en la Fase N»; no contienen botones ni datos simulados.

## Instalación local

Requisitos: Node.js 22, PostgreSQL 16.

```bash
cd erp
cp .env.example .env                     # edite las variables
createdb erp && createdb erp_test        # base real y base de pruebas
npm install
npx prisma migrate deploy
npm run db:seed                          # catálogos + administrador inicial
npm run dev                              # http://localhost:3000
```
Inicie sesión con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; el sistema pedirá cambiar la contraseña.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión PostgreSQL de la base real. |
| `TEST_DATABASE_URL` | Para pruebas | Base exclusiva de pruebas; su nombre debe contener `test`. Las pruebas vacían sus tablas. |
| `SESSION_TTL_HOURS` | No (12) | Duración de la sesión. |
| `STORAGE_DIR` | No (`./storage`) | Carpeta privada de archivos adjuntos. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` | Solo primer arranque | Administrador inicial (se crea solo si no hay usuarios). |
| `PG_DUMP_PATH` | No (`pg_dump`) | Ruta de `pg_dump` para descargar respaldos. |
| `INSECURE_COOKIES` | No | `1` solo para pruebas locales en producción sin HTTPS. Nunca en un servidor real. |

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` / `npm start` | Compilar / ejecutar |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas automatizadas (usa `TEST_DATABASE_URL`) |
| `npx prisma migrate deploy` | Aplicar migraciones |
| `npm run db:seed` | Catálogos (idempotente) |
| `./scripts/backup.sh` / `./scripts/restore.sh` | Respaldo / recuperación |

## Pruebas de la Fase 1

* **Automatizadas (29, Vitest, contra PostgreSQL real):** folios (formato, año en hora de México, 40 transacciones simultáneas sin duplicados, sin huecos tras error); contraseñas; inicio de sesión, bloqueo, sesiones revocadas/expiradas/alteradas, usuarios inactivos; permisos por rol y ajustes individuales; integridad (un servicio por solicitud, folios únicos, sin borrado en cascada, tablas inmutables, CHECK de importes y horarios, gastos recurrentes no duplicables); cuentas por cobrar con anticipo, pago final, cobro cancelado y servicio cancelado; formatos MXN y zona horaria.
* **Recorrido en navegador (Chromium):** redirección sin sesión, error de contraseña, cambio obligatorio de contraseña, indicadores en cero, búsqueda global, barra lateral contraíble con preferencia persistente, parámetros persistentes, alta de usuario y rechazo de duplicado, cierre de sesión, menú y bloqueo de páginas/API según permisos, menú móvil, auditoría y descarga de respaldo válido.

## Pruebas de la Fase 2

* **Automatizadas (16 nuevas, 45 en total):** conversión y validación de formularios (direcciones, importes `$4,500.00`, horas, C.P.); clientes con código CLI, detección de teléfono duplicado con o sin `+52`, concurrencia optimista y eliminación solo sin historial; solicitud con cliente nuevo y precio $4,500 (folio, versión 1, historial, notificación, auditoría); solicitud sin precio; recotización que conserva la versión original; 5 recotizaciones simultáneas sin versiones duplicadas; 20 solicitudes simultáneas con folios consecutivos; seguimiento con próxima fecha, contacto vencido, solicitud no concretada que permanece en el historial, reapertura; bloqueo de la confirmación manual (llega con la Fase 3); edición que registra solo diferencias y rechaza versiones viejas; búsqueda por folio, nombre, teléfono y municipio.
* **Recorrido en navegador (19 comprobaciones):** alta de cliente, duplicado detectado sin perder lo capturado, validación de la solicitud mostrando todos los errores a la vez, solicitud con cliente existente + precio $4,500 + fotografía, archivo servido solo con sesión, recotización a $4,800 conservando v1, seguimiento, edición, edición simultánea de dos usuarios, cotización imprimible/PDF, solicitud no concretada con motivo obligatorio, vistas «En seguimiento» / «Historial», filtros, exportación a Excel, búsqueda global, ficha del cliente, vista móvil sin desbordamiento.

## Pruebas de la Fase 3

* **Automatizadas (12 nuevas, 57 en total):** conversión de solicitud a servicio MM con hora de México, vínculo con solicitud y direcciones sin copiarlas; una solicitud no genera dos servicios aunque tres usuarios confirmen a la vez; «Por programar» sin fecha; empalme de unidad con márgenes de preparación y regreso (14:00 bloquea, 14:30 se permite); doble asignación de personal con otra unidad; servicios que cruzan medianoche y de 30 horas; cancelados liberan la unidad; autorización excepcional solo de administrador, con motivo y en auditoría; dos usuarios asignando la misma unidad a la vez (solo uno lo logra); reprogramación que conserva folio, cobros e historial antes/después; transiciones de estado y motivo obligatorio; cobros anticipo $2,000 → parcial, pago final $2,500 → liquidado, sobrepago rechazado, cancelación de cobro.
* **Recorrido en navegador (15 comprobaciones):** alta de personal, confirmación con F350, chofer y 2 ayudantes (pago total calculado), solicitud vinculada y sin segunda confirmación, anticipo y saldo, empalme de unidad y de personal bloqueados, autorización del administrador, servicio nocturno que bloquea la madrugada, reprogramación, cancelación que libera la unidad, calendario mensual/semanal/lista, ficha del chofer, rol Administrativo sin autorización de empalmes, vista móvil.

## Pruebas de la Fase 4

* **Automatizadas (6 nuevas, 63 en total):** cierre que en una sola transacción deja el servicio «Finalizado», guarda lecturas de odómetro inmutables y actualiza la unidad, registra combustible (litros en bitácora, importe solo en gastos), casetas, estacionamientos, viáticos y extras como gastos del folio, y genera el pago de nómina de chofer y ayudantes ($700) — con el cobro todavía parcial; margen directo $4,500 − $1,370 − $700 = $2,430; tres cierres simultáneos aplican uno solo sin duplicar pagos ni gastos; pago solo a participantes con importe; huecos y retrocesos de odómetro exigen confirmación (y motivo si retrocede); validación de horarios y unidades; gasto duplicado detectado, confirmación y cancelación sin borrar; IVA desglosado.
* **Recorrido en navegador (13 comprobaciones):** confirmación con cuadrilla y anticipo, validación de km, confirmación de kilometraje no congruente, cierre con evidencia fotográfica y cifras correctas, pago final → liquidado, gasto duplicado y cancelación, servicios realizados con totales, Excel, servicio finalizado no reprogramable ni cerrable dos veces, historial del chofer, vista móvil.

## Pruebas de la Fase 5

* **Automatizadas (8 nuevas, 71 en total):** cortes semanal (lunes–domingo), quincenal y mensual; tarifas con vigencia e historial; flujo completo servicio $300 + bono $500 + 3 h × $80 − deducción $100 = devengado $940, anticipo $200, corte con neto $740, pagado = devengado, saldo $0; no se puede volver a pagar lo mismo; cancelar el pago regresa conceptos y anticipo; tres pagos simultáneos del mismo corte (solo uno); anticipos mayores a lo devengado; corte liquidado solo con anticipo ($0 en efectivo); anticipo aplicado no se cancela suelto; sueldo base una vez por periodo y según tipo de pago; cancelación de conceptos; reglas de signo en la base de datos; estado de cuenta por periodo.
* **Recorrido en navegador (12 comprobaciones):** tarifas, pago propuesto al asignar, cierre que genera nómina, bono/horas extra/deducción/anticipo, corte con neto, recibo imprimible, resumen mensual y Excel, sin doble pago, cancelación, permisos del rol Administrativo, vista móvil.

## Pruebas de la Fase 6

* **Automatizadas (8 nuevas, 79 en total):** depreciación lineal ($600,000 − $120,000 en 5 años = $8,000/mes, inicio el mes siguiente a la compra, tope al terminar la vida útil) y por kilómetro ($1.20/km, tope en la base); registro mensual idempotente con ambos métodos y km del mes tomados de las lecturas; identificador y placas únicos; km inicial bloqueado con historial; lecturas que retroceden o contradicen lecturas posteriores; no se puede mandar a taller una unidad con servicios programados; costo de mantenimiento registrado una sola vez como gasto de la unidad y cancelación que revierte el gasto; alertas por km, por fecha y de documentos, donde el mantenimiento más reciente sustituye al anterior; notificaciones sin duplicar; seguro como gasto y su cancelación; combustible fuera de servicio.
* **Recorrido en navegador (13 comprobaciones):** unidades iniciales, ficha editable y depreciación, alta de la unidad de 3.5 t, mantenimiento con alerta, documentos con alerta, lecturas de odómetro con confirmación, combustible, historial de servicios desde los cierres y revisión de inconsistencias, panel de alertas, depreciación mensual, notificaciones, permisos del rol Administrativo, vista móvil.

## Pruebas de la Fase 7

* **Automatizadas (4 nuevas, 83 en total):** caso obligatorio completo del mes — servicio $4,500 con anticipo $2,000 y pago final $2,500, gastos del cierre $1,370, nómina $700 (devengada y pagada), renta recurrente $8,000 (por pagar y luego pagada), software $1,160 con $160 de IVA, depreciación $8,000 (estimada y luego registrada), préstamo $50,000, compra de activo $30,000 y pago de financiamiento $5,000 con $800 de intereses: ventas netas $4,500, cuentas por cobrar $0, resultado operativo −$14,570, utilidad −$15,370, flujo +$8,270, IVA acreditable $160; resultados por unidad; servicio con IVA (ventas netas $5,000 de $5,800, IVA en cobros $620.69); cancelaciones de cobros, gastos y movimientos; mes sin actividad en cero; recurrentes sin duplicar (incluso 3 generaciones simultáneas) y con vigencia; gastos generales duplicados y por folio.
* **Recorrido en navegador (11 comprobaciones):** mes vacío en cero, gasto con IVA por pagar, duplicado, marcar pagado, recurrente sin duplicar, préstamo/financiamiento/cancelación, resumen con cifras exactas (el préstamo no es venta), cobros y cuentas por cobrar, Excel, categorías, permisos, vista móvil.

## Pruebas de la Fase 8

* **Automatizadas (3 nuevas, 86 en total):** embudo comercial (recibidas → cotizadas → confirmadas, no concretadas, en seguimiento y conversión); resultados por unidad con asignación de costos compartidos por ingresos, kilómetros, servicios y partes iguales — la suma de lo asignado cuadra con el total y, si la base del criterio es cero, el importe queda «sin asignar»; serie mensual del año con el mismo motor de cálculo que Finanzas.
* **Recorrido en navegador (12 comprobaciones):** los 17 indicadores, 6 gráficas con tooltip en MXN y tabla de datos, resultados por unidad y comparativo contra el año anterior, filtro por camioneta, vista mensual con filtro por tipo de servicio, periodo sin datos en cero con gráficas vacías (sin datos simulados), Excel (4 hojas) y reporte PDF, el rol Administrativo sin acceso, vista móvil sin desbordamiento, sin errores de JavaScript.
