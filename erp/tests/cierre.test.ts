import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { clientSchema } from "@/lib/domain/clients";
import { createRequest, parseRequestForm, quoteSchema } from "@/lib/domain/requests";
import { createWorker, workerSchema } from "@/lib/domain/workers";
import { confirmRequest, confirmSchema, scheduleSchema, registerPayment, paymentSchema, type Actor } from "@/lib/domain/services";
import { closeService, closeSchema, serviceEconomics, odometerIssues, OdometerGapError, type CloseInput } from "@/lib/domain/closing";
import { createExpense, cancelExpense, expenseSchema, DuplicateExpenseError } from "@/lib/domain/expenses";

const db = testDb();
let admin: Actor;
let veh: string, chofer: string, ay1: string, ay2: string;

async function confirmed(date = "2026-10-10", time = "09:00", withCrew = true) {
  const r = await db.$transaction((tx) => createRequest(tx, admin, {
    newClient: clientSchema.parse({ name: "Cliente DEMO Cierre", phone: `722${Math.floor(1e6 + Math.random() * 8e6)}` }), allowDuplicatePhone: true,
    request: parseRequestForm({ channel: "WHATSAPP", serviceType: "LOCAL", orig_municipality: "Metepec", dest_municipality: "Toluca" }),
    quote: quoteSchema.parse({ price: "4500" }),
  }));
  return db.$transaction((tx) => confirmRequest(tx, admin, r.id, {
    confirm: confirmSchema.parse({ contractedPrice: "4500" }),
    schedule: scheduleSchema.parse({ date, time, durationHours: 4, prepMinutes: 30, returnMinutes: 60 }),
    assignment: { vehicleIds: [veh], staff: withCrew ? [{ workerId: chofer, role: "CHOFER", agreedPay: 300 }, { workerId: ay1, role: "AYUDANTE", agreedPay: 200 }, { workerId: ay2, role: "AYUDANTE", agreedPay: 200 }] : [] },
  }));
}
async function staffOf(serviceId: string) {
  return (await db.serviceStaff.findMany({ where: { serviceId } })).map((s) => ({ serviceStaffId: s.id, participated: true, agreedPay: Number(s.agreedPay) }));
}
function input(o: Partial<CloseInput> & { vehicles: CloseInput["vehicles"]; staff: CloseInput["staff"] }): CloseInput {
  return closeSchema.parse({ actualStart: "2026-10-10T09:15", actualEnd: "2026-10-10T13:40", extras: [], ...o });
}
const close = async (id: string, c: CloseInput) => {
  const s = await db.service.findUniqueOrThrow({ where: { id } });
  return db.$transaction((tx) => closeService(tx, admin.id, id, s.version, c));
};

beforeEach(async () => {
  await truncateData(db);
  const role = await db.role.findUniqueOrThrow({ where: { key: "ADMINISTRADOR" } });
  const u = await db.user.create({ data: { email: "admin@test.mx", name: "Admin DEMO", passwordHash: await hashPassword("ClaveDemo2026"), roleId: role.id } });
  admin = { id: u.id, name: u.name, canOverride: true };
  veh = (await db.vehicle.create({ data: { code: "T-F350", name: "F350 prueba", initialOdometer: 10000, currentOdometer: 10000 } })).id;
  const w = (n: string, p: "CHOFER" | "AYUDANTE") => db.$transaction((tx) => createWorker(tx, admin.id, workerSchema.parse({ fullName: n, position: p, payType: "POR_SERVICIO", active: "on" })));
  chofer = (await w("Chofer DEMO", "CHOFER")).id;
  ay1 = (await w("Ayudante DEMO 1", "AYUDANTE")).id;
  ay2 = (await w("Ayudante DEMO 2", "AYUDANTE")).id;
});
afterAll(() => db.$disconnect());

describe("Cierre operativo", () => {
  it("finaliza y alimenta flotilla, gastos y nómina en una sola operación; el cobro sigue independiente", async () => {
    const s = await confirmed();
    await db.$transaction((tx) => registerPayment(tx, admin.id, s.id, paymentSchema.parse({ kind: "ANTICIPO", amount: "2000", method: "TRANSFERENCIA", receivedAt: "2026-10-05T10:00" })));
    const res = await close(s.id, input({
      vehicles: [{ vehicleId: veh, odometerStart: 10000, odometerEnd: 10045, fuelLiters: 30, fuelAmount: 700, acceptGap: false }],
      staff: await staffOf(s.id), tolls: 120, parking: 50, perDiem: 200,
      extras: [{ description: "Maniobra por escalera (DEMO)", amount: 300 }],
      deliveryEvidence: "Recibió la señora López, sin daños", incidents: "Se rayó una mesa lateral",
    }));
    expect(res).toEqual({ km: 45, payroll: 700 });
    const full = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    expect(full.status).toBe("FINALIZADO");
    expect(full.actualStart?.toISOString()).toBe("2026-10-10T15:15:00.000Z");
    expect(full.operationalClosedAt).not.toBeNull();
    expect(full.collectionStatus).toBe("PARCIAL"); // cierre operativo ≠ cierre financiero
    expect(full.deliveryEvidence).toContain("señora López");
    // Flotilla
    expect((await db.vehicle.findUniqueOrThrow({ where: { id: veh } })).currentOdometer).toBe(10045);
    expect((await db.odometerReading.findMany({ where: { serviceId: s.id }, orderBy: { readingAt: "asc" } })).map((r) => [r.source, r.odometer])).toEqual([["SERVICIO_INICIO", 10000], ["SERVICIO_FIN", 10045]]);
    const fuel = await db.fuelLog.findFirstOrThrow({ where: { serviceId: s.id }, include: { expense: true } });
    expect(Number(fuel.liters)).toBe(30);
    expect(Number(fuel.expense!.total)).toBe(700); // el importe vive solo en gastos
    // Gastos directos ligados al folio
    const exps = await db.expense.findMany({ where: { serviceId: s.id }, include: { category: true } });
    expect(exps.map((e) => [e.category.key, Number(e.total)]).sort()).toEqual([["CASETAS", 120], ["COMBUSTIBLE", 700], ["ESTACIONAMIENTOS", 50], ["OTROS_DIRECTOS", 300], ["VIATICOS", 200]]);
    expect(exps.every((e) => e.folio.startsWith("GAS-2026-"))).toBe(true);
    // Nómina
    const pe = await db.payrollEntry.findMany({ where: { serviceId: s.id }, include: { worker: true } });
    expect(pe.map((p) => [p.worker.fullName, Number(p.amount), p.status]).sort()).toEqual([["Ayudante DEMO 1", 200, "GENERADO"], ["Ayudante DEMO 2", 200, "GENERADO"], ["Chofer DEMO", 300, "GENERADO"]]);
    expect(pe[0].concept).toContain("Mudanza local");
    // Rentabilidad directa
    const eco = await serviceEconomics(db, s.id);
    expect(eco).toMatchObject({ price: 4500, direct: 1370, labor: 700, km: 45, margin: 2430 });
    // No se puede cerrar dos veces
    await expect(close(s.id, input({ vehicles: [{ vehicleId: veh, odometerStart: 10045, odometerEnd: 10050, acceptGap: false }], staff: [] }))).rejects.toThrow(/ya tiene cierre/);
  });

  it("dos cierres simultáneos: uno se aplica y no duplica pagos ni gastos", async () => {
    const s = await confirmed();
    const st = await staffOf(s.id);
    const c = input({ vehicles: [{ vehicleId: veh, odometerStart: 10000, odometerEnd: 10020, acceptGap: false }], staff: st, tolls: 100 });
    const results = await Promise.allSettled([close(s.id, c), close(s.id, c), close(s.id, c)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.payrollEntry.count({ where: { serviceId: s.id } })).toBe(3);
    expect(await db.expense.count({ where: { serviceId: s.id } })).toBe(1);
    expect(await db.odometerReading.count({ where: { serviceId: s.id } })).toBe(2);
  });

  it("solo genera pago a quien participó y con importe mayor a cero", async () => {
    const s = await confirmed();
    // El chofer participa (con pago ajustado a $350); un ayudante faltó y el otro participó sin pago.
    const rows = await db.serviceStaff.findMany({ where: { serviceId: s.id } });
    const st = rows.map((r) => ({
      serviceStaffId: r.id,
      participated: r.workerId !== ay1,
      agreedPay: r.workerId === chofer ? 350 : r.workerId === ay2 ? 0 : Number(r.agreedPay),
    }));
    const res = await close(s.id, input({ vehicles: [{ vehicleId: veh, odometerStart: 10000, odometerEnd: 10010, acceptGap: false }], staff: st }));
    const entries = await db.payrollEntry.findMany({ where: { serviceId: s.id } });
    expect(entries).toHaveLength(1);
    expect(Number(entries[0].amount)).toBe(350);
    expect(res.payroll).toBe(entries.reduce((a, e) => a + Number(e.amount), 0));
    expect(await db.serviceStaff.count({ where: { serviceId: s.id, participated: false } })).toBe(1);
  });

  it("congruencia del odómetro: huecos y retrocesos requieren confirmación; el historial no se sobrescribe", async () => {
    const a = await confirmed("2026-10-10", "09:00", false);
    await close(a.id, input({ vehicles: [{ vehicleId: veh, odometerStart: 10000, odometerEnd: 10045, acceptGap: false }], staff: [] }));
    const b = await confirmed("2026-10-11", "09:00", false);
    const bIn = (start: number, acceptGap = false, closingNotes?: string) =>
      input({ actualStart: "2026-10-11T09:00", actualEnd: "2026-10-11T12:00", vehicles: [{ vehicleId: veh, odometerStart: start, odometerEnd: start + 20, acceptGap }], staff: [], closingNotes });
    await expect(close(b.id, bIn(10200))).rejects.toBeInstanceOf(OdometerGapError); // 155 km sin registrar
    await expect(close(b.id, bIn(10030))).rejects.toThrow(/MENOR a la última lectura/);
    await expect(close(b.id, bIn(10030, true))).rejects.toThrow(/explique el motivo/);
    await close(b.id, bIn(10200, true)); // hueco confirmado (p. ej. traslado sin servicio)
    const issues = await odometerIssues(db, veh);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: "HUECO", previous: 10045, current: 10200 });
    expect(await db.odometerReading.count({ where: { vehicleId: veh } })).toBe(4);
  });

  it("valida horarios y unidades", async () => {
    const s = await confirmed();
    const st = await staffOf(s.id);
    await expect(close(s.id, input({ actualEnd: "2026-10-10T08:00", vehicles: [{ vehicleId: veh, odometerStart: 10000, odometerEnd: 10010, acceptGap: false }], staff: st }))).rejects.toThrow(/posterior/);
    await expect(close(s.id, input({ vehicles: [], staff: st }))).rejects.toThrow(/cada unidad/);
    expect(() => input({ vehicles: [{ vehicleId: veh, odometerStart: 10050, odometerEnd: 10000, acceptGap: false }], staff: st })).toThrow(/no puede ser menor/);
  });
});

describe("Gastos del servicio", () => {
  it("detecta gastos duplicados y permite cancelarlos sin borrarlos", async () => {
    const s = await confirmed();
    const e = expenseSchema.parse({ categoryKey: "CASETAS", date: "2026-10-10", total: "250", description: "Caseta México–Toluca (DEMO)" });
    const first = await db.$transaction((tx) => createExpense(tx, admin.id, e, { serviceId: s.id }));
    await expect(db.$transaction((tx) => createExpense(tx, admin.id, e, { serviceId: s.id }))).rejects.toBeInstanceOf(DuplicateExpenseError);
    await db.$transaction((tx) => createExpense(tx, admin.id, e, { serviceId: s.id }, { allowDuplicate: true }));
    await db.$transaction((tx) => cancelExpense(tx, admin.id, first.id, "Capturado dos veces (DEMO)"));
    expect(await db.expense.count({ where: { serviceId: s.id } })).toBe(2);
    expect((await serviceEconomics(db, s.id)).direct).toBe(250);
    // Con IVA desglosado
    const v = await db.$transaction((tx) => createExpense(tx, admin.id, expenseSchema.parse({ categoryKey: "OTROS_DIRECTOS", date: "2026-10-10", total: "116", vatAmount: "16", description: "Material (DEMO)" }), { serviceId: s.id }));
    expect([Number(v.subtotal), Number(v.vatAmount), Number(v.total)]).toEqual([100, 16, 116]);
  });
});
