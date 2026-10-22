-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('WHATSAPP', 'TELEFONO', 'CORREO', 'FACEBOOK', 'INSTAGRAM', 'SITIO_WEB', 'RECOMENDACION', 'PRESENCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('LOCAL', 'FORANEO', 'FLETE', 'OTRO');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('ESTANDAR', 'SUPERIOR', 'COMPLETO', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NUEVA', 'INFORMACION_INCOMPLETA', 'PENDIENTE_COTIZAR', 'COTIZACION_ENVIADA', 'PENDIENTE_CONFIRMACION', 'CONFIRMADA', 'NO_CONCRETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "QuoteSource" AS ENUM ('MANUAL', 'CALCULADO');

-- CreateEnum
CREATE TYPE "RequestEventType" AS ENUM ('CREADA', 'CAMBIO_ESTADO', 'CONTACTO', 'NOTA', 'COTIZACION', 'EDICION', 'CONVERSION');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('POR_PROGRAMAR', 'PROGRAMADO', 'CONFIRMADO', 'EN_PROCESO', 'FINALIZADO', 'INCIDENCIA', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDIENTE', 'PARCIAL', 'LIQUIDADO');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('CHOFER', 'AYUDANTE', 'OTRO');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('UNIDAD', 'PERSONAL');

-- CreateEnum
CREATE TYPE "WorkerPosition" AS ENUM ('CHOFER', 'AYUDANTE', 'ADMINISTRACION', 'OTRO');

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('POR_SERVICIO', 'SEMANAL', 'QUINCENAL', 'MENSUAL', 'MIXTO');

-- CreateEnum
CREATE TYPE "PayrollEntryKind" AS ENUM ('SERVICIO', 'SUELDO_BASE', 'BONO', 'HORAS_EXTRA', 'DEDUCCION', 'ANTICIPO_NOMINA', 'OTRO');

-- CreateEnum
CREATE TYPE "PayrollEntryStatus" AS ENUM ('GENERADO', 'PAGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVA', 'EN_TALLER', 'FUERA_DE_SERVICIO', 'BAJA');

-- CreateEnum
CREATE TYPE "OdometerSource" AS ENUM ('SERVICIO_INICIO', 'SERVICIO_FIN', 'MANTENIMIENTO', 'COMBUSTIBLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('CAMBIO_ACEITE', 'AFINACION', 'FRENOS', 'SUSPENSION', 'LLANTAS', 'REPARACION', 'SERVICIO_GENERAL', 'OTRO');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('SEGURO', 'VERIFICACION', 'TENENCIA', 'TARJETA_CIRCULACION', 'OTRO');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('LINEAL_TIEMPO', 'POR_KILOMETRO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'DEPOSITO', 'CHEQUE', 'OTRO');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('ANTICIPO', 'PAGO_FINAL', 'PARCIAL', 'REEMBOLSO');

-- CreateEnum
CREATE TYPE "ExpenseGroup" AS ENUM ('DIRECTO', 'FIJO', 'FLOTILLA', 'EXTRAORDINARIO');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PRESTAMO_RECIBIDO', 'APORTACION_CAPITAL', 'COMPRA_ACTIVO', 'PAGO_FINANCIAMIENTO', 'INGRESO_EXTRAORDINARIO', 'GASTO_EXTRAORDINARIO', 'RETIRO_SOCIOS');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "userId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "granted" BOOLEAN NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("userId","permissionId")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "folio_counters" (
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "folio_counters_pkey" PRIMARY KEY ("prefix","year")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "email" TEXT,
    "channel" "ContactChannel",
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID,
    "street" TEXT,
    "extNumber" TEXT,
    "intNumber" TEXT,
    "neighborhood" TEXT,
    "municipality" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "references" TEXT,
    "floor" INTEGER,
    "hasElevator" BOOLEAN,
    "accessConditions" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "registeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "ContactChannel" NOT NULL DEFAULT 'WHATSAPP',
    "tentativeDate" DATE,
    "tentativeTime" TEXT,
    "serviceType" "ServiceType" NOT NULL,
    "originAddressId" UUID,
    "destinationAddressId" UUID,
    "inventorySummary" TEXT,
    "itemsDescription" TEXT,
    "observations" TEXT,
    "specialManeuvers" TEXT,
    "needsPacking" BOOLEAN NOT NULL DEFAULT false,
    "suggestedVehicleId" UUID,
    "package" "PackageType",
    "status" "RequestStatus" NOT NULL DEFAULT 'NUEVA',
    "lastContactAt" TIMESTAMPTZ(3),
    "nextContactAt" TIMESTAMPTZ(3),
    "lostReason" TEXT,
    "cancelReason" TEXT,
    "estimatedKm" DECIMAL(10,2),
    "estimatedVolumeM3" DECIMAL(10,2),
    "requiredStaff" INTEGER,
    "estimatedExpenses" DECIMAL(12,2),
    "currentQuoteId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "source" "QuoteSource" NOT NULL DEFAULT 'MANUAL',
    "manualPrice" DECIMAL(12,2) NOT NULL,
    "calculatedPrice" DECIMAL(12,2),
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "includesVat" BOOLEAN NOT NULL DEFAULT false,
    "quotedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATE,
    "notes" TEXT,
    "calculatorInput" JSONB,
    "calculatorOutput" JSONB,
    "calculatorVer" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestId" UUID NOT NULL,
    "type" "RequestEventType" NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus",
    "contactAt" TIMESTAMPTZ(3),
    "nextContactAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "data" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "requestId" UUID,
    "clientId" UUID NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'POR_PROGRAMAR',
    "serviceType" "ServiceType" NOT NULL,
    "package" "PackageType",
    "scheduledStart" TIMESTAMPTZ(3),
    "estimatedEnd" TIMESTAMPTZ(3),
    "prepMinutes" INTEGER NOT NULL DEFAULT 30,
    "returnMinutes" INTEGER NOT NULL DEFAULT 60,
    "originAddressId" UUID,
    "destinationAddressId" UUID,
    "contractedPrice" DECIMAL(12,2) NOT NULL,
    "includesVat" BOOLEAN NOT NULL DEFAULT false,
    "inventory" TEXT,
    "observations" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "actualStart" TIMESTAMPTZ(3),
    "actualEnd" TIMESTAMPTZ(3),
    "incidents" TEXT,
    "closingNotes" TEXT,
    "deliveryEvidence" TEXT,
    "operationalClosedAt" TIMESTAMPTZ(3),
    "operationalClosedById" UUID,
    "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "financialClosedAt" TIMESTAMPTZ(3),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "role" "StaffRole" NOT NULL,
    "agreedPay" DECIMAL(12,2) NOT NULL,
    "participated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_reschedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceId" UUID NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "reason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_reschedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflict_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceId" UUID NOT NULL,
    "type" "ConflictType" NOT NULL,
    "resourceId" UUID NOT NULL,
    "conflictingServiceId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "authorizedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conflict_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "position" "WorkerPosition" NOT NULL,
    "hireDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "baseSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payType" "PayType" NOT NULL DEFAULT 'POR_SERVICIO',
    "notes" TEXT,
    "legalData" JSONB,
    "userId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceType" "ServiceType" NOT NULL,
    "role" "StaffRole" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pay_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workerId" UUID NOT NULL,
    "serviceId" UUID,
    "serviceStaffId" UUID,
    "kind" "PayrollEntryKind" NOT NULL,
    "concept" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PayrollEntryStatus" NOT NULL DEFAULT 'GENERADO',
    "paymentId" UUID,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "workerId" UUID NOT NULL,
    "periodType" "PeriodType",
    "periodStart" DATE,
    "periodEnd" DATE,
    "paidAt" TIMESTAMPTZ(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "plates" TEXT,
    "vin" TEXT,
    "capacity" TEXT,
    "acquisitionDate" DATE,
    "acquisitionPrice" DECIMAL(12,2),
    "residualValue" DECIMAL(12,2),
    "usefulLifeYears" INTEGER,
    "usefulLifeKm" INTEGER,
    "initialOdometer" INTEGER NOT NULL DEFAULT 0,
    "currentOdometer" INTEGER NOT NULL DEFAULT 0,
    "estimatedKmPerLiter" DECIMAL(6,2),
    "gps" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odometer_readings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL,
    "serviceId" UUID,
    "readingAt" TIMESTAMPTZ(3) NOT NULL,
    "odometer" INTEGER NOT NULL,
    "source" "OdometerSource" NOT NULL,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odometer_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL,
    "serviceId" UUID,
    "date" TIMESTAMPTZ(3) NOT NULL,
    "liters" DECIMAL(10,2) NOT NULL,
    "odometer" INTEGER,
    "station" TEXT,
    "expenseId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "date" DATE NOT NULL,
    "odometer" INTEGER,
    "description" TEXT,
    "provider" TEXT,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nextDate" DATE,
    "nextOdometer" INTEGER,
    "expenseId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "description" TEXT,
    "number" TEXT,
    "provider" TEXT,
    "issuedAt" DATE,
    "expiresAt" DATE,
    "amount" DECIMAL(12,2),
    "paidAt" DATE,
    "expenseId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicleId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "method" "DepreciationMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "basis" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "serviceId" UUID NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "ExpenseGroup" NOT NULL,
    "parentId" UUID,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "serviceId" UUID,
    "vehicleId" UUID,
    "date" DATE NOT NULL,
    "paidAt" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "supplier" TEXT,
    "description" TEXT NOT NULL,
    "method" "PaymentMethod",
    "reference" TEXT,
    "recurringId" UUID,
    "recurringPeriod" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "includesVat" BOOLEAN NOT NULL DEFAULT false,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "interestPortion" DECIMAL(12,2),
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "vehicleId" UUID,
    "cancelledAt" TIMESTAMPTZ(3),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "requestId" UUID,
    "serviceId" UUID,
    "vehicleId" UUID,
    "maintenanceId" UUID,
    "documentId" UUID,
    "expenseId" UUID,
    "paymentId" UUID,
    "workerId" UUID,
    "uploadedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON "notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");

-- CreateIndex
CREATE INDEX "clients_phoneNormalized_idx" ON "clients"("phoneNormalized");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "requests_folio_key" ON "requests"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "requests_currentQuoteId_key" ON "requests"("currentQuoteId");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "requests_registeredAt_idx" ON "requests"("registeredAt");

-- CreateIndex
CREATE INDEX "requests_clientId_idx" ON "requests"("clientId");

-- CreateIndex
CREATE INDEX "requests_nextContactAt_idx" ON "requests"("nextContactAt");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_requestId_versionNumber_key" ON "quotes"("requestId", "versionNumber");

-- CreateIndex
CREATE INDEX "request_events_requestId_createdAt_idx" ON "request_events"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "services_folio_key" ON "services"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "services_requestId_key" ON "services"("requestId");

-- CreateIndex
CREATE INDEX "services_status_idx" ON "services"("status");

-- CreateIndex
CREATE INDEX "services_scheduledStart_idx" ON "services"("scheduledStart");

-- CreateIndex
CREATE INDEX "services_clientId_idx" ON "services"("clientId");

-- CreateIndex
CREATE INDEX "service_vehicles_vehicleId_idx" ON "service_vehicles"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "service_vehicles_serviceId_vehicleId_key" ON "service_vehicles"("serviceId", "vehicleId");

-- CreateIndex
CREATE INDEX "service_staff_workerId_idx" ON "service_staff"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "service_staff_serviceId_workerId_key" ON "service_staff"("serviceId", "workerId");

-- CreateIndex
CREATE INDEX "service_reschedules_serviceId_idx" ON "service_reschedules"("serviceId");

-- CreateIndex
CREATE INDEX "conflict_overrides_serviceId_idx" ON "conflict_overrides"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "workers_code_key" ON "workers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workers_userId_key" ON "workers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_rates_serviceType_role_effectiveFrom_key" ON "pay_rates"("serviceType", "role", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_serviceStaffId_key" ON "payroll_entries"("serviceStaffId");

-- CreateIndex
CREATE INDEX "payroll_entries_workerId_date_idx" ON "payroll_entries"("workerId", "date");

-- CreateIndex
CREATE INDEX "payroll_entries_serviceId_idx" ON "payroll_entries"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payments_folio_key" ON "payroll_payments"("folio");

-- CreateIndex
CREATE INDEX "payroll_payments_workerId_paidAt_idx" ON "payroll_payments"("workerId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_code_key" ON "vehicles"("code");

-- CreateIndex
CREATE INDEX "odometer_readings_vehicleId_readingAt_idx" ON "odometer_readings"("vehicleId", "readingAt");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_logs_expenseId_key" ON "fuel_logs"("expenseId");

-- CreateIndex
CREATE INDEX "fuel_logs_vehicleId_date_idx" ON "fuel_logs"("vehicleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_expenseId_key" ON "maintenances"("expenseId");

-- CreateIndex
CREATE INDEX "maintenances_vehicleId_date_idx" ON "maintenances"("vehicleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_documents_expenseId_key" ON "vehicle_documents"("expenseId");

-- CreateIndex
CREATE INDEX "vehicle_documents_expiresAt_idx" ON "vehicle_documents"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_entries_vehicleId_year_month_method_key" ON "depreciation_entries"("vehicleId", "year", "month", "method");

-- CreateIndex
CREATE UNIQUE INDEX "payments_folio_key" ON "payments"("folio");

-- CreateIndex
CREATE INDEX "payments_serviceId_idx" ON "payments"("serviceId");

-- CreateIndex
CREATE INDEX "payments_receivedAt_idx" ON "payments"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_key_key" ON "expense_categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_folio_key" ON "expenses"("folio");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_serviceId_idx" ON "expenses"("serviceId");

-- CreateIndex
CREATE INDEX "expenses_vehicleId_idx" ON "expenses"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_recurringId_recurringPeriod_key" ON "expenses"("recurringId", "recurringPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "financial_movements_folio_key" ON "financial_movements"("folio");

-- CreateIndex
CREATE INDEX "financial_movements_date_idx" ON "financial_movements"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storageKey_key" ON "attachments"("storageKey");

-- CreateIndex
CREATE INDEX "attachments_requestId_idx" ON "attachments"("requestId");

-- CreateIndex
CREATE INDEX "attachments_serviceId_idx" ON "attachments"("serviceId");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_originAddressId_fkey" FOREIGN KEY ("originAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_destinationAddressId_fkey" FOREIGN KEY ("destinationAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_suggestedVehicleId_fkey" FOREIGN KEY ("suggestedVehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_currentQuoteId_fkey" FOREIGN KEY ("currentQuoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_originAddressId_fkey" FOREIGN KEY ("originAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_destinationAddressId_fkey" FOREIGN KEY ("destinationAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_vehicles" ADD CONSTRAINT "service_vehicles_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_vehicles" ADD CONSTRAINT "service_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_reschedules" ADD CONSTRAINT "service_reschedules_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_overrides" ADD CONSTRAINT "conflict_overrides_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_serviceStaffId_fkey" FOREIGN KEY ("serviceStaffId") REFERENCES "service_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payroll_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_movements" ADD CONSTRAINT "financial_movements_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "vehicle_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
