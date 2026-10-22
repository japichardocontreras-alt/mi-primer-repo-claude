import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

if (existsSync(".env") && !process.env.TEST_DATABASE_URL) process.loadEnvFile(".env");

export function testDbUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Defina TEST_DATABASE_URL para ejecutar las pruebas.");
  // Salvaguarda: nunca correr pruebas contra la base de datos real.
  if (!/test/i.test(new URL(url).pathname)) throw new Error("TEST_DATABASE_URL debe apuntar a una base de datos cuyo nombre contenga 'test'.");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL no puede ser igual a DATABASE_URL.");
  return url;
}

export function testDb() {
  return new PrismaClient({ datasourceUrl: testDbUrl() });
}

/** Vacía las tablas de datos (conserva catálogos: roles, permisos, categorías, settings). */
export async function truncateData(db: PrismaClient) {
  await db.$executeRawUnsafe(`
    TRUNCATE "attachments","payments","expenses","fuel_logs","maintenances","vehicle_documents","depreciation_entries",
      "financial_movements","recurring_expenses","payroll_entries","payroll_payments","service_staff","service_vehicles",
      "service_reschedules","conflict_overrides","odometer_readings","services","request_events","quotes","requests",
      "addresses","clients","workers","pay_rates","notifications","sessions","user_permissions","users","folio_counters",
      "audit_logs","vehicles" RESTART IDENTITY CASCADE`);
}
