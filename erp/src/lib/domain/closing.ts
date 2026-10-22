import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { audit } from "../audit";
import type { Db } from "../db";
import { BusinessError } from "../errors";
import { mexicoLocalToUtc, formatNumber } from "../format";
import { money, optText } from "../validation";
import { createExpense } from "./expenses";

type Tx = Prisma.TransactionClient;

const intKm = (label: string) =>
  z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? undefined : Number(String(v).replace(/[,\s]/g, ""))),
    z.number({ required_error: `Indique ${label}.`, invalid_type_error: "Kilometraje no válido." }).int("El kilometraje debe ser entero.").min(0).max(5_000_000),
  );
const localDT = (label: string) => z.string({ required_error: `Indique ${label}.` }).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, `${label[0].toUpperCase()}${label.slice(1)} no válida.`);

export const vehicleCloseSchema = z.object({
  vehicleId: z.string().uuid(),
  odometerStart: intKm("el kilometraje inicial"),
  odometerEnd: intKm("el kilometraje final"),
  fuelLiters: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number({ invalid_type_error: "Litros no válidos." }).positive("Litros no válidos.").max(2000).optional()),
  fuelAmount: money("el gasto de combustible"),
  /** Confirmación explícita cuando el kilometraje no cuadra con la lectura anterior de la unidad. */
  acceptGap: z.boolean().default(false),
});

export const closeSchema = z
  .object({
    actualStart: localDT("la fecha y hora real de inicio"),
    actualEnd: localDT("la fecha y hora real de fin"),
    vehicles: z.array(vehicleCloseSchema).max(5),
    staff: z.array(z.object({ serviceStaffId: z.string().uuid(), participated: z.boolean(), agreedPay: z.number().min(0).max(1_000_000) })).max(30),
    tolls: money("las casetas"),
    parking: money("los estacionamientos"),
    perDiem: money("los viáticos"),
    extras: z.array(z.object({ description: z.string().trim().min(2, "Describa el gasto adicional.").max(200), amount: z.number().positive("Importe no válido.").max(1_000_000) })).max(20),
    expenseMethod: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "CHEQUE", "OTRO"]).default("EFECTIVO"),
    incidents: optText(3000),
    closingNotes: optText(3000),
    deliveryEvidence: optText(1000),
  })
  .superRefine((v, ctx) => {
    v.vehicles.forEach((x, i) => {
      if (x.odometerEnd < x.odometerStart) ctx.addIssue({ code: "custom", path: ["vehicles", i, "odometerEnd"], message: "El kilometraje final no puede ser menor al inicial." });
      if (x.odometerEnd - x.odometerStart > 5000) ctx.addIssue({ code: "custom", path: ["vehicles", i, "odometerEnd"], message: "Más de 5,000 km en un servicio: revise la captura." });
      if (x.fuelAmount && !x.fuelLiters) ctx.addIssue({ code: "custom", path: ["vehicles", i, "fuelLiters"], message: "Indique los litros cargados." });
    });
  });
export type CloseInput = z.infer<typeof closeSchema>;

const toUtc = (s: string) => {
  const [d, t] = s.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return mexicoLocalToUtc(y, m, day, h, min);
};

export class OdometerGapError extends BusinessError {
  constructor(public issues: { vehicleId: string; name: string; previous: number; start: number }[]) {
    super(
      issues
        .map((i) =>
          i.start < i.previous
            ? `${i.name}: el kilometraje inicial (${formatNumber(i.start)}) es MENOR a la última lectura registrada (${formatNumber(i.previous)}).`
            : `${i.name}: hay ${formatNumber(i.start - i.previous)} km sin registrar desde la última lectura (${formatNumber(i.previous)}).`,
        )
        .join(" ") + " Corrija la captura o confirme que es correcto.",
    );
    this.code = "ODOMETER_GAP";
  }
}

/** Tolerancia de km entre el fin de un recorrido y el inicio del siguiente sin pedir confirmación. */
export const ODOMETER_TOLERANCE_KM = 30;

/** Última lectura de odómetro de la unidad hasta un instante. */
async function lastReading(tx: Tx, vehicleId: string, before: Date) {
  return tx.odometerReading.findFirst({ where: { vehicleId, readingAt: { lte: before } }, orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }] });
}

/**
 * Cierre operativo. En UNA transacción:
 *  - registra horarios reales, incidencias y evidencia; estado → FINALIZADO
 *  - guarda lecturas de odómetro (inmutables) y actualiza el odómetro de la unidad → Flotilla
 *  - registra combustible, casetas, estacionamientos, viáticos y extras como gastos del folio → Finanzas
 *  - genera el pago por servicio de cada trabajador participante (único por asignación) → Nómina
 * El cierre financiero (cobro) es independiente: el servicio puede cerrarse con saldo pendiente.
 */
export async function closeService(tx: Tx, actorId: string, serviceId: string, version: number, c: CloseInput) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "services" WHERE "id" = ${serviceId}::uuid FOR UPDATE`;
  if (!rows.length) throw new BusinessError("El servicio no existe.");
  const svc = await tx.service.findUniqueOrThrow({ where: { id: serviceId }, include: { vehicles: { include: { vehicle: true } }, staff: { include: { payrollEntry: true } } } });
  if (svc.version !== version) throw new BusinessError("Otro usuario modificó este servicio. Recargue la página.");
  if (svc.status === "FINALIZADO") throw new BusinessError("El servicio ya tiene cierre operativo.");
  if (svc.status === "CANCELADO" || svc.status === "POR_PROGRAMAR") throw new BusinessError("Solo se pueden cerrar servicios programados o en proceso.");

  const start = toUtc(c.actualStart);
  const end = toUtc(c.actualEnd);
  if (end <= start) throw new BusinessError("La hora real de fin debe ser posterior a la de inicio.");
  if (end.getTime() - start.getTime() > 10 * 86400_000) throw new BusinessError("La duración real supera 10 días: revise las fechas.");
  if (start.getTime() > Date.now() + 3600_000) throw new BusinessError("No se puede cerrar un servicio con fecha de inicio futura.");

  const assigned = new Set(svc.vehicles.map((v) => v.vehicleId));
  if (c.vehicles.length !== assigned.size || c.vehicles.some((v) => !assigned.has(v.vehicleId))) {
    throw new BusinessError(svc.vehicles.length ? "Capture el kilometraje de cada unidad asignada." : "El servicio no tiene unidad asignada. Asígnela antes de cerrarlo.");
  }

  // --- Kilometraje: no sobrescribe historial y revisa congruencia con la lectura anterior.
  await tx.$queryRaw`SELECT "id" FROM "vehicles" WHERE "id" = ANY(${[...assigned].sort()}::uuid[]) ORDER BY "id" FOR UPDATE`;
  const gaps: { vehicleId: string; name: string; previous: number; start: number }[] = [];
  for (const v of c.vehicles) {
    const veh = svc.vehicles.find((x) => x.vehicleId === v.vehicleId)!.vehicle;
    const prev = await lastReading(tx, v.vehicleId, start);
    const previous = prev?.odometer ?? veh.initialOdometer;
    const hasHistory = !!prev || veh.initialOdometer > 0;
    if (hasHistory && (v.odometerStart < previous || v.odometerStart - previous > ODOMETER_TOLERANCE_KM) && !v.acceptGap) {
      gaps.push({ vehicleId: v.vehicleId, name: veh.name, previous, start: v.odometerStart });
    }
    if (v.odometerStart < previous && v.acceptGap && !c.closingNotes) {
      throw new BusinessError(`${veh.name}: para aceptar un kilometraje menor al anterior explique el motivo en las observaciones del cierre.`);
    }
  }
  if (gaps.length) throw new OdometerGapError(gaps);

  for (const v of c.vehicles) {
    const veh = svc.vehicles.find((x) => x.vehicleId === v.vehicleId)!.vehicle;
    await tx.odometerReading.createMany({
      data: [
        { vehicleId: v.vehicleId, serviceId, readingAt: start, odometer: v.odometerStart, source: "SERVICIO_INICIO", createdById: actorId, notes: v.acceptGap ? "Diferencia con la lectura anterior confirmada por el usuario" : null },
        { vehicleId: v.vehicleId, serviceId, readingAt: end, odometer: v.odometerEnd, source: "SERVICIO_FIN", createdById: actorId },
      ],
    });
    if (v.odometerEnd > veh.currentOdometer) await tx.vehicle.update({ where: { id: v.vehicleId }, data: { currentOdometer: v.odometerEnd } });

    if (v.fuelAmount || v.fuelLiters) {
      const exp = v.fuelAmount
        ? await createExpense(tx, actorId, { categoryKey: "COMBUSTIBLE", date: c.actualStart.slice(0, 10), total: v.fuelAmount, description: `Combustible ${veh.name} (${v.fuelLiters} L)`, method: c.expenseMethod, paid: true }, { serviceId, vehicleId: v.vehicleId }, { allowDuplicate: true })
        : null;
      await tx.fuelLog.create({ data: { vehicleId: v.vehicleId, serviceId, date: end, liters: v.fuelLiters!, odometer: v.odometerEnd, expenseId: exp?.id ?? null } });
    }
  }

  // --- Gastos directos del folio
  const date = c.actualStart.slice(0, 10);
  const primaryVehicle = svc.vehicles.find((v) => v.isPrimary)?.vehicleId ?? svc.vehicles[0]?.vehicleId ?? null;
  const direct: [string, number | undefined, string][] = [
    ["CASETAS", c.tolls, "Casetas"],
    ["ESTACIONAMIENTOS", c.parking, "Estacionamientos"],
    ["VIATICOS", c.perDiem, "Viáticos"],
  ];
  for (const [key, amount, label] of direct) {
    if (amount && amount > 0) await createExpense(tx, actorId, { categoryKey: key, date, total: amount, description: `${label} ${svc.folio}`, method: c.expenseMethod, paid: true }, { serviceId, vehicleId: primaryVehicle }, { allowDuplicate: true });
  }
  for (const x of c.extras) {
    await createExpense(tx, actorId, { categoryKey: "OTROS_DIRECTOS", date, total: x.amount, description: x.description, method: c.expenseMethod, paid: true }, { serviceId, vehicleId: primaryVehicle }, { allowDuplicate: true });
  }

  // --- Personal participante → nómina (un devengo por asignación; UNIQUE(serviceStaffId) evita duplicados)
  const byId = new Map(svc.staff.map((s) => [s.id, s]));
  if (c.staff.some((s) => !byId.has(s.serviceStaffId))) throw new BusinessError("La lista de personal no corresponde al servicio. Recargue la página.");
  let payroll = 0;
  for (const st of svc.staff) {
    const input = c.staff.find((s) => s.serviceStaffId === st.id);
    const participated = input ? input.participated : st.participated;
    const pay = input ? input.agreedPay : Number(st.agreedPay);
    await tx.serviceStaff.update({ where: { id: st.id }, data: { participated, agreedPay: pay } });
    if (participated && pay > 0 && !st.payrollEntry) {
      await tx.payrollEntry.create({
        data: {
          workerId: st.workerId, serviceId, serviceStaffId: st.id, kind: "SERVICIO", date: new Date(`${date}T00:00:00.000Z`),
          concept: `${svc.serviceType === "LOCAL" ? "Mudanza local" : svc.serviceType === "FORANEO" ? "Mudanza foránea" : svc.serviceType === "FLETE" ? "Flete" : "Servicio"} ${svc.folio} (${st.role === "CHOFER" ? "chofer" : st.role === "AYUDANTE" ? "ayudante" : "apoyo"})`,
          amount: pay, status: "GENERADO", createdById: actorId,
        },
      });
      payroll += pay;
    }
  }

  await tx.service.update({
    where: { id: serviceId },
    data: {
      status: "FINALIZADO", actualStart: start, actualEnd: end,
      incidents: [svc.incidents, c.incidents].filter(Boolean).join("\n") || null,
      closingNotes: c.closingNotes ?? null, deliveryEvidence: c.deliveryEvidence ?? null,
      operationalClosedAt: new Date(), operationalClosedById: actorId, version: { increment: 1 },
    },
  });
  const km = c.vehicles.reduce((a, v) => a + (v.odometerEnd - v.odometerStart), 0);
  await audit(tx, {
    userId: actorId, action: "CIERRE_OPERATIVO", entity: "Servicio", entityId: serviceId, summary: `${svc.folio}: ${km} km, nómina ${payroll}`,
    after: { inicioReal: start, finReal: end, km, casetas: c.tolls, estacionamientos: c.parking, viaticos: c.perDiem, extras: c.extras, nomina: payroll },
  });
  await tx.notification.create({ data: { type: "SERVICIO", title: `Servicio ${svc.folio} finalizado`, body: `${km} km recorridos`, link: `/agenda/${serviceId}` } });
  return { km, payroll };
}

/** Indicadores directos de un servicio (para servicios realizados y su ficha). */
export async function serviceEconomics(tx: Tx, serviceId: string) {
  const [svc, expenses, payroll, readings] = await Promise.all([
    tx.service.findUniqueOrThrow({ where: { id: serviceId } }),
    tx.expense.findMany({ where: { serviceId, cancelledAt: null }, include: { category: true } }),
    tx.payrollEntry.findMany({ where: { serviceId, status: { not: "CANCELADO" } } }),
    tx.odometerReading.findMany({ where: { serviceId }, orderBy: { readingAt: "asc" } }),
  ]);
  const direct = expenses.reduce((a, e) => a + Number(e.total), 0);
  const labor = payroll.reduce((a, p) => a + Number(p.amount), 0);
  const kmByVehicle = new Map<string, number>();
  for (const r of readings) {
    const cur = kmByVehicle.get(r.vehicleId);
    if (r.source === "SERVICIO_INICIO") kmByVehicle.set(r.vehicleId, (cur ?? 0) - r.odometer);
    if (r.source === "SERVICIO_FIN") kmByVehicle.set(r.vehicleId, (cur ?? 0) + r.odometer);
  }
  const km = [...kmByVehicle.values()].reduce((a, b) => a + b, 0);
  const price = Number(svc.contractedPrice);
  return { price, direct: round(direct), labor: round(labor), km, margin: round(price - direct - labor), expenses, payroll };
}
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Revisión de congruencia del odómetro de una unidad: lecturas que retroceden o huecos
 * entre el fin de un recorrido y el inicio del siguiente. No modifica nada.
 */
export async function odometerIssues(tx: Db, vehicleId: string, toleranceKm = ODOMETER_TOLERANCE_KM) {
  const rs = await tx.odometerReading.findMany({ where: { vehicleId }, include: { service: { select: { folio: true } } }, orderBy: [{ readingAt: "asc" }, { createdAt: "asc" }] });
  const out: { at: Date; folio: string | null; previous: number; current: number; type: "RETROCESO" | "HUECO" }[] = [];
  for (let i = 1; i < rs.length; i++) {
    const a = rs[i - 1], b = rs[i];
    if (b.odometer < a.odometer) out.push({ at: b.readingAt, folio: b.service?.folio ?? null, previous: a.odometer, current: b.odometer, type: "RETROCESO" });
    else if (b.source === "SERVICIO_INICIO" && b.odometer - a.odometer > toleranceKm) out.push({ at: b.readingAt, folio: b.service?.folio ?? null, previous: a.odometer, current: b.odometer, type: "HUECO" });
  }
  return out;
}
