import { execSync } from "node:child_process";
import { testDbUrl, testDb } from "./helpers";
import { seed } from "../prisma/seed";

/** Aplica las migraciones pendientes a la base de datos de PRUEBAS (no destructivo) y siembra catálogos. */
export default async function setup() {
  const url = testDbUrl();
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
  const db = testDb();
  await seed(db, { withAdmin: false, withVehicles: false });
  await db.$disconnect();
}
