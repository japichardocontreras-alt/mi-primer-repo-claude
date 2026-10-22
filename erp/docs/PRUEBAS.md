# Matriz de pruebas (sección 19 del requerimiento)

Todas las pruebas automatizadas corren contra **PostgreSQL real** en una base separada (`TEST_DATABASE_URL`, nombre con «test»); el recorrido en navegador usa otra base aislada (`erp_e2e`). Ninguna toca la base real.

* `npm test` — 96 pruebas (Vitest) en `tests/`.
* `npm run e2e` — recorrido integral en navegador (`e2e/flujo-integral.js`, ver `e2e/README.md`).

| Escenario obligatorio | Dónde se comprueba |
|---|---|
| **Flujo completo**: cliente, solicitud $4,500, confirmación, agenda, unidad, chofer + 2 ayudantes, anticipo $2,000, finalizar, km, gastos, pagos a trabajadores, pago final $2,500, liquidado, km de la unidad, pagos del personal, resultados actualizados | `tests/integracion.test.ts` (un solo caso, de punta a punta, que verifica agenda, cobranza, flotilla, nómina, finanzas, resultados por unidad, serie mensual, embudo y auditoría) · `e2e/flujo-integral.js` pasos 1–11 |
| Solicitudes no concretadas | `tests/solicitudes.test.ts` (seguimiento, motivo obligatorio, permanece en historial, reapertura) · `tests/resultados.test.ts` (embudo) |
| Servicios cancelados | `tests/agenda.test.ts` (motivo, liberan la unidad) · `tests/integracion.test.ts` (no son venta ni cuenta por cobrar; anticipo retenido como ingreso; reembolso) · `tests/integridad.test.ts` |
| Reprogramaciones | `tests/agenda.test.ts` (conserva folio, cobros e historial) · `tests/integracion.test.ts` (cambio de mes mueve la venta y revalida empalmes) |
| Doble asignación de unidad | `tests/agenda.test.ts` (empalmes, mismo día con disponibilidad, dos usuarios a la vez) |
| Doble asignación de personal | `tests/agenda.test.ts` (aunque la unidad sea distinta; autorización excepcional auditada) |
| Servicios que cruzan medianoche | `tests/agenda.test.ts` (medianoche y varios días) |
| Pagos parciales | `tests/agenda.test.ts` · `tests/integracion.test.ts` (varios meses, cuentas por cobrar al cierre de cada mes; sin sobrepago) · `tests/nomina.test.ts` (anticipos al personal) |
| Folios duplicados | `tests/folios.test.ts` (40 transacciones simultáneas, año de México, sin consumir folio al revertir) · `tests/solicitudes.test.ts` (20 solicitudes simultáneas) · `tests/integridad.test.ts` (UNIQUE) · e2e paso 17 (folio consecutivo tras caída de la BD) |
| Edición de registros | `tests/solicitudes.test.ts` (solo diferencias, conserva folio, nueva versión de precio) · `tests/flotilla.test.ts` |
| Actualización simultánea | Control de versión en clientes/solicitudes/servicios; `tests/cierre.test.ts` (dos cierres), `tests/nomina.test.ts` (dos cortes), `tests/integracion.test.ts` (dos cobros del saldo), `tests/agenda.test.ts` (dos confirmaciones / dos asignaciones), `tests/finanzas.test.ts` (recurrentes generados a la vez) |
| Gastos duplicados | `tests/cierre.test.ts` · `tests/finanzas.test.ts` (generales y recurrentes) · `tests/flotilla.test.ts` (mantenimiento registrado una sola vez) |
| Errores de conexión | `tests/seguridad.test.ts` (BD inaccesible → mensaje y código `DB_UNAVAILABLE`) · e2e pasos 16–17 (sin red: se conserva lo capturado; BD detenida: mensaje al guardar, `/api/health` 503, exportaciones 503, pantalla «Reintentar», recuperación sin volver a iniciar sesión) |
| Permisos | `tests/auth.test.ts` (roles, ajustes individuales, sesiones, bloqueo) · `tests/seguridad.test.ts` (revisión de TODAS las server actions y rutas de API: validan sesión/permiso en el servidor) · e2e paso 15 (Administrativo bloqueado en páginas y API con 403) |
| Cálculos financieros | `tests/finanzas.test.ts` (caso del mes con fijos, IVA, depreciación, préstamo, activo, financiamiento) · `tests/resultados.test.ts` (asignación por unidad) · `docs/FORMULAS.md` |

## Qué no se pudo probar en este entorno
* Despliegue con Docker (no hay demonio de Docker disponible); se documenta en `docs/DESPLIEGUE.md`.
* Navegadores distintos de Chromium (Safari/Firefox) y dispositivos físicos; la vista móvil se verificó con Chromium a 390 px.
* Carga con muchos usuarios reales; la concurrencia se probó con transacciones simultáneas contra PostgreSQL.
