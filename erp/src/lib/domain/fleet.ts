import { z } from "zod";
import type { Prisma, VehicleDocumentType, MaintenanceType } from "@prisma/client";
import type { Db } from "../db";
import { audit } from "../audit";
import { BusinessError } from "../errors";
import { mexicoLocalToUtc, mexicoParts } from "../format";
import { getSetting } from "../settings";
import { checkbox, money, optDateOnly, optNumber, optText, reqText } from "../validation";
import { createExpense, cancelExpense } from "./expenses";
import { perKilometer, straightLine, type DepParams } from "./depreciation";

type Tx = Prisma.TransactionClient;

export const VEHICLE_STATUS = { ACTIVA: { label: "Activa", tone: "green" }, EN_TALLER: { label: "En taller", tone: "amber" }, FUERA_DE_SERVICIO: { label: "Fuera de servicio", tone: "red" }, BAJA: { label: "Baja", tone: "neutral" } } as const;
export const MAINTENANCE_TYPE: Record<MaintenanceType, string> = {
  CAMBIO_ACEITE: "Cambio de aceite", AFINACION: "Afinación", FRENOS: "Frenos", SUSPENSION: "Suspensión", LLANTAS: "Llantas",
  REPARACION: "Reparación", SERVICIO_GENERAL: "Servicio general", OTRO: "Otro",
};
export const DOCUMENT_TYPE: Record<VehicleDocumentType, string> = { SEGURO: "Seguro", VERIFICACION: "Verificación", TENENCIA: "Tenencia", TARJETA_CIRCULACION: "Tarjeta de circulación", OTRO: "Otro documento" };

// ------------------------------------------------------------------ Unidades

export const vehicleSchema = z
  .object({
    code: z.preprocess((v) => (typeof v === "string" ? v.trim().toUpperCase() : v), z.string({ required_error: "Indique el identificador." }).min(2, "Indique el identificador.").max(30).regex(/^[A-Z0-9#._-]+$/, "Use letras, números, guion o punto.")),
    name: reqText("el nombre", 80),
    brand: optText(60), model: optText(60),
    year: optNumber({ int: true, min: 1950, max: 2100 }),
    plates: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined), z.string().max(15).optional()),
    vin: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined), z.string().max(30).optional()),
    capacity: optText(60),
    acquisitionDate: optDateOnly(),
    acquisitionPrice: money("el precio de adquisición"),
    residualValue: money("el valor residual"),
    usefulLifeYears: optNumber({ int: true, min: 1, max: 50 }),
    usefulLifeKm: optNumber({ int: true, min: 1000, max: 5_000_000 }),
    initialOdometer: optNumber({ int: true, min: 0, max: 5_000_000 }),
    estimatedKmPerLiter: optNumber({ min: 0.5, max: 50 }),
    gps: optText(150),
    status: z.enum(["ACTIVA", "EN_TALLER", "FUERA_DE_SERVICIO", "BAJA"]).default("ACTIVA"),
    notes: optText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.residualValue !== undefined && v.acquisitionPrice !== undefined && v.residualValue > v.acquisitionPrice) ctx.addIssue({ code: "custom", path: ["residualValue"], message: "El valor residual no puede ser mayor al precio." });
  });
export type VehicleInput = z.infer<typeof vehicleSchema>;

const vehicleData = (v: VehicleInput) => ({
  code: v.code, name: v.name, brand: v.brand ?? null, model: v.model ?? null, year: v.year ?? null, plates: v.plates ?? null, vin: v.vin ?? null,
  capacity: v.capacity ?? null, acquisitionDate: v.acquisitionDate ?? null, acquisitionPrice: v.acquisitionPrice ?? null, residualValue: v.residualValue ?? null,
  usefulLifeYears: v.usefulLifeYears ?? null, usefulLifeKm: v.usefulLifeKm ?? null, estimatedKmPerLiter: v.estimatedKmPerLiter ?? null,
  gps: v.gps ?? null, status: v.status, notes: v.notes ?? null,
});

async function checkPlates(tx: Tx, plates: string | undefined, excludeId?: string) {
  if (!plates) return;
  const dup = await tx.vehicle.findFirst({ where: { plates: { equals: plates, mode: "insensitive" }, active: true, ...(excludeId ? { id: { not: excludeId } } : {}) } });
  if (dup) throw new BusinessError(`Las placas ${plates} ya están registradas en ${dup.name}.`);
}

export async function createVehicle(tx: Tx, actorId: string, v: VehicleInput) {
  if (await tx.vehicle.findUnique({ where: { code: v.code } })) throw new BusinessError(`Ya existe una unidad con el identificador ${v.code}.`);
  await checkPlates(tx, v.plates);
  const init = v.initialOdometer ?? 0;
  const veh = await tx.vehicle.create({ data: { ...vehicleData(v), initialOdometer: init, currentOdometer: init, active: v.status !== "BAJA" } });
  await audit(tx, { userId: actorId, action: "CREAR", entity: "Vehiculo", entityId: veh.id, summary: `${veh.code} ${veh.name}`, after: v });
  return veh;
}

export async function updateVehicle(tx: Tx, actorId: string, id: string, version: number, v: VehicleInput) {
  const before = await tx.vehicle.findUniqueOrThrow({ where: { id } });
  if (v.code !== before.code && (await tx.vehicle.findUnique({ where: { code: v.code } }))) throw new BusinessError(`Ya existe una unidad con el identificador ${v.code}.`);
  await checkPlates(tx, v.plates, id);
  const readings = await tx.odometerReading.count({ where: { vehicleId: id } });
  const init = v.initialOdometer ?? before.initialOdometer;
  if (init !== before.initialOdometer && readings > 0) throw new BusinessError("El kilometraje inicial no puede cambiarse porque la unidad ya tiene lecturas registradas.");
  if (v.status === "BAJA" || v.status === "FUERA_DE_SERVICIO" || v.status === "EN_TALLER") {
    const upcoming = await tx.service.findMany({ where: { vehicles: { some: { vehicleId: id } }, status: { in: ["PROGRAMADO", "CONFIRMADO", "POR_PROGRAMAR"] }, scheduledStart: { gt: new Date() } }, select: { folio: true }, take: 5 });
    if (upcoming.length && v.status !== before.status) throw new BusinessError(`La unidad tiene servicios programados (${upcoming.map((s) => s.folio).join(", ")}). Reasígnelos antes de cambiar su estado.`);
  }
  const res = await tx.vehicle.updateMany({
    where: { id, version },
    data: { ...vehicleData(v), initialOdometer: init, currentOdometer: Math.max(before.currentOdometer, init), active: v.status !== "BAJA", version: { increment: 1 } },
  });
  if (res.count === 0) throw new BusinessError("Otro usuario modificó esta unidad. Recargue la página.");
  await audit(tx, { userId: actorId, action: "EDITAR", entity: "Vehiculo", entityId: id, summary: before.code, before: { code: before.code, name: before.name, plates: before.plates, status: before.status, acquisitionPrice: before.acquisitionPrice, residualValue: before.residualValue, usefulLifeYears: before.usefulLifeYears, usefulLifeKm: before.usefulLifeKm }, after: v });
}

// ------------------------------------------------------------------ Odómetro

async function lockVehicle(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "vehicles" WHERE "id" = ${id}::uuid FOR UPDATE`;
  if (!rows.length) throw new BusinessError("La unidad no existe.");
  return tx.vehicle.findUniqueOrThrow({ where: { id } });
}

/** Valida una lectura contra las del historial (antes y después de su fecha). */
async function checkReading(tx: Tx, vehicleId: string, at: Date, odometer: number, confirm: boolean) {
  const veh = await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  const before = await tx.odometerReading.findFirst({ where: { vehicleId, readingAt: { lte: at } }, orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }] });
  const after = await tx.odometerReading.findFirst({ where: { vehicleId, readingAt: { gt: at } }, orderBy: [{ readingAt: "asc" }] });
  const min = before?.odometer ?? veh.initialOdometer;
  if (odometer < min && !confirm) throw Object.assign(new BusinessError(`El kilometraje (${odometer.toLocaleString("es-MX")}) es menor a la lectura anterior (${min.toLocaleString("es-MX")}). Verifique o confirme.`), { code: "ODOMETER_CHECK" });
  if (after && odometer > after.odometer && !confirm) throw Object.assign(new BusinessError(`El kilometraje es mayor a una lectura posterior (${after.odometer.toLocaleString("es-MX")}). Verifique la fecha o confirme.`), { code: "ODOMETER_CHECK" });
}

export async function recordOdometer(tx: Tx, actorId: string, vehicleId: string, at: Date, odometer: number, source: "MANUAL" | "MANTENIMIENTO" | "COMBUSTIBLE", notes: string | null, confirm = false) {
  const veh = await lockVehicle(tx, vehicleId);
  await checkReading(tx, vehicleId, at, odometer, confirm);
  const r = await tx.odometerReading.create({ data: { vehicleId, readingAt: at, odometer, source, notes, createdById: actorId } });
  if (odometer > veh.currentOdometer) await tx.vehicle.update({ where: { id: vehicleId }, data: { currentOdometer: odometer } });
  return r;
}

export const odometerSchema = z.object({
  readingAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Fecha no válida."),
  odometer: z.preprocess((v) => Number(String(v ?? "").replace(/[,\s]/g, "")), z.number({ invalid_type_error: "Kilometraje no válido." }).int("Debe ser entero.").min(0).max(5_000_000)),
  notes: optText(300),
  confirm: checkbox(),
});

const localToUtc = (s: string) => {
  const [d, t] = s.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return mexicoLocalToUtc(y, m, day, h, min);
};
export { localToUtc };

// ------------------------------------------------------------------ Mantenimientos

export const maintenanceSchema = z.object({
  type: z.enum(["CAMBIO_ACEITE", "AFINACION", "FRENOS", "SUSPENSION", "LLANTAS", "REPARACION", "SERVICIO_GENERAL", "OTRO"], { errorMap: () => ({ message: "Seleccione el tipo." }) }),
  date: z.string({ required_error: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida."),
  odometer: optNumber({ int: true, min: 0, max: 5_000_000 }),
  description: optText(1000),
  provider: optText(150),
  cost: money("el costo"),
  vatAmount: money("el IVA"),
  paid: z.preprocess((v) => v === undefined ? true : v === true || v === "on", z.boolean()),
  method: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "CHEQUE", "OTRO"]).optional()),
  nextDate: optDateOnly(),
  nextOdometer: optNumber({ int: true, min: 0, max: 5_000_000 }),
  confirm: checkbox(),
});
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

/** Registra un mantenimiento. El costo se registra UNA vez como gasto de flotilla ligado a la unidad. */
export async function addMaintenance(tx: Tx, actorId: string, vehicleId: string, m: MaintenanceInput) {
  const veh = await lockVehicle(tx, vehicleId);
  if (m.nextOdometer !== undefined && m.odometer !== undefined && m.nextOdometer <= m.odometer) throw new BusinessError("El kilometraje del próximo mantenimiento debe ser mayor al actual.");
  if (m.nextDate && m.nextDate <= new Date(`${m.date}T00:00:00.000Z`)) throw new BusinessError("La fecha del próximo mantenimiento debe ser posterior.");
  const date = new Date(`${m.date}T00:00:00.000Z`);
  let expenseId: string | null = null;
  if (m.cost && m.cost > 0) {
    const e = await createExpense(tx, actorId, {
      categoryKey: "MANTENIMIENTO", date: m.date, total: m.cost, vatAmount: m.vatAmount, description: `${MAINTENANCE_TYPE[m.type]} ${veh.name}${m.description ? `: ${m.description}` : ""}`.slice(0, 300),
      supplier: m.provider, method: m.method, paid: m.paid,
    }, { vehicleId });
    expenseId = e.id;
  }
  if (m.odometer !== undefined) {
    await checkReading(tx, vehicleId, mexicoLocalToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 12), m.odometer, m.confirm);
    await tx.odometerReading.create({ data: { vehicleId, readingAt: mexicoLocalToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 12), odometer: m.odometer, source: "MANTENIMIENTO", createdById: actorId } });
    if (m.odometer > veh.currentOdometer) await tx.vehicle.update({ where: { id: vehicleId }, data: { currentOdometer: m.odometer } });
  }
  const rec = await tx.maintenance.create({
    data: { vehicleId, type: m.type, date, odometer: m.odometer ?? null, description: m.description ?? null, provider: m.provider ?? null, cost: m.cost ?? 0, nextDate: m.nextDate ?? null, nextOdometer: m.nextOdometer ?? null, expenseId, createdById: actorId },
  });
  await audit(tx, { userId: actorId, action: "MANTENIMIENTO", entity: "Vehiculo", entityId: vehicleId, summary: `${veh.code}: ${MAINTENANCE_TYPE[m.type]} ${m.cost ?? 0}`, after: m });
  return rec;
}

export async function cancelMaintenance(tx: Tx, actorId: string, id: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new BusinessError("Indique el motivo.");
  const m = await tx.maintenance.findUniqueOrThrow({ where: { id } });
  if (m.cancelledAt) throw new BusinessError("Ya estaba cancelado.");
  await tx.maintenance.update({ where: { id }, data: { cancelledAt: new Date(), cancelReason: reason.trim() } });
  if (m.expenseId) await cancelExpense(tx, actorId, m.expenseId, `Mantenimiento cancelado: ${reason.trim()}`);
  await audit(tx, { userId: actorId, action: "CANCELAR_MANTENIMIENTO", entity: "Vehiculo", entityId: m.vehicleId, summary: reason });
}

// ------------------------------------------------------------------ Documentos

export const documentSchema = z
  .object({
    type: z.enum(["SEGURO", "VERIFICACION", "TENENCIA", "TARJETA_CIRCULACION", "OTRO"], { errorMap: () => ({ message: "Seleccione el tipo." }) }),
    description: optText(200), number: optText(80), provider: optText(150),
    issuedAt: optDateOnly(), expiresAt: optDateOnly(),
    amount: money("el importe"), vatAmount: money("el IVA"), paidAt: optDateOnly(),
    method: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "CHEQUE", "OTRO"]).optional()),
  })
  .superRefine((v, ctx) => {
    if (v.issuedAt && v.expiresAt && v.expiresAt <= v.issuedAt) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "El vencimiento debe ser posterior a la emisión." });
    if (v.amount && !v.paidAt) ctx.addIssue({ code: "custom", path: ["paidAt"], message: "Indique la fecha de pago." });
  });
export type DocumentInput = z.infer<typeof documentSchema>;

export async function addDocument(tx: Tx, actorId: string, vehicleId: string, d: DocumentInput) {
  const veh = await lockVehicle(tx, vehicleId);
  let expenseId: string | null = null;
  if (d.amount && d.amount > 0 && d.paidAt) {
    // Seguro → categoría Seguros; verificación, tenencia y tarjeta → Documentación vehicular.
    const e = await createExpense(tx, actorId, {
      categoryKey: d.type === "SEGURO" ? "SEGUROS" : "DOCUMENTACION_VEHICULAR", date: d.paidAt.toISOString().slice(0, 10), total: d.amount, vatAmount: d.vatAmount,
      description: `${DOCUMENT_TYPE[d.type]} ${veh.name}${d.number ? ` (${d.number})` : ""}`, supplier: d.provider, method: d.method, paid: true,
    }, { vehicleId });
    expenseId = e.id;
  }
  const doc = await tx.vehicleDocument.create({
    data: { vehicleId, type: d.type, description: d.description ?? null, number: d.number ?? null, provider: d.provider ?? null, issuedAt: d.issuedAt ?? null, expiresAt: d.expiresAt ?? null, amount: d.amount ?? null, paidAt: d.paidAt ?? null, expenseId, createdById: actorId },
  });
  await audit(tx, { userId: actorId, action: "DOCUMENTO", entity: "Vehiculo", entityId: vehicleId, summary: `${veh.code}: ${DOCUMENT_TYPE[d.type]} vence ${d.expiresAt?.toISOString().slice(0, 10) ?? "—"}`, after: d });
  return doc;
}

export async function cancelDocument(tx: Tx, actorId: string, id: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new BusinessError("Indique el motivo.");
  const d = await tx.vehicleDocument.findUniqueOrThrow({ where: { id } });
  if (d.cancelledAt) throw new BusinessError("Ya estaba cancelado.");
  await tx.vehicleDocument.update({ where: { id }, data: { cancelledAt: new Date(), cancelReason: reason.trim() } });
  if (d.expenseId) await cancelExpense(tx, actorId, d.expenseId, `Documento cancelado: ${reason.trim()}`);
  await audit(tx, { userId: actorId, action: "CANCELAR_DOCUMENTO", entity: "Vehiculo", entityId: d.vehicleId, summary: reason });
}

// ------------------------------------------------------------------ Combustible fuera de servicio

export const fuelSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Fecha no válida."),
  liters: z.preprocess((v) => Number(String(v ?? "").replace(/,/g, "")), z.number({ invalid_type_error: "Litros no válidos." }).positive("Litros no válidos.").max(2000)),
  amount: money("el importe"),
  odometer: optNumber({ int: true, min: 0, max: 5_000_000 }),
  station: optText(150),
  method: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "CHEQUE", "OTRO"]).optional()),
  confirm: checkbox(),
});

export async function addFuel(tx: Tx, actorId: string, vehicleId: string, f: z.infer<typeof fuelSchema>) {
  const veh = await lockVehicle(tx, vehicleId);
  const at = localToUtc(f.date);
  if (f.odometer !== undefined) {
    await checkReading(tx, vehicleId, at, f.odometer, f.confirm);
    await tx.odometerReading.create({ data: { vehicleId, readingAt: at, odometer: f.odometer, source: "COMBUSTIBLE", createdById: actorId } });
    if (f.odometer > veh.currentOdometer) await tx.vehicle.update({ where: { id: vehicleId }, data: { currentOdometer: f.odometer } });
  }
  const exp = f.amount
    ? await createExpense(tx, actorId, { categoryKey: "COMBUSTIBLE_UNIDAD", date: f.date.slice(0, 10), total: f.amount, description: `Combustible ${veh.name} (${f.liters} L)`, supplier: f.station, method: f.method, paid: true }, { vehicleId })
    : null;
  return tx.fuelLog.create({ data: { vehicleId, date: at, liters: f.liters, odometer: f.odometer ?? null, station: f.station ?? null, expenseId: exp?.id ?? null, createdById: actorId } });
}

// ------------------------------------------------------------------ Depreciación mensual

export function depParams(v: { acquisitionPrice: unknown; residualValue: unknown; usefulLifeYears: number | null; usefulLifeKm: number | null; acquisitionDate: Date | null }): DepParams {
  return {
    acquisitionPrice: v.acquisitionPrice != null ? Number(v.acquisitionPrice) : null,
    residualValue: v.residualValue != null ? Number(v.residualValue) : null,
    usefulLifeYears: v.usefulLifeYears, usefulLifeKm: v.usefulLifeKm, acquisitionDate: v.acquisitionDate,
  };
}

/** Km recorridos según lecturas: (última lectura ≤ fin) − (última lectura < inicio, o km inicial). */
export async function kmBetween(db: Db, vehicleId: string, initial: number, start: Date | null, end: Date) {
  const last = await db.odometerReading.findFirst({ where: { vehicleId, readingAt: { lt: end } }, orderBy: { odometer: "desc" } });
  const prev = start ? await db.odometerReading.findFirst({ where: { vehicleId, readingAt: { lt: start } }, orderBy: { odometer: "desc" } }) : null;
  const to = Math.max(initial, last?.odometer ?? initial);
  const from = Math.max(initial, prev?.odometer ?? initial);
  return Math.max(0, to - from);
}

/**
 * Registra (o recalcula) la depreciación del mes para todas las unidades con parámetros completos.
 * Idempotente: UNIQUE(vehículo, año, mes, método).
 */
export async function generateMonthlyDepreciation(tx: Tx, actorId: string, y: number, m: number) {
  const vehicles = await tx.vehicle.findMany();
  const start = mexicoLocalToUtc(y, m, 1);
  const end = m === 12 ? mexicoLocalToUtc(y + 1, 1, 1) : mexicoLocalToUtc(y, m + 1, 1);
  let count = 0;
  for (const v of vehicles) {
    const p = depParams(v);
    const lin = straightLine(p, y, m);
    if (lin && lin.thisMonth > 0) {
      await tx.depreciationEntry.upsert({
        where: { vehicleId_year_month_method: { vehicleId: v.id, year: y, month: m, method: "LINEAL_TIEMPO" } },
        create: { vehicleId: v.id, year: y, month: m, method: "LINEAL_TIEMPO", amount: lin.thisMonth, basis: { ...p, mensual: lin.monthly } },
        update: { amount: lin.thisMonth, basis: { ...p, mensual: lin.monthly } },
      });
      count++;
    }
    if (p.acquisitionPrice && p.usefulLifeKm) {
      const kmToEnd = await kmBetween(tx, v.id, v.initialOdometer, null, end);
      const kmMonth = await kmBetween(tx, v.id, v.initialOdometer, start, end);
      const km = perKilometer(p, kmToEnd, kmMonth);
      if (km && km.thisPeriod > 0) {
        await tx.depreciationEntry.upsert({
          where: { vehicleId_year_month_method: { vehicleId: v.id, year: y, month: m, method: "POR_KILOMETRO" } },
          create: { vehicleId: v.id, year: y, month: m, method: "POR_KILOMETRO", amount: km.thisPeriod, basis: { ...p, km: kmMonth, porKm: km.perKm } },
          update: { amount: km.thisPeriod, basis: { ...p, km: kmMonth, porKm: km.perKm } },
        });
        count++;
      }
    }
  }
  await audit(tx, { userId: actorId, action: "DEPRECIACION", entity: "Flotilla", summary: `${y}-${String(m).padStart(2, "0")}: ${count} registro(s)` });
  return count;
}

// ------------------------------------------------------------------ Alertas

export type FleetAlert = { vehicleId: string; vehicleName: string; kind: "MANTENIMIENTO" | "DOCUMENTO"; level: "VENCIDO" | "PROXIMO"; title: string; detail: string; refId: string };

/** Alertas de mantenimiento (fecha o km) y de documentos por vencer, según los parámetros de Configuración. */
export async function fleetAlerts(db: Db, now = new Date()): Promise<FleetAlert[]> {
  const cfg = await getSetting(db, "alertas");
  const mx = mexicoParts(now);
  const todayUtc = new Date(Date.UTC(mx.year, mx.month - 1, mx.day));
  const docLimit = new Date(todayUtc.getTime() + cfg.diasAvisoDocumentos * 86400_000);
  const mLimit = new Date(todayUtc.getTime() + cfg.diasAvisoMantenimiento * 86400_000);
  const vehicles = await db.vehicle.findMany({
    where: { active: true },
    include: {
      maintenances: { where: { cancelledAt: null }, orderBy: { date: "desc" } },
      documents: { where: { cancelledAt: null }, orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }] },
    },
  });
  const out: FleetAlert[] = [];
  for (const v of vehicles) {
    const seenM = new Set<string>();
    for (const m of v.maintenances) {
      if (seenM.has(m.type)) continue; // solo el más reciente de cada tipo
      seenM.add(m.type);
      const dateDue = m.nextDate && m.nextDate <= mLimit;
      const kmDue = m.nextOdometer !== null && v.currentOdometer >= m.nextOdometer - cfg.kmAvisoMantenimiento;
      if (!dateDue && !kmDue) continue;
      const overdue = (m.nextDate && m.nextDate < todayUtc) || (m.nextOdometer !== null && v.currentOdometer >= m.nextOdometer);
      out.push({
        vehicleId: v.id, vehicleName: v.name, kind: "MANTENIMIENTO", level: overdue ? "VENCIDO" : "PROXIMO", refId: m.id,
        title: `${MAINTENANCE_TYPE[m.type]} ${overdue ? "vencido" : "próximo"}`,
        detail: [m.nextDate ? `fecha ${m.nextDate.toISOString().slice(0, 10).split("-").reverse().join("/")}` : null, m.nextOdometer !== null ? `${m.nextOdometer.toLocaleString("es-MX")} km (actual ${v.currentOdometer.toLocaleString("es-MX")})` : null].filter(Boolean).join(" · "),
      });
    }
    const seenD = new Set<string>();
    for (const d of v.documents) {
      if (seenD.has(d.type) || !d.expiresAt) continue;
      seenD.add(d.type);
      if (d.expiresAt > docLimit) continue;
      const overdue = d.expiresAt < todayUtc;
      out.push({
        vehicleId: v.id, vehicleName: v.name, kind: "DOCUMENTO", level: overdue ? "VENCIDO" : "PROXIMO", refId: d.id,
        title: `${DOCUMENT_TYPE[d.type]} ${overdue ? "vencido" : "por vencer"}`,
        detail: `vence ${d.expiresAt.toISOString().slice(0, 10).split("-").reverse().join("/")}`,
      });
    }
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "VENCIDO" ? -1 : 1));
}

/** Convierte alertas en notificaciones internas (sin duplicar: dedupeKey por registro y nivel). */
export async function syncFleetNotifications(db: Db) {
  const alerts = await fleetAlerts(db);
  for (const a of alerts) {
    await db.notification.upsert({
      where: { dedupeKey: `flotilla:${a.refId}:${a.level}` },
      create: { dedupeKey: `flotilla:${a.refId}:${a.level}`, type: "FLOTILLA", title: `${a.vehicleName}: ${a.title}`, body: a.detail, link: `/flotilla/${a.vehicleId}` },
      update: {},
    });
  }
  return alerts;
}
