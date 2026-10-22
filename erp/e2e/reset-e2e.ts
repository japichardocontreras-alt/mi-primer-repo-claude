/**
 * Prepara la base AISLADA de pruebas de navegador: aplica migraciones, vacía TODOS los datos
 * y vuelve a sembrar catálogos, unidades iniciales y un administrador de prueba.
 * Salvaguardas: E2E_DATABASE_URL debe contener «e2e» en el nombre y ser distinta de DATABASE_URL.
 *
 *   E2E_DATABASE_URL=postgresql://…/erp_e2e npx tsx e2e/reset-e2e.ts
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { seed } from "../prisma/seed";

if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.E2E_DATABASE_URL;
if (!url) throw new Error("Defina E2E_DATABASE_URL.");
if (!/e2e/i.test(new URL(url).pathname)) throw new Error("E2E_DATABASE_URL debe apuntar a una base cuyo nombre contenga 'e2e'.");
if (url === process.env.DATABASE_URL || url === process.env.TEST_DATABASE_URL) throw new Error("E2E_DATABASE_URL no puede ser la base real ni la de pruebas unitarias.");

execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
process.env.SEED_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@e2e.mx";
process.env.SEED_ADMIN_PASSWORD = process.env.E2E_ADMIN_TEMP_PASSWORD ?? "TemporalE2e2026";
process.env.SEED_ADMIN_NAME = "Administrador";

(async () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  // Los triggers de inmutabilidad (auditoría, cotizaciones, odómetro) impiden UPDATE/DELETE, no TRUNCATE.
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await seed(db, { withAdmin: true, withVehicles: true });
  await db.$disconnect();
  console.log("✔ Base e2e lista:", new URL(url).pathname.slice(1));
})().catch((e) => { console.error(e); process.exit(1); });
