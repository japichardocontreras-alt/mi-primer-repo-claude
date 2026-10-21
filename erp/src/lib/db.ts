import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

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
