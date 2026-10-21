import type { Db } from "./db";
import type { Prisma } from "@prisma/client";

export type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

/** Convierte Decimal/Date/BigInt a JSON plano. */
function toJson(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined || v === null) return undefined;
  return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val)));
}

/** Registra un cambio importante. Usar dentro de la transacción de la operación. */
export async function audit(db: Db, a: AuditInput) {
  await db.auditLog.create({
    data: {
      userId: a.userId ?? null,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId ?? null,
      summary: a.summary,
      before: toJson(a.before),
      after: toJson(a.after),
      ip: a.ip ?? null,
    },
  });
}
