import { Prisma } from "@prisma/client";
import type { Db } from "../db";
import { mexicoMonthRange, mexicoParts, mexicoLocalToUtc } from "../format";
import { getSetting } from "../settings";

const OPEN_REQUEST_STATUSES = ["NUEVA", "INFORMACION_INCOMPLETA", "PENDIENTE_COTIZAR", "COTIZACION_ENVIADA", "PENDIENTE_CONFIRMACION"] as const;

/**
 * Cuentas por cobrar = Σ precio contratado de servicios no cancelados
 *                     − Σ cobros vigentes (los reembolsos restan a lo cobrado).
 */
export async function accountsReceivable(db: Db): Promise<number> {
  const rows = await db.$queryRaw<{ total: Prisma.Decimal | null }[]>`
    SELECT COALESCE(SUM(s."contractedPrice" - COALESCE(p.cobrado, 0)), 0) AS total
    FROM "services" s
    LEFT JOIN (
      SELECT "serviceId", SUM(CASE WHEN "kind" = 'REEMBOLSO' THEN -"amount" ELSE "amount" END) AS cobrado
      FROM "payments" WHERE "cancelledAt" IS NULL GROUP BY "serviceId"
    ) p ON p."serviceId" = s."id"
    WHERE s."status" <> 'CANCELADO'`;
  return Number(rows[0]?.total ?? 0);
}

export async function homeSummary(db: Db, now = new Date()) {
  const p = mexicoParts(now);
  const month = mexicoMonthRange(p.year, p.month);
  const endOfToday = mexicoLocalToUtc(p.year, p.month, p.day + 1);
  const in7days = new Date(now.getTime() + 7 * 86400_000);
  const alertas = await getSetting(db, "alertas");
  const docLimit = new Date(Date.UTC(p.year, p.month - 1, p.day + alertas.diasAvisoDocumentos));

  const [requestsMonth, followUps, followUpList, upcoming, activeVehicles, docsExpiring, servicesMonth] = await Promise.all([
    db.request.count({ where: { registeredAt: { gte: month.start, lt: month.end } } }),
    db.request.count({ where: { status: { in: [...OPEN_REQUEST_STATUSES] }, nextContactAt: { lt: endOfToday } } }),
    db.request.findMany({
      where: { status: { in: [...OPEN_REQUEST_STATUSES] }, nextContactAt: { lt: endOfToday } },
      include: { client: true },
      orderBy: { nextContactAt: "asc" },
      take: 8,
    }),
    db.service.findMany({
      where: { scheduledStart: { gte: now, lt: in7days }, status: { notIn: ["CANCELADO", "FINALIZADO"] } },
      include: { client: true, vehicles: { include: { vehicle: true } } },
      orderBy: { scheduledStart: "asc" },
      take: 8,
    }),
    db.vehicle.count({ where: { active: true, status: "ACTIVA" } }),
    db.vehicleDocument.count({ where: { expiresAt: { lte: docLimit }, vehicle: { active: true } } }),
    db.service.count({ where: { status: "FINALIZADO", actualEnd: { gte: month.start, lt: month.end } } }),
  ]);

  return { requestsMonth, followUps, followUpList, upcoming, activeVehicles, docsExpiring, servicesMonth, month: p };
}
