import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { clientSchema } from "@/lib/domain/clients";
import { createRequest, parseRequestForm, quoteSchema } from "@/lib/domain/requests";
import { createWorker, workerSchema, defaultPay } from "@/lib/domain/workers";
import { confirmRequest, confirmSchema, scheduleSchema, type Actor } from "@/lib/domain/services";
import { closeService, closeSchema } from "@/lib/domain/closing";
import {
  periodRange, setPayRate, payRateSchema, addPayrollEntry, entrySchema, generateBaseSalary, cancelPayrollEntry,
  registerAdvance, advanceSchema, settlePayroll, cancelPayrollPayment, workerAccount, pendingBalance,
} from "@/lib/domain/payroll";

const db = testDb();
let admin: Actor;
let chofer: string, veh: string;

async function servicePaid(pay = 300, date = "2026-10-20") {
  const r = await db.$transaction((tx) => createRequest(tx, admin, {
    newClient: clientSchema.parse({ name: "Cliente DEMO Nómina", phone: `722${Math.floor(1e6 + Math.random() * 8e6)}` }), allowDuplicatePhone: true,
    request: parseRequestForm({ channel: "WHATSAPP", serviceType: "LOCAL" }), quote: quoteSchema.parse({ price: "4500" }),
  }));
  const s = await db.$transaction((tx) => confirmRequest(tx, admin, r.id, {
    confirm: confirmSchema.parse({ contractedPrice: "4500" }),
    schedule: scheduleSchema.parse({ date, time: "09:00", durationHours: 3, prepMinutes: 0, returnMinutes: 0 }),
    assignment: { vehicleIds: [veh], staff: [{ workerId: chofer, role: "CHOFER", agreedPay: pay }] },
  }));
  const st = await db.serviceStaff.findMany({ where: { serviceId: s.id } });
  const last = await db.odometerReading.findFirst({ where: { vehicleId: veh }, orderBy: { readingAt: "desc" } });
  const km = last?.odometer ?? 0;
  await db.$transaction((tx) => closeService(tx, admin.id, s.id, s.version, closeSchema.parse({
    actualStart: `${date}T09:00`, actualEnd: `${date}T12:00`, extras: [],
    vehicles: [{ vehicleId: veh, odometerStart: km, odometerEnd: km + 20, acceptGap: false }],
    staff: st.map((x) => ({ serviceStaffId: x.id, participated: true, agreedPay: Number(x.agreedPay) })),
  })));
  return s;
}
const entry = (o: Record<string, string>) => db.$transaction((tx) => addPayrollEntry(tx, admin.id, chofer, entrySchema.parse(o)));
const pending = async () => (await workerAccount(db, chofer)).entries.filter((e) => e.status === "GENERADO").map((e) => e.id);
const pendingAdv = async () => (await workerAccount(db, chofer)).payments.filter((p) => p.kind === "ANTICIPO" && !p.appliedToId && !p.cancelledAt).map((p) => p.id);
const settle = async (entryIds: string[], advanceIds: string[]) =>
  db.$transaction((tx) => settlePayroll(tx, admin.id, chofer, { paidAt: "2026-10-25T18:00", method: "EFECTIVO", entryIds, advanceIds, periodType: "SEMANAL", ref: "2026-10-22" }));

beforeEach(async () => {
  await truncateData(db);
  const role = await db.role.findUniqueOrThrow({ where: { key: "ADMINISTRADOR" } });
  const u = await db.user.create({ data: { email: "admin@test.mx", name: "Admin DEMO", passwordHash: await hashPassword("ClaveDemo2026"), roleId: role.id } });
  admin = { id: u.id, name: u.name, canOverride: true };
  veh = (await db.vehicle.create({ data: { code: "T-1", name: "Unidad prueba" } })).id;
  chofer = (await db.$transaction((tx) => createWorker(tx, admin.id, workerSchema.parse({ fullName: "Chofer DEMO Nómina", position: "CHOFER", payType: "POR_SERVICIO", active: "on" })))).id;
});
afterAll(() => db.$disconnect());

describe("Periodos y tarifas", () => {
  it("calcula cortes semanales (lunes a domingo), quincenales y mensuales", () => {
    expect(periodRange("SEMANAL", "2026-10-22")).toMatchObject({ startIso: "2026-10-19", lastIso: "2026-10-25", key: "SEMANAL:2026-10-19" });
    expect(periodRange("QUINCENAL", "2026-10-22")).toMatchObject({ startIso: "2026-10-16", lastIso: "2026-10-31" });
    expect(periodRange("QUINCENAL", "2026-02-15")).toMatchObject({ startIso: "2026-02-01", lastIso: "2026-02-15" });
    expect(periodRange("MENSUAL", "2026-02-10")).toMatchObject({ startIso: "2026-02-01", lastIso: "2026-02-28" });
  });

  it("tarifas configurables con vigencia; se conserva el historial", async () => {
    await db.$transaction((tx) => setPayRate(tx, admin.id, payRateSchema.parse({ serviceType: "LOCAL", role: "CHOFER", amount: "300", effectiveFrom: "2026-01-01" })));
    await db.$transaction((tx) => setPayRate(tx, admin.id, payRateSchema.parse({ serviceType: "LOCAL", role: "CHOFER", amount: "350", effectiveFrom: "2026-11-01" })));
    expect(await defaultPay(db, "LOCAL", "CHOFER", new Date("2026-10-15"))).toBe(300);
    expect(await defaultPay(db, "LOCAL", "CHOFER", new Date("2026-11-15"))).toBe(350);
    expect(await defaultPay(db, "FORANEO", "CHOFER", new Date("2026-11-15"))).toBe(0);
    expect(await db.payRate.count()).toBe(2);
  });
});

describe("Nómina por trabajador", () => {
  it("devengos, deducciones, anticipo y corte: sin doble conteo y saldo en cero", async () => {
    await servicePaid(300);
    let acc = await workerAccount(db, chofer);
    expect(acc.totals).toMatchObject({ servicios: 300, devengado: 300, pagado: 0, serviciosRealizados: 1 });

    await entry({ kind: "BONO", date: "2026-10-21", concept: "Bono puntualidad (DEMO)", amount: "500" });
    const he = await entry({ kind: "HORAS_EXTRA", date: "2026-10-21", concept: "Horas extra (DEMO)", hours: "3", hourlyRate: "80" });
    expect(Number(he.amount)).toBe(240);
    const ded = await entry({ kind: "DEDUCCION", date: "2026-10-22", concept: "Daño a mueble (DEMO)", amount: "100" });
    expect(Number(ded.amount)).toBe(-100);
    await db.$transaction((tx) => registerAdvance(tx, admin.id, chofer, advanceSchema.parse({ amount: "200", paidAt: "2026-10-22T10:00", method: "EFECTIVO" })));

    acc = await workerAccount(db, chofer);
    expect(acc.totals).toMatchObject({ devengado: 940, pagado: 200, anticipos: 200, porPagar: 940, anticiposPendientes: 200, deducciones: -100, bonos: 500, horasExtra: 240 });
    expect(pendingBalance(acc.totals)).toBe(740);
    expect(acc.totals.devengado - acc.totals.pagado).toBe(740);

    const pay = await settle(await pending(), await pendingAdv());
    expect([Number(pay.grossAmount), Number(pay.amount)]).toEqual([940, 740]);
    expect(pay.folio).toMatch(/^NOM-2026-\d{6}$/);
    acc = await workerAccount(db, chofer);
    expect(acc.totals).toMatchObject({ devengado: 940, pagado: 940, porPagar: 0, anticiposPendientes: 0 });
    expect(acc.entries.every((e) => e.status === "PAGADO" && e.paymentId === pay.id)).toBe(true);
    // No se puede volver a pagar lo mismo
    await expect(settle(acc.entries.map((e) => e.id), [])).rejects.toThrow(/ya fue pagado/);

    // Cancelar el pago regresa los conceptos y el anticipo a pendientes
    await db.$transaction((tx) => cancelPayrollPayment(tx, admin.id, pay.id, "Pago capturado con error (DEMO)"));
    acc = await workerAccount(db, chofer);
    expect(acc.totals).toMatchObject({ devengado: 940, pagado: 200, porPagar: 940, anticiposPendientes: 200 });
  });

  it("dos usuarios pagando el mismo corte a la vez: solo uno se registra", async () => {
    await servicePaid(300);
    await entry({ kind: "BONO", date: "2026-10-21", concept: "Bono (DEMO)", amount: "100" });
    const ids = await pending();
    const r = await Promise.allSettled([settle(ids, []), settle(ids, []), settle(ids, [])]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((await workerAccount(db, chofer)).totals.pagado).toBe(400);
  });

  it("anticipos mayores a lo devengado no se pueden descontar; un anticipo aplicado no se cancela suelto", async () => {
    await servicePaid(300);
    await db.$transaction((tx) => registerAdvance(tx, admin.id, chofer, advanceSchema.parse({ amount: "500", paidAt: "2026-10-22T10:00", method: "EFECTIVO" })));
    await expect(settle(await pending(), await pendingAdv())).rejects.toThrow(/superan lo devengado/);
    await db.$transaction((tx) => registerAdvance(tx, admin.id, chofer, advanceSchema.parse({ amount: "300", paidAt: "2026-10-23T10:00", method: "EFECTIVO" })));
    const acc = await workerAccount(db, chofer);
    const small = acc.payments.find((p) => Number(p.amount) === 300)!;
    const pay = await settle(await pending(), [small.id]); // 300 − 300 = $0 en efectivo, liquidado con anticipo
    expect(Number(pay.amount)).toBe(0);
    await expect(db.$transaction((tx) => cancelPayrollPayment(tx, admin.id, small.id, "Prueba"))).rejects.toThrow(/ya se descontó/);
  });

  it("sueldo base: una sola vez por periodo y según el tipo de pago", async () => {
    const w = await db.$transaction((tx) => createWorker(tx, admin.id, workerSchema.parse({ fullName: "Administrativa DEMO", position: "ADMINISTRACION", payType: "QUINCENAL", baseSalary: "6000", active: "on" })));
    const e = await db.$transaction((tx) => generateBaseSalary(tx, admin.id, w.id, "QUINCENAL", "2026-10-05"));
    expect(Number(e.amount)).toBe(6000);
    expect(e.date.toISOString().slice(0, 10)).toBe("2026-10-15");
    await expect(db.$transaction((tx) => generateBaseSalary(tx, admin.id, w.id, "QUINCENAL", "2026-10-10"))).rejects.toThrow(/ya fue generado/);
    await expect(db.$transaction((tx) => generateBaseSalary(tx, admin.id, w.id, "MENSUAL", "2026-10-10"))).rejects.toThrow(/quincenal/);
    await db.$transaction((tx) => generateBaseSalary(tx, admin.id, w.id, "QUINCENAL", "2026-10-20"));
    expect((await workerAccount(db, w.id)).totals.sueldoBase).toBe(12000);
    await expect(db.$transaction((tx) => generateBaseSalary(tx, admin.id, chofer, "SEMANAL", "2026-10-20"))).rejects.toThrow(/no tiene sueldo base/);
  });

  it("cancelar conceptos: solo pendientes, con motivo; reglas de signo en la base de datos", async () => {
    const b = await entry({ kind: "BONO", date: "2026-10-21", concept: "Bono (DEMO)", amount: "100" });
    await expect(db.$transaction((tx) => cancelPayrollEntry(tx, admin.id, b.id, ""))).rejects.toThrow(/motivo/);
    await db.$transaction((tx) => cancelPayrollEntry(tx, admin.id, b.id, "Capturado por error"));
    expect((await workerAccount(db, chofer)).totals.devengado).toBe(0);
    await expect(db.payrollEntry.create({ data: { workerId: chofer, kind: "DEDUCCION", concept: "x", date: new Date(), amount: 50 } })).rejects.toThrow();
    await expect(db.payrollEntry.create({ data: { workerId: chofer, kind: "BONO", concept: "x", date: new Date(), amount: -50 } })).rejects.toThrow();
  });

  it("estado de cuenta por periodo", async () => {
    await servicePaid(300, "2026-09-20");
    await servicePaid(250, "2026-10-03");
    const oct = periodRange("MENSUAL", "2026-10-01");
    expect((await workerAccount(db, chofer, oct)).totals.devengado).toBe(250);
    expect((await workerAccount(db, chofer)).totals.devengado).toBe(550);
  });
});
