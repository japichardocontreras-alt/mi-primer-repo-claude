import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { clientSchema } from "@/lib/domain/clients";
import { createRequest, parseRequestForm, quoteSchema } from "@/lib/domain/requests";
import { createWorker, workerSchema } from "@/lib/domain/workers";
import { confirmRequest, confirmSchema, scheduleSchema, registerPayment, paymentSchema, cancelPayment, type Actor } from "@/lib/domain/services";
import { closeService, closeSchema } from "@/lib/domain/closing";
import { createVehicle, vehicleSchema, generateMonthlyDepreciation } from "@/lib/domain/fleet";
import { settlePayroll, workerAccount } from "@/lib/domain/payroll";
import { createGeneralExpense, generalExpenseSchema, markExpensePaid, saveRecurring, recurringSchema, generateRecurring, createMovement, movementSchema, cancelMovement } from "@/lib/domain/finance";
import { cancelExpense, DuplicateExpenseError } from "@/lib/domain/expenses";
import { saveSetting } from "@/lib/settings";
import { periodResults, monthPeriod } from "@/lib/finance/results";

const db = testDb();
let admin: Actor;
let veh: string;
const SEP = monthPeriod(2026, 9);

async function fullService(o: { includesVat?: boolean; price?: string } = {}) {
  const w = (n: string, p: "CHOFER" | "AYUDANTE") => db.$transaction((tx) => createWorker(tx, admin.id, workerSchema.parse({ fullName: n, position: p, payType: "POR_SERVICIO", active: "on" })));
  const [c, a1, a2] = [await w("Chofer DEMO", "CHOFER"), await w("Ayudante DEMO 1", "AYUDANTE"), await w("Ayudante DEMO 2", "AYUDANTE")];
  const r = await db.$transaction((tx) => createRequest(tx, admin, {
    newClient: clientSchema.parse({ name: "Cliente DEMO Finanzas", phone: `722${Math.floor(1e6 + Math.random() * 8e6)}` }), allowDuplicatePhone: true,
    request: parseRequestForm({ channel: "WHATSAPP", serviceType: "LOCAL", orig_municipality: "Metepec", dest_municipality: "Toluca" }),
    quote: quoteSchema.parse({ price: o.price ?? "4500" }),
  }));
  const s = await db.$transaction((tx) => confirmRequest(tx, admin, r.id, {
    confirm: confirmSchema.parse({ contractedPrice: o.price ?? "4500", includesVat: o.includesVat ? "on" : undefined }),
    schedule: scheduleSchema.parse({ date: "2026-09-15", time: "09:00", durationHours: 4, prepMinutes: 30, returnMinutes: 60 }),
    assignment: { vehicleIds: [veh], staff: [{ workerId: c.id, role: "CHOFER", agreedPay: 300 }, { workerId: a1.id, role: "AYUDANTE", agreedPay: 200 }, { workerId: a2.id, role: "AYUDANTE", agreedPay: 200 }] },
  }));
  await db.$transaction((tx) => registerPayment(tx, admin.id, s.id, paymentSchema.parse({ kind: "ANTICIPO", amount: "2000", method: "TRANSFERENCIA", receivedAt: "2026-09-10T12:00" })));
  const st = await db.serviceStaff.findMany({ where: { serviceId: s.id } });
  const cur = await db.service.findUniqueOrThrow({ where: { id: s.id } });
  await db.$transaction((tx) => closeService(tx, admin.id, s.id, cur.version, closeSchema.parse({
    actualStart: "2026-09-15T09:10", actualEnd: "2026-09-15T13:30", extras: [{ description: "Maniobra (DEMO)", amount: 300 }],
    vehicles: [{ vehicleId: veh, odometerStart: 20000, odometerEnd: 20045, fuelLiters: 30, fuelAmount: 700, acceptGap: false }],
    staff: st.map((x) => ({ serviceStaffId: x.id, participated: true, agreedPay: Number(x.agreedPay) })), tolls: 120, parking: 50, perDiem: 200,
  })));
  const final = await db.$transaction((tx) => registerPayment(tx, admin.id, s.id, paymentSchema.parse({ kind: "PAGO_FINAL", amount: "2500", method: "EFECTIVO", receivedAt: "2026-09-15T14:00" })));
  return { s, workers: [c.id, a1.id, a2.id], final };
}

beforeEach(async () => {
  await truncateData(db);
  const role = await db.role.findUniqueOrThrow({ where: { key: "ADMINISTRADOR" } });
  const u = await db.user.create({ data: { email: "admin@test.mx", name: "Admin DEMO", passwordHash: await hashPassword("ClaveDemo2026"), roleId: role.id } });
  admin = { id: u.id, name: u.name, canOverride: true };
  await saveSetting(db, "finanzas", { tasaIva: 0.16, metodoDepreciacion: "LINEAL_TIEMPO", criterioAsignacionFijos: "INGRESOS" });
  veh = (await db.$transaction((tx) => createVehicle(tx, admin.id, vehicleSchema.parse({ code: "F350-T", name: "F350 prueba", initialOdometer: "20000", acquisitionDate: "2025-06-10", acquisitionPrice: "600000", residualValue: "120000", usefulLifeYears: "5", usefulLifeKm: "400000" })))).id;
});
afterAll(() => db.$disconnect());

describe("Resultados financieros del mes (caso obligatorio)", () => {
  it("servicio $4,500 con anticipo $2,000 y pago final $2,500, gastos, nómina, fijos con IVA, depreciación y movimientos no operativos", async () => {
    const { workers } = await fullService();
    // Nómina pagada (corte)
    for (const w of workers) {
      const acc = await workerAccount(db, w);
      await db.$transaction((tx) => settlePayroll(tx, admin.id, w, { paidAt: "2026-09-20T18:00", method: "EFECTIVO", entryIds: acc.entries.map((e) => e.id), advanceIds: [] }));
    }
    // Gasto fijo recurrente (renta) por pagar y luego pagado
    const fixed = await db.expenseCategory.findUniqueOrThrow({ where: { key: "RENTA" } });
    await db.$transaction((tx) => saveRecurring(tx, admin.id, recurringSchema.parse({ categoryKey: fixed.key, description: "Renta bodega (DEMO)", amount: "8000", dayOfMonth: "5", startDate: "2026-01-01", active: "on" })));
    expect(await db.$transaction((tx) => generateRecurring(tx, admin.id, "2026-09"))).toEqual({ created: 1, skipped: 0 });
    const renta = await db.expense.findFirstOrThrow({ where: { recurringPeriod: "2026-09" } });
    expect(renta.paidAt).toBeNull();
    let r = await periodResults(db, SEP);
    expect(r.flujo.gastosPagados).toBe(1370); // la renta por pagar aún no sale de caja
    await db.$transaction((tx) => markExpensePaid(tx, admin.id, renta.id, "2026-09-05", "TRANSFERENCIA"));
    // Gasto fijo con IVA desglosado
    await db.$transaction((tx) => createGeneralExpense(tx, admin.id, generalExpenseSchema.parse({ categoryKey: "SOFTWARE", date: "2026-09-01", total: "1160", vatAmount: "160", description: "Software (DEMO)" })));
    // Movimientos no operativos
    await db.$transaction((tx) => createMovement(tx, admin.id, movementSchema.parse({ type: "PRESTAMO_RECIBIDO", date: "2026-09-02", amount: "50000", description: "Préstamo bancario (DEMO)" })));
    await db.$transaction((tx) => createMovement(tx, admin.id, movementSchema.parse({ type: "COMPRA_ACTIVO", date: "2026-09-03", amount: "30000", description: "Rampa y equipo (DEMO)" })));
    await db.$transaction((tx) => createMovement(tx, admin.id, movementSchema.parse({ type: "PAGO_FINANCIAMIENTO", date: "2026-09-25", amount: "5000", interestPortion: "800", description: "Abono préstamo (DEMO)" })));

    r = await periodResults(db, SEP);
    expect(r.ventas).toEqual({ pactadas: 4500, netas: 4500, servicios: 1 });
    expect(r.cobranza).toMatchObject({ cobrado: 4500, neto: 4500, cuentasPorCobrar: 0 });
    expect(r.gastos).toMatchObject({ directos: 1370, flotilla: 0, fijos: 9000, extraordinarios: 0 }); // 8,000 renta + 1,000 software sin IVA
    expect(r.nomina).toEqual({ devengada: 700, servicios: 700, pagada: 700 });
    expect(r.depreciacion).toEqual({ monto: 8000, estimada: true, metodo: "LINEAL_TIEMPO" }); // (600,000 − 120,000) ÷ 60
    expect(r.otros).toMatchObject({ prestamos: 50000, comprasActivo: 30000, pagosFinanciamiento: 5000, intereses: 800 });
    expect(r.resultadoOperativo).toBe(4500 - 1370 - 9000 - 700 - 8000); // −14,570
    expect(r.utilidad).toBe(-14570 - 800);
    // Préstamo no es venta; compra de activo y abono a capital no son gasto operativo
    expect(r.flujo).toMatchObject({ entradas: 54500, salidas: 1370 + 8000 + 1160 + 700 + 30000 + 5000 });
    expect(r.flujo.neto).toBe(54500 - 46230);
    expect(r.iva).toMatchObject({ trasladado: 0, acreditable: 160 });

    // Depreciación registrada: deja de ser estimada y no cambia el importe
    await db.$transaction((tx) => generateMonthlyDepreciation(tx, admin.id, 2026, 9));
    expect((await periodResults(db, SEP)).depreciacion).toEqual({ monto: 8000, estimada: false, metodo: "LINEAL_TIEMPO" });
    // Por unidad: ventas, directos, nómina del servicio y depreciación de esa unidad
    const byV = await periodResults(db, SEP, { vehicleId: veh });
    expect(byV).toMatchObject({ ventas: { netas: 4500 }, gastos: { directos: 1370, fijos: 0 }, nomina: { devengada: 700 }, depreciacion: { monto: 8000 } });
    expect(byV.resultadoOperativo).toBe(4500 - 1370 - 700 - 8000);
  });

  it("cancelaciones, cuentas por cobrar al cierre, IVA trasladado y meses sin movimientos", async () => {
    const { s, final } = await fullService({ includesVat: true, price: "5800" });
    let r = await periodResults(db, SEP);
    expect(r.ventas).toMatchObject({ pactadas: 5800, netas: 5000 });
    expect(r.iva.trasladado).toBe(620.69); // (2,000 + 2,500 cobrados) × 0.16 / 1.16 — solo sobre lo cobrado
    expect(r.cobranza.cuentasPorCobrar).toBe(1300);
    await db.$transaction((tx) => cancelPayment(tx, admin.id, final.id, "Cheque rebotado (DEMO)"));
    r = await periodResults(db, SEP);
    expect(r.cobranza).toMatchObject({ cobrado: 2000, cuentasPorCobrar: 3800 });
    const exp = await db.expense.findFirstOrThrow({ where: { serviceId: s.id, category: { key: "CASETAS" } } });
    await db.$transaction((tx) => cancelExpense(tx, admin.id, exp.id, "Duplicado (DEMO)"));
    expect((await periodResults(db, SEP)).gastos.directos).toBe(1250);
    const mv = await db.$transaction((tx) => createMovement(tx, admin.id, movementSchema.parse({ type: "APORTACION_CAPITAL", date: "2026-09-02", amount: "10000", description: "Aportación (DEMO)" })));
    await db.$transaction((tx) => cancelMovement(tx, admin.id, mv.id, "Error de captura"));
    expect((await periodResults(db, SEP)).otros.aportaciones).toBe(0);
    // Mes sin actividad: todo en cero (más la depreciación real de la unidad)
    const nov = await periodResults(db, monthPeriod(2026, 11));
    expect(nov).toMatchObject({ ventas: { pactadas: 0, servicios: 0 }, cobranza: { cobrado: 0 }, gastos: { directos: 0, fijos: 0 }, nomina: { devengada: 0 } });
  });
});

describe("Gastos fijos, recurrentes y duplicados", () => {
  it("los recurrentes no se duplican aunque se generen varias veces o a la vez", async () => {
    await db.$transaction((tx) => saveRecurring(tx, admin.id, recurringSchema.parse({ categoryKey: "INTERNET", description: "Internet (DEMO)", amount: "580", includesVat: "on", dayOfMonth: "10", startDate: "2026-01-01", active: "on" })));
    await db.$transaction((tx) => saveRecurring(tx, admin.id, recurringSchema.parse({ categoryKey: "TELEFONIA", description: "Celulares (DEMO)", amount: "900", dayOfMonth: "1", startDate: "2026-10-01", active: "on" })));
    await Promise.allSettled([1, 2, 3].map(() => db.$transaction((tx) => generateRecurring(tx, admin.id, "2026-09"))));
    expect(await db.expense.count({ where: { recurringPeriod: "2026-09" } })).toBe(1); // telefonía empieza en octubre
    expect(await db.$transaction((tx) => generateRecurring(tx, admin.id, "2026-09"))).toEqual({ created: 0, skipped: 1 });
    const e = await db.expense.findFirstOrThrow({ where: { recurringPeriod: "2026-09" } });
    expect([Number(e.subtotal), Number(e.vatAmount), Number(e.total), e.date.toISOString().slice(0, 10)]).toEqual([500, 80, 580, "2026-09-10"]);
    expect(await db.$transaction((tx) => generateRecurring(tx, admin.id, "2026-10"))).toEqual({ created: 2, skipped: 0 });
  });

  it("detecta gastos generales duplicados y liga gastos a un servicio por folio", async () => {
    const e = generalExpenseSchema.parse({ categoryKey: "PUBLICIDAD", date: "2026-09-12", total: "1500", description: "Anuncio (DEMO)", supplier: "Meta" });
    await db.$transaction((tx) => createGeneralExpense(tx, admin.id, e));
    await expect(db.$transaction((tx) => createGeneralExpense(tx, admin.id, e))).rejects.toBeInstanceOf(DuplicateExpenseError);
    await expect(db.$transaction((tx) => createGeneralExpense(tx, admin.id, generalExpenseSchema.parse({ ...e, serviceFolio: "MM-2026-999999" })))).rejects.toThrow(/No existe/);
    expect(() => movementSchema.parse({ type: "PRESTAMO_RECIBIDO", date: "2026-09-02", amount: "100", interestPortion: "10", description: "x" })).toThrow(/Solo aplica/);
  });
});
