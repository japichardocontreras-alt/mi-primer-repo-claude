/**
 * NÓMINA — control administrativo interno.
 * No sustituye el cálculo legal (IMSS, ISR, CFDI, prestaciones); esos datos se reservan en workers.legalData.
 *
 * Modelo:
 *  - Devengo (payroll_entries): lo que se le debe al trabajador (servicio, sueldo base, bono, horas extra, otro)
 *    y deducciones (importe negativo). Estado GENERADO → PAGADO al liquidarse en un corte.
 *  - Pago (payroll_payments): efectivo entregado. ANTICIPO (antes del corte) o PAGO (liquidación de un corte).
 *    En el corte: neto = Σ devengos liquidados − Σ anticipos pendientes; los anticipos quedan aplicados a ese pago.
 *  - Devengado = Σ devengos vigentes · Pagado = Σ pagos vigentes · Saldo = Devengado − Pagado.
 *  - Un devengo solo puede liquidarse una vez (paymentId + bloqueo de filas): no hay doble conteo.
 */
import { z } from "zod";
import type { PayrollEntryKind, PeriodType, Prisma, ServiceType, StaffRole } from "@prisma/client";
import { nextFolio, FOLIO } from "../folios";
import type { Db } from "../db";
import { audit } from "../audit";
import { BusinessError } from "../errors";
import { mexicoLocalToUtc, formatDateOnly } from "../format";
import { moneyReq, optText, reqText } from "../validation";

type Tx = Prisma.TransactionClient;

export const ENTRY_KIND: Record<PayrollEntryKind, string> = {
  SERVICIO: "Pago por servicio", SUELDO_BASE: "Sueldo base", BONO: "Bono", HORAS_EXTRA: "Horas extra",
  DEDUCCION: "Deducción", ANTICIPO_NOMINA: "Anticipo", OTRO: "Otro concepto",
};
export const PERIOD: Record<PeriodType, string> = { SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual" };

// ------------------------------------------------------------------ Periodos

/** Fechas puras (medianoche UTC) del periodo que contiene la fecha de referencia. */
export function periodRange(type: PeriodType, ref: string) {
  const [y, m, d] = ref.split("-").map(Number);
  let start: Date, end: Date;
  if (type === "SEMANAL") {
    const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
    start = new Date(Date.UTC(y, m - 1, d - dow));
    end = new Date(Date.UTC(y, m - 1, d - dow + 7));
  } else if (type === "QUINCENAL") {
    start = new Date(Date.UTC(y, m - 1, d <= 15 ? 1 : 16));
    end = d <= 15 ? new Date(Date.UTC(y, m - 1, 16)) : new Date(Date.UTC(y, m, 1));
  } else {
    start = new Date(Date.UTC(y, m - 1, 1));
    end = new Date(Date.UTC(y, m, 1));
  }
  const last = new Date(end.getTime() - 86400_000);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { type, start, end, last, key: `${type}:${iso(start)}`, label: `${PERIOD[type]} del ${formatDateOnly(start)} al ${formatDateOnly(last)}`, startIso: iso(start), lastIso: iso(last) };
}

// ------------------------------------------------------------------ Tarifas

export const payRateSchema = z.object({
  serviceType: z.enum(["LOCAL", "FORANEO", "FLETE", "OTRO"]),
  role: z.enum(["CHOFER", "AYUDANTE", "OTRO"]),
  amount: moneyReq("el importe"),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida."),
});

/** Registra una tarifa vigente desde una fecha (las anteriores se conservan como historial). */
export async function setPayRate(tx: Tx, actorId: string, r: z.infer<typeof payRateSchema>) {
  const effectiveFrom = new Date(`${r.effectiveFrom}T00:00:00.000Z`);
  const rate = await tx.payRate.upsert({
    where: { serviceType_role_effectiveFrom: { serviceType: r.serviceType, role: r.role, effectiveFrom } },
    create: { serviceType: r.serviceType, role: r.role, amount: r.amount, effectiveFrom },
    update: { amount: r.amount },
  });
  await audit(tx, { userId: actorId, action: "TARIFA", entity: "Tarifa", entityId: rate.id, summary: `${r.serviceType}/${r.role} desde ${r.effectiveFrom}: ${r.amount}`, after: r });
  return rate;
}

export async function currentRates(tx: Db, at = new Date()) {
  const all = await tx.payRate.findMany({ where: { effectiveFrom: { lte: at } }, orderBy: { effectiveFrom: "desc" } });
  const out = new Map<string, (typeof all)[number]>();
  for (const r of all) if (!out.has(`${r.serviceType}:${r.role}`)) out.set(`${r.serviceType}:${r.role}`, r);
  return out as Map<`${ServiceType}:${StaffRole}`, (typeof all)[number]>;
}

// ------------------------------------------------------------------ Devengos y deducciones

export const entrySchema = z
  .object({
    kind: z.enum(["BONO", "HORAS_EXTRA", "DEDUCCION", "OTRO"], { errorMap: () => ({ message: "Seleccione el concepto." }) }),
    date: z.string({ required_error: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida."),
    concept: reqText("la descripción", 200),
    amount: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(String(v).replace(/[$,\s]/g, ""))), z.number({ invalid_type_error: "Importe no válido." }).positive("Importe no válido.").max(1_000_000).optional()),
    hours: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number({ invalid_type_error: "Horas no válidas." }).positive("Horas no válidas.").max(300).optional()),
    hourlyRate: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(String(v).replace(/[$,\s]/g, ""))), z.number().positive("Tarifa no válida.").max(100_000).optional()),
    notes: optText(500),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "HORAS_EXTRA") {
      if (!v.hours) ctx.addIssue({ code: "custom", path: ["hours"], message: "Indique las horas." });
      if (!v.amount && !v.hourlyRate) ctx.addIssue({ code: "custom", path: ["hourlyRate"], message: "Indique la tarifa por hora o el importe." });
    } else if (!v.amount) ctx.addIssue({ code: "custom", path: ["amount"], message: "Indique el importe." });
  });
export type EntryInput = z.infer<typeof entrySchema>;

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function addPayrollEntry(tx: Tx, actorId: string, workerId: string, e: EntryInput) {
  const w = await tx.worker.findUniqueOrThrow({ where: { id: workerId } });
  const base = e.kind === "HORAS_EXTRA" && e.hourlyRate && e.hours ? r2(e.hours * e.hourlyRate) : e.amount!;
  const amount = e.kind === "DEDUCCION" ? -base : base;
  const entry = await tx.payrollEntry.create({
    data: { workerId, kind: e.kind, concept: e.concept, date: new Date(`${e.date}T00:00:00.000Z`), amount, hours: e.hours ?? null, notes: e.notes ?? null, createdById: actorId },
  });
  await audit(tx, { userId: actorId, action: "NOMINA_CONCEPTO", entity: "Trabajador", entityId: workerId, summary: `${w.code}: ${ENTRY_KIND[e.kind]} ${amount}`, after: e });
  return entry;
}

/** Genera el sueldo base del periodo (una sola vez por trabajador y periodo). */
export async function generateBaseSalary(tx: Tx, actorId: string, workerId: string, type: PeriodType, ref: string) {
  const w = await tx.worker.findUniqueOrThrow({ where: { id: workerId } });
  if (Number(w.baseSalary) <= 0) throw new BusinessError(`${w.fullName} no tiene sueldo base registrado.`);
  if (w.payType !== type && w.payType !== "MIXTO") {
    throw new BusinessError(`El sueldo base de ${w.fullName} es ${w.payType === "POR_SERVICIO" ? "por servicio" : w.payType.toLowerCase()}; genere el corte con ese periodo.`);
  }
  const p = periodRange(type, ref);
  const exists = await tx.payrollEntry.findFirst({ where: { workerId, kind: "SUELDO_BASE", periodKey: p.key } });
  if (exists) throw new BusinessError(`El sueldo base del periodo ${p.label} ya fue generado.`);
  const entry = await tx.payrollEntry.create({
    data: { workerId, kind: "SUELDO_BASE", concept: `Sueldo base ${p.label.toLowerCase()}`, date: p.last, amount: w.baseSalary, periodKey: p.key, createdById: actorId },
  });
  await audit(tx, { userId: actorId, action: "NOMINA_SUELDO_BASE", entity: "Trabajador", entityId: workerId, summary: `${w.code}: ${p.label} ${w.baseSalary}` });
  return entry;
}

export async function cancelPayrollEntry(tx: Tx, actorId: string, entryId: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new BusinessError("Indique el motivo de la cancelación.");
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "payroll_entries" WHERE "id" = ${entryId}::uuid FOR UPDATE`;
  if (!rows.length) throw new BusinessError("El concepto no existe.");
  const e = await tx.payrollEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (e.status !== "GENERADO") throw new BusinessError(e.status === "PAGADO" ? "El concepto ya fue pagado. Cancele primero el pago del corte." : "El concepto ya estaba cancelado.");
  await tx.payrollEntry.update({ where: { id: entryId }, data: { status: "CANCELADO", cancelledAt: new Date(), cancelReason: reason.trim() } });
  await audit(tx, { userId: actorId, action: "NOMINA_CANCELAR_CONCEPTO", entity: "Trabajador", entityId: e.workerId, summary: `${e.concept}: ${reason}` });
}

// ------------------------------------------------------------------ Pagos

export const paySchema = z.object({
  paidAt: z.string({ required_error: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Fecha no válida."),
  method: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "CHEQUE", "OTRO"], { errorMap: () => ({ message: "Seleccione el método." }) }),
  reference: optText(150),
  notes: optText(500),
});
export const advanceSchema = paySchema.extend({ amount: moneyReq("el importe", 0.01) });

const toUtc = (s: string) => {
  const [d, t] = s.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return mexicoLocalToUtc(y, m, day, h, min);
};

async function lockWorker(tx: Tx, workerId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "workers" WHERE "id" = ${workerId}::uuid FOR UPDATE`;
  if (!rows.length) throw new BusinessError("El trabajador no existe.");
  return tx.worker.findUniqueOrThrow({ where: { id: workerId } });
}

export async function registerAdvance(tx: Tx, actorId: string, workerId: string, a: z.infer<typeof advanceSchema>) {
  const w = await lockWorker(tx, workerId);
  const paidAt = toUtc(a.paidAt);
  const p = await tx.payrollPayment.create({
    data: { folio: await nextFolio(tx, FOLIO.NOMINA, paidAt), kind: "ANTICIPO", workerId, paidAt, amount: a.amount, method: a.method, reference: a.reference ?? null, notes: a.notes ?? null, createdById: actorId },
  });
  await audit(tx, { userId: actorId, action: "NOMINA_ANTICIPO", entity: "Trabajador", entityId: workerId, summary: `${w.code} ${p.folio}: ${a.amount}` });
  return p;
}

/**
 * Corte y pago: liquida los devengos seleccionados descontando los anticipos pendientes.
 * Bloquea al trabajador y verifica que ningún devengo haya sido pagado por otro usuario.
 */
export async function settlePayroll(
  tx: Tx,
  actorId: string,
  workerId: string,
  s: z.infer<typeof paySchema> & { entryIds: string[]; advanceIds: string[]; periodType?: PeriodType; ref?: string },
) {
  const w = await lockWorker(tx, workerId);
  if (!s.entryIds.length) throw new BusinessError("Seleccione al menos un concepto a pagar.");
  const entries = await tx.payrollEntry.findMany({ where: { id: { in: s.entryIds }, workerId } });
  if (entries.length !== s.entryIds.length) throw new BusinessError("Algún concepto no pertenece a este trabajador.");
  const notPending = entries.filter((e) => e.status !== "GENERADO");
  if (notPending.length) throw new BusinessError("Algún concepto ya fue pagado o cancelado (posiblemente por otro usuario). Recargue la página.");
  const advances = s.advanceIds.length ? await tx.payrollPayment.findMany({ where: { id: { in: s.advanceIds }, workerId, kind: "ANTICIPO", cancelledAt: null, appliedToId: null } }) : [];
  if (advances.length !== s.advanceIds.length) throw new BusinessError("Algún anticipo ya fue descontado o cancelado. Recargue la página.");

  const gross = r2(entries.reduce((a, e) => a + Number(e.amount), 0));
  const adv = r2(advances.reduce((a, p) => a + Number(p.amount), 0));
  const net = r2(gross - adv);
  if (gross <= 0) throw new BusinessError("El total de los conceptos seleccionados debe ser mayor a cero.");
  if (net < 0) throw new BusinessError(`Los anticipos (${adv.toFixed(2)}) superan lo devengado (${gross.toFixed(2)}). Deje algún anticipo para el siguiente corte.`);

  const paidAt = toUtc(s.paidAt);
  const period = s.periodType && s.ref ? periodRange(s.periodType, s.ref) : null;
  const pay = await tx.payrollPayment.create({
    data: {
      folio: await nextFolio(tx, FOLIO.NOMINA, paidAt), kind: "PAGO", workerId, paidAt, amount: net, grossAmount: gross, method: s.method,
      reference: s.reference ?? null, notes: s.notes ?? null, createdById: actorId,
      periodType: period?.type ?? null, periodStart: period?.start ?? null, periodEnd: period?.last ?? null,
    },
  });
  await tx.payrollEntry.updateMany({ where: { id: { in: s.entryIds } }, data: { status: "PAGADO", paymentId: pay.id } });
  if (advances.length) await tx.payrollPayment.updateMany({ where: { id: { in: s.advanceIds } }, data: { appliedToId: pay.id } });
  await audit(tx, { userId: actorId, action: "NOMINA_PAGO", entity: "Trabajador", entityId: workerId, summary: `${w.code} ${pay.folio}: bruto ${gross}, anticipos ${adv}, neto ${net}`, after: { conceptos: s.entryIds.length, anticipos: s.advanceIds.length } });
  return pay;
}

export async function cancelPayrollPayment(tx: Tx, actorId: string, paymentId: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new BusinessError("Indique el motivo de la cancelación.");
  const p0 = await tx.payrollPayment.findUniqueOrThrow({ where: { id: paymentId } });
  await lockWorker(tx, p0.workerId);
  const p = await tx.payrollPayment.findUniqueOrThrow({ where: { id: paymentId } });
  if (p.cancelledAt) throw new BusinessError("El pago ya estaba cancelado.");
  if (p.kind === "ANTICIPO" && p.appliedToId) throw new BusinessError("Este anticipo ya se descontó en un corte; cancele primero ese pago.");
  if (p.kind === "PAGO") {
    await tx.payrollEntry.updateMany({ where: { paymentId }, data: { status: "GENERADO", paymentId: null } });
    await tx.payrollPayment.updateMany({ where: { appliedToId: paymentId }, data: { appliedToId: null } });
  }
  await tx.payrollPayment.update({ where: { id: paymentId }, data: { cancelledAt: new Date(), cancelReason: reason.trim() } });
  await audit(tx, { userId: actorId, action: "NOMINA_CANCELAR_PAGO", entity: "Trabajador", entityId: p.workerId, summary: `${p.folio}: ${reason}` });
}

// ------------------------------------------------------------------ Consultas

/** Estado de cuenta del trabajador (opcionalmente acotado a un rango de fechas). */
export async function workerAccount(db: Db, workerId: string, range?: { start: Date; end: Date }) {
  const [entries, payments] = await Promise.all([
    db.payrollEntry.findMany({ where: { workerId, ...(range ? { date: { gte: range.start, lt: range.end } } : {}) }, include: { service: { select: { id: true, folio: true } }, payment: { select: { folio: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    db.payrollPayment.findMany({ where: { workerId, ...(range ? { paidAt: { gte: range.start, lt: range.end } } : {}) }, include: { appliedTo: { select: { folio: true } } }, orderBy: { paidAt: "desc" } }),
  ]);
  const live = entries.filter((e) => e.status !== "CANCELADO");
  const sum = (xs: { amount: Prisma.Decimal }[]) => r2(xs.reduce((a, x) => a + Number(x.amount), 0));
  const byKind = (k: PayrollEntryKind) => sum(live.filter((e) => e.kind === k));
  const livePay = payments.filter((p) => !p.cancelledAt);
  return {
    entries, payments,
    totals: {
      servicios: byKind("SERVICIO"), sueldoBase: byKind("SUELDO_BASE"), bonos: byKind("BONO"), horasExtra: byKind("HORAS_EXTRA"),
      otros: byKind("OTRO"), deducciones: byKind("DEDUCCION"),
      devengado: sum(live),
      pagado: sum(livePay),
      anticipos: sum(livePay.filter((p) => p.kind === "ANTICIPO")),
      porPagar: sum(live.filter((e) => e.status === "GENERADO")),
      anticiposPendientes: sum(livePay.filter((p) => p.kind === "ANTICIPO" && !p.appliedToId)),
      serviciosRealizados: live.filter((e) => e.kind === "SERVICIO").length,
    },
  };
}

/** Saldo pendiente global = devengos por pagar − anticipos aún no descontados. */
export function pendingBalance(t: { porPagar: number; anticiposPendientes: number }) {
  return r2(t.porPagar - t.anticiposPendientes);
}
