import type { Prisma } from "@prisma/client";
import type { Db } from "../db";
import { mexicoLocalToUtc, mexicoParts } from "../format";
import { serviceInclude } from "../domain/services";

export type Ymd = { y: number; m: number; d: number };

export const ymdKey = (x: Ymd) => `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`;
export const parseYmd = (s?: string): Ymd | null => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
};
export const todayMx = (): Ymd => {
  const p = mexicoParts();
  return { y: p.year, m: p.month, d: p.day };
};
/** Suma días a una fecha calendario. */
export const addDays = (x: Ymd, n: number): Ymd => {
  const t = new Date(Date.UTC(x.y, x.m - 1, x.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};
/** Lunes de la semana de la fecha (0 = lunes). */
export const mondayOf = (x: Ymd): Ymd => {
  const dow = (new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay() + 6) % 7;
  return addDays(x, -dow);
};
export const dayStartUtc = (x: Ymd) => mexicoLocalToUtc(x.y, x.m, x.d);

/** Cuadrícula de 6 semanas (lunes a domingo) que contiene el mes. */
export function monthGrid(y: number, m: number): Ymd[][] {
  const first = mondayOf({ y, m, d: 1 });
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(first, w * 7 + i)));
}

export type AgendaFilters = { unidad?: string; estado?: string; canceladas?: boolean };

/** Servicios cuyo periodo [inicio, fin] toca el rango [from, to). */
export async function servicesInRange(db: Db, from: Date, to: Date, f: AgendaFilters) {
  const where: Prisma.ServiceWhereInput = {
    scheduledStart: { lt: to },
    estimatedEnd: { gt: from },
    ...(f.estado ? { status: f.estado as Prisma.EnumServiceStatusFilter["equals"] } : f.canceladas ? {} : { status: { not: "CANCELADO" } }),
    ...(f.unidad ? { vehicles: { some: { vehicleId: f.unidad } } } : {}),
  };
  return db.service.findMany({ where, include: serviceInclude, orderBy: { scheduledStart: "asc" } });
}

export type AgendaService = Awaited<ReturnType<typeof servicesInRange>>[number];

/** Servicios que ocupan un día calendario (hora de México); los de varios días aparecen en cada día. */
export function servicesOnDay(list: AgendaService[], day: Ymd) {
  const s = dayStartUtc(day);
  const e = dayStartUtc(addDays(day, 1));
  return list.filter((x) => x.scheduledStart! < e && x.estimatedEnd! > s);
}

const PALETTE = [
  "border-l-sky-500 bg-sky-50 text-sky-950",
  "border-l-emerald-500 bg-emerald-50 text-emerald-950",
  "border-l-violet-500 bg-violet-50 text-violet-950",
  "border-l-amber-500 bg-amber-50 text-amber-950",
  "border-l-rose-500 bg-rose-50 text-rose-950",
  "border-l-cyan-500 bg-cyan-50 text-cyan-950",
];
/** Color estable por unidad (para distinguir camionetas en el calendario). */
export function vehicleColor(vehicleIds: string[], allVehicleIds: string[]) {
  if (!vehicleIds.length) return "border-l-neutral-400 bg-neutral-50 text-neutral-900";
  const idx = allVehicleIds.indexOf(vehicleIds[0]);
  return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length];
}
