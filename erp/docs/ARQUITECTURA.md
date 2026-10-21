# Arquitectura — MUDANZAS METEPEC | ERP

## 1. Tecnología elegida

| Capa | Tecnología | Motivo |
|---|---|---|
| Aplicación web | **Next.js 15 (App Router) + React 19 + TypeScript** | Frontend y backend en un solo proyecto; *Server Components* y *Server Actions* ejecutan la lógica en el servidor (los permisos nunca dependen del navegador). |
| Estilos / UI | **Tailwind CSS 3** + componentes propios estilo *shadcn/ui* (`src/components/ui`) | Diseño consistente, sin dependencias pesadas, fácil de mantener. |
| Base de datos | **PostgreSQL 16** | Transacciones, integridad referencial, `CHECK`, *triggers*, índices y respaldos con `pg_dump`. |
| ORM / migraciones | **Prisma 6** | Esquema tipado, migraciones versionadas en `prisma/migrations`. |
| Autenticación | **Sesiones propias en BD** + **bcrypt** | Cookie `httpOnly` con token aleatorio; en BD solo se guarda su hash SHA-256. Permite revocar sesiones y ver sesiones abiertas. |
| Validación | **Zod** | Mismas reglas para formularios y servidor. |
| Pruebas | **Vitest** contra una base `*_test` real + recorrido en navegador (Playwright) | Se prueban las reglas reales de BD (triggers, únicos, CHECK), no simulaciones. |
| Gráficas / exportación | Recharts, ExcelJS y PDF (fases 2–8) | Se incorporan en las fases donde existen datos que graficar/exportar. |

Se descartó *localStorage* como almacenamiento: solo se usa una cookie para recordar si la barra lateral está contraída.

## 2. Estructura del proyecto

```
erp/
├── prisma/
│   ├── schema.prisma          # Modelo de datos completo (todas las fases)
│   ├── migrations/            # Migraciones SQL versionadas
│   └── seed.ts                # Catálogos del sistema (idempotente)
├── src/
│   ├── app/
│   │   ├── login/             # Inicio de sesión
│   │   ├── (erp)/             # Área autenticada (layout con barra lateral)
│   │   │   ├── page.tsx       # Inicio
│   │   │   ├── configuracion/ # Parámetros, usuarios, roles, auditoría, respaldos
│   │   │   └── …              # Módulos por fase
│   │   └── api/               # buscar, health, respaldo
│   ├── components/            # UI y layout
│   ├── lib/
│   │   ├── auth/              # core (sesiones), server (Next), permisos, contraseñas
│   │   ├── db.ts              # Prisma + transacciones con reintento
│   │   ├── folios.ts          # Consecutivos atómicos
│   │   ├── audit.ts           # Bitácora
│   │   ├── settings.ts        # Parámetros configurables con validación
│   │   ├── format.ts          # MXN, fechas es-MX, zona America/Mexico_City
│   │   ├── pricing/engine.ts  # Punto de conexión del cotizador futuro
│   │   └── queries/           # Consultas de indicadores
│   └── middleware.ts          # Filtro rápido de sesión
├── tests/                     # Pruebas automatizadas
├── scripts/                   # backup.sh / restore.sh
└── docs/
```

## 3. Flujo principal y cómo se conecta en la base de datos

```
Cliente ─┬─< Solicitud (SOL-AAAA-######) ─┬─< Quote (versiones de precio, inmutables)
         │                                └─< RequestEvent (seguimiento, inmutable)
         │            │ 1:1 (UNIQUE requestId → imposible duplicar)
         └─< Servicio (MM-AAAA-######) ─┬─< ServiceVehicle  >── Vehículo ─┬─< OdometerReading (inmutable)
                                        ├─< ServiceStaff    >── Trabajador│─< FuelLog / Maintenance / VehicleDocument
                                        │        └─1:1─ PayrollEntry       └─< DepreciationEntry
                                        ├─< ServiceReschedule (historial)
                                        ├─< ConflictOverride (autorizaciones excepcionales)
                                        ├─< Payment (COB-…; varios cobros por servicio)
                                        └─< Expense (GAS-…; gastos directos)
```

* **Un solo registro por servicio**: agenda, servicios realizados, nómina, flotilla y resultados son *vistas* del mismo `services.id`; no se copian datos.
* **Direcciones** se guardan una vez (`addresses`) y se referencian desde la solicitud y el servicio.
* **Servicios realizados** = servicios con `status = FINALIZADO`; el cierre operativo (`operationalClosedAt`) y el financiero (`collectionStatus`, `financialClosedAt`) son independientes.

## 4. Tablas (36) por dominio

| Dominio | Tablas |
|---|---|
| Seguridad | `users`, `roles`, `permissions`, `role_permissions`, `user_permissions`, `sessions`, `audit_logs`, `notifications`, `settings`, `folio_counters` |
| Comercial | `clients`, `addresses`, `requests`, `quotes`, `request_events` |
| Operación | `services`, `service_vehicles`, `service_staff`, `service_reschedules`, `conflict_overrides` |
| Personal y nómina | `workers`, `pay_rates`, `payroll_entries`, `payroll_payments` |
| Flotilla | `vehicles`, `odometer_readings`, `fuel_logs`, `maintenances`, `vehicle_documents`, `depreciation_entries` |
| Finanzas | `payments`, `expenses`, `expense_categories`, `recurring_expenses`, `financial_movements` |
| Archivos | `attachments` |

## 5. Reglas de integridad

* **Claves internas UUID** y **folios visibles** independientes (`UNIQUE`). Los folios nunca cambian.
* **Folios atómicos** (`src/lib/folios.ts`): `INSERT … ON CONFLICT DO UPDATE … RETURNING` dentro de la misma transacción que crea el registro. Dos usuarios simultáneos no obtienen el mismo número y un error no deja huecos (probado con 40 transacciones concurrentes).
* **Sin borrados en cascada** de información histórica: todas las relaciones operativas/financieras usan `ON DELETE RESTRICT`. Los registros se **cancelan** (`cancelledAt`) o **desactivan** (`active`).
* **Tablas de solo inserción** (trigger `erp_forbid_change`): `audit_logs`, `quotes`, `odometer_readings`, `request_events`. Un cambio de precio crea una nueva versión de cotización; una lectura de odómetro errónea se corrige con otra lectura, nunca sobrescribiendo.
* **CHECK** en importes (no negativos / positivos), `total = subtotal + IVA`, `estimatedEnd > scheduledStart`, mes 1–12, litros > 0.
* **Concurrencia optimista**: columna `version` en registros editables; si otro usuario guardó antes, la edición se rechaza con un mensaje claro en lugar de sobrescribir.
* **Transacciones** para toda operación que toca varios registros (`withTransaction`, con reintento ante conflictos).

## 6. Reglas para evitar doble conteo (base para la Fase 8)

| Concepto | Fuente única | Dónde NO se vuelve a contar |
|---|---|---|
| Ventas pactadas | `services.contractedPrice` (no cancelados) | Las cotizaciones (`quotes`) no son ventas. |
| Ingresos cobrados | `payments` vigentes (reembolsos restan) | — |
| Cuentas por cobrar | ventas pactadas − cobrado | — |
| Nómina (devengo) | `payroll_entries` (un pago por servicio por asignación: `UNIQUE(serviceStaffId)`; sueldo base una vez por periodo: `UNIQUE(workerId, kind, periodKey)`) | No se captura como gasto en `expenses` (la categoría *Sueldos fijos* es solo para pagos fuera del módulo de nómina). |
| Nómina (efectivo) | `payroll_payments` (anticipos y pagos de corte; neto = devengos liquidados − anticipos aplicados) | Solo en flujo de efectivo. Un devengo se liquida una sola vez (`paymentId`). |
| Combustible / mantenimiento / documentos | `expenses` (el importe) | `fuel_logs`, `maintenances`, `vehicle_documents` solo guardan litros, km y fechas y se ligan al gasto con `expenseId UNIQUE`. |
| Depreciación | `depreciation_entries` (no es efectivo; lineal: (precio − residual) ÷ años ÷ 12 desde el mes siguiente a la compra; por km: (precio − residual) ÷ vida en km × km del mes según lecturas) | Nunca se mezcla con gastos pagados. Idempotente por unidad/mes/método. |
| Préstamos, aportaciones, compra de activos | `financial_movements` | No son ventas ni gastos operativos; solo flujo de efectivo (los intereses de un financiamiento sí son gasto). |
| Gastos recurrentes | `expenses` con `UNIQUE(recurringId, recurringPeriod)` | Generar el mismo mes dos veces es imposible. |

## 7. Seguridad

* Contraseñas con **bcrypt (12 rondas)**; mínimo 10 caracteres con letras y números; cambio obligatorio en el primer acceso.
* **Bloqueo temporal** (15 min) tras 5 intentos fallidos; mismo mensaje para usuario inexistente o contraseña incorrecta.
* Sesiones en BD (12 h configurables), revocables por usuario; al desactivar un usuario o restablecer su contraseña se cierran sus sesiones.
* **Permisos validados en el servidor** en cada página, *server action* y API. El rol **Administrador** tiene todos los permisos; el administrador configura los del rol **Administrativo** y ajustes individuales por usuario.
* Auditoría de inicios de sesión, intentos fallidos, bloqueos, altas, ediciones, permisos y respaldos.
* Encabezados de seguridad (`X-Frame-Options`, `nosniff`, `Referrer-Policy`). Archivos adjuntos en carpeta privada (`STORAGE_DIR`), servidos solo con sesión (Fase 2).
* Sin credenciales en el código: todo vía variables de entorno (`.env.example`).

## 7 bis. Fallas de conexión
* **Lecturas:** el cliente de Prisma (`src/lib/db.ts`) reintenta automáticamente las consultas de lectura cuando la conexión se cerró (p. ej. tras reiniciar PostgreSQL) o el servidor no respondió. Las **escrituras nunca se reintentan solas**.
* **Server actions:** `toActionError` traduce fallas de conexión a «No hay conexión con la base de datos…» (código `DB_UNAVAILABLE`). Como cada operación es una transacción, una falla no deja datos a medias.
* **Formularios:** `ActionForm` captura errores de red (servidor inaccesible o sin internet) y muestra un aviso sin borrar lo capturado.
* **Páginas:** `app/error.tsx`, `app/(erp)/error.tsx` y `global-error.tsx` muestran una pantalla en español con «Reintentar» y la referencia del error; `not-found.tsx` para registros inexistentes.
* **API:** `safeRoute` (`src/lib/api.ts`) responde 503 en español si la base no está disponible; `/api/health` responde 503 para el monitoreo.

## 8. Cotizador futuro

`src/lib/pricing/engine.ts` define la interfaz `PricingEngine`. Hoy opera `ManualPricingEngine` (no calcula). La solicitud ya guarda unidad propuesta, km estimados, volumen, personal requerido, paquete, gastos estimados; cada versión de cotización guarda `manualPrice`, `calculatedPrice` (reservado), `finalPrice` (autorizado), `calculatorInput/Output/Ver`. Conectar el cotizador consiste en implementar otra clase de esa interfaz; no requiere cambiar tablas ni pantallas existentes.

## 9. Zona horaria y formatos

La BD guarda instantes en UTC (`timestamptz`) y fechas puras en `date`. Toda presentación y todo corte por día/mes/año se calcula en **America/Mexico_City** (`src/lib/format.ts`), incluido el año de los folios (un registro del 31-dic a las 20:00 pertenece al año que termina). Moneda **MXN** y fechas **dd/mm/aaaa**.

## 10. Datos de prueba

Las pruebas automatizadas usan una base **separada** (`TEST_DATABASE_URL`, cuyo nombre debe contener `test`; nunca igual a `DATABASE_URL`). La base real solo recibe catálogos del sistema mediante `npm run db:seed`.
