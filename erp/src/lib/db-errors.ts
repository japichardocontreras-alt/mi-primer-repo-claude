import { Prisma } from "@prisma/client";

/** Códigos de Prisma por servidor inaccesible, tiempo agotado, conexión cerrada o pool saturado. */
const CONNECTION_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

/** ¿El error se debe a que la base de datos no está disponible (y no a los datos)? */
export function isConnectionError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError && CONNECTION_CODES.has(e.code)) return true;
  if (e instanceof Prisma.PrismaClientUnknownRequestError || e instanceof Prisma.PrismaClientRustPanicError) {
    return /connect|connection|closed|terminat|timed out/i.test(e.message);
  }
  return false;
}
