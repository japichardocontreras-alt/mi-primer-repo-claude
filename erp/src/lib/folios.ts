import type { Db } from "./db";
import { mexicoParts } from "./format";

/** Prefijos de folios visibles. */
export const FOLIO = {
  SOLICITUD: "SOL",
  SERVICIO: "MM",
  CLIENTE: "CLI",
  TRABAJADOR: "EMP",
  COBRO: "COB",
  GASTO: "GAS",
  NOMINA: "NOM",
  MOVIMIENTO: "MOV",
} as const;

export type FolioPrefix = (typeof FOLIO)[keyof typeof FOLIO];

/** Prefijos cuyo consecutivo no reinicia por año (catálogos). */
const NO_YEAR: FolioPrefix[] = [FOLIO.CLIENTE, FOLIO.TRABAJADOR];

/**
 * Genera el siguiente folio de forma atómica en el servidor.
 * Debe llamarse dentro de la misma transacción que crea el registro: el
 * UPSERT bloquea la fila del contador hasta el COMMIT, por lo que dos usuarios
 * simultáneos nunca obtienen el mismo número y un ROLLBACK no deja huecos.
 */
export async function nextFolio(db: Db, prefix: FolioPrefix, at: Date = new Date()): Promise<string> {
  const yearless = NO_YEAR.includes(prefix);
  const year = yearless ? 0 : mexicoParts(at).year;
  const rows = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO "folio_counters" ("prefix", "year", "value") VALUES (${prefix}, ${year}, 1)
    ON CONFLICT ("prefix", "year") DO UPDATE SET "value" = "folio_counters"."value" + 1
    RETURNING "value"`;
  const n = Number(rows[0].value);
  return yearless ? `${prefix}-${String(n).padStart(6, "0")}` : `${prefix}-${year}-${String(n).padStart(6, "0")}`;
}
