import type { Prisma } from "@prisma/client";
import type { Db } from "../db";
import { mexicoLocalToUtc } from "../format";

export type CompletedFilters = { mes?: string; unidad?: string; cobro?: string; tipo?: string; q?: string };

export function completedWhere(f: CompletedFilters): Prisma.ServiceWhereInput {
  const and: Prisma.ServiceWhereInput[] = [{ status: "FINALIZADO" }];
  if (f.mes && /^\d{4}-\d{2}$/.test(f.mes)) {
    const [y, m] = f.mes.split("-").map(Number);
    and.push({ actualStart: { gte: mexicoLocalToUtc(y, m, 1), lt: m === 12 ? mexicoLocalToUtc(y + 1, 1, 1) : mexicoLocalToUtc(y, m + 1, 1) } });
  }
  if (f.unidad) and.push({ vehicles: { some: { vehicleId: f.unidad } } });
  if (f.cobro === "PENDIENTE" || f.cobro === "PARCIAL" || f.cobro === "LIQUIDADO") and.push({ collectionStatus: f.cobro });
  if (f.tipo === "LOCAL" || f.tipo === "FORANEO" || f.tipo === "FLETE" || f.tipo === "OTRO") and.push({ serviceType: f.tipo });
  const q = f.q?.trim();
  if (q) and.push({ OR: [{ folio: { contains: q, mode: "insensitive" } }, { client: { name: { contains: q, mode: "insensitive" } } }, { request: { folio: { contains: q, mode: "insensitive" } } }] });
  return { AND: and };
}

/** Servicios realizados con sus cifras directas calculadas desde las tablas origen (sin copias). */
export async function completedServices(db: Db, f: CompletedFilters, page?: { skip: number; take: number }) {
  const rows = await db.service.findMany({
    where: completedWhere(f),
    include: {
      client: true, request: { select: { folio: true } }, originAddress: true, destinationAddress: true, vehicles: { include: { vehicle: true } },
      payments: { where: { cancelledAt: null } }, expenses: { where: { cancelledAt: null } },
      payrollEntries: { where: { status: { not: "CANCELADO" } } }, odometerReadings: true,
    },
    orderBy: { actualStart: "desc" },
    ...(page ?? {}),
  });
  return rows.map((s) => {
    const cobrado = s.payments.reduce((a, p) => a + (p.kind === "REEMBOLSO" ? -1 : 1) * Number(p.amount), 0);
    const directos = s.expenses.reduce((a, e) => a + Number(e.total), 0);
    const nomina = s.payrollEntries.reduce((a, p) => a + Number(p.amount), 0);
    let km = 0;
    for (const r of s.odometerReadings) km += r.source === "SERVICIO_FIN" ? r.odometer : r.source === "SERVICIO_INICIO" ? -r.odometer : 0;
    const precio = Number(s.contractedPrice);
    return { s, precio, cobrado, saldo: precio - cobrado, directos, nomina, margen: precio - directos - nomina, km };
  });
}
