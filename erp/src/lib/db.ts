import { PrismaClient, Prisma } from "@prisma/client";
import { isConnectionError } from "./db-errors";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Cubre el pool por defecto de Prisma (2 × núcleos + 1) en servidores de hasta 8 núcleos. */
const STALE_RETRIES = 18;
const READ_OPS = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);

/**
 * Tras un reinicio de PostgreSQL, las conexiones guardadas en el pool quedan cerradas y la primera
 * consulta en cada una falla al instante (P1017) y esa conexión se descarta. Las LECTURAS se reintentan
 * (no tienen efectos): ante conexiones cerradas, tantas veces como conexiones pueda tener el pool;
 * si el servidor no responde, una sola vez (cada intento espera el tiempo de conexión).
 * Las escrituras nunca se reintentan solas: el usuario recibe «No hay conexión…» y decide.
 */
function createClient() {
  const base = new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
  return base.$extends({
    query: {
      async $allOperations({ operation, args, query }) {
        if (!READ_OPS.has(operation)) return query(args);
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            if (!isConnectionError(e)) throw e;
            const stale = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P1017";
            if (attempt >= (stale ? STALE_RETRIES : 2)) throw e;
            await new Promise((r) => setTimeout(r, stale ? 20 : 300));
          }
        }
      },
    },
  }) as unknown as PrismaClient; // misma API; la extensión solo agrega el reintento
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Cliente transaccional o normal: las funciones de dominio aceptan ambos. */
export type Db = PrismaClient | Prisma.TransactionClient;

/** Transacción (READ COMMITTED + bloqueos explícitos donde se requieren) con reintento ante conflictos (P2034). */
export async function withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, client: PrismaClient = prisma): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await client.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 });
    } catch (e) {
      if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") continue;
      throw e;
    }
  }
}
