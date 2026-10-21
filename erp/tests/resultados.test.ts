import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { clientSchema } from "@/lib/domain/clients";
import { createRequest, parseRequestForm, quoteSchema, addFollowUp, followUpSchema } from "@/lib/domain/requests";
import { confirmRequest, confirmSchema, scheduleSchema, type Actor } from "@/lib/domain/services";
import { closeService, closeSchema } from "@/lib/domain/closing";
import { createVehicle, vehicleSchema } from "@/lib/domain/fleet";
import { createGeneralExpense, generalExpenseSchema } from "@/lib/domain/finance";
import { saveSetting } from "@/lib/settings";
import { mexicoParts } from "@/lib/format";
import { periodResults, monthPeriod } from "@/lib/finance/results";
import { commercialStats, vehicleResults, monthlySeries } from "@/lib/finance/dashboard";

const db = testDb();
let admin: Actor;
let vA: string, vB: string;
const SEP = monthPeriod(2026, 9);

const req = (price?: string) => db.$transaction((tx) => createRequest(tx, admin, {
  newClient: clientSchema.parse({ name: "Cliente DEMO", phone: `722${Math.floor(1e6 + Math.random() * 8e6)}` }), allowDuplicatePhone: true,
  request: parseRequestForm({ channel: "WHATSAPP", serviceType: "LOCAL" }), quote: price ? quoteSchema.parse({ price }) : undefined,
}));
async function doneService(vehicleId: string, price: string, day: string, km: number) {
  const r = await req(price);
  const s = await db.$transaction((tx) => confirmRequest(tx, admin, r.id, { confirm: confirmSchema.parse({ contractedPrice: price }), schedule: scheduleSchema.parse({ date: day, time: "09:00", durationHours: 3, prepMinutes: 0, returnMinutes: 0 }), assignment: { vehicleIds: [vehicleId], staff: [] } }));
  const last = await db.odometerReading.findFirst({ where: { vehicleId }, orderBy: { odometer: "desc" } });
  const start = last?.odometer ?? 10000;
  await db.$transaction((tx) => closeService(tx, admin.id, s.id, s.version, closeSchema.parse({ actualStart: `${day}T09:00`, actualEnd: `${day}T12:00`, extras: [], staff: [], vehicles: [{ vehicleId, odometerStart: start, odometerEnd: start + km, acceptGap: false }], tolls: 100 })));
  return s;
}

beforeEach(async () => {
  await truncateData(db);
  const role = await db.role.findUniqueOrThrow({ where: { key: "ADMINISTRADOR" } });
  const u = await db.user.create({ data: { email: "admin@test.mx", name: "Admin DEMO", passwordHash: await hashPassword("ClaveDemo2026"), roleId: role.id } });
  admin = { id: u.id, name: u.name, canOverride: true };
  vA = (await db.$transaction((tx) => createVehicle(tx, admin.id, vehicleSchema.parse({ code: "U-A", name: "Unidad A", initialOdometer: "10000" })))).id;
  vB = (await db.$transaction((tx) => createVehicle(tx, admin.id, vehicleSchema.parse({ code: "U-B", name: "Unidad B", initialOdometer: "10000" })))).id;
});
afterAll(() => db.$disconnect());

describe("Embudo comercial", () => {
  it("recibidas → cotizadas → confirmadas, con no concretadas y conversión", async () => {
    const p = mexicoParts();
    const NOW = monthPeriod(p.year, p.month);
    await doneService(vA, "4500", "2026-09-10", 40);
    const lost = await req("3000");
    await db.$transaction((tx) => addFollowUp(tx, admin.id, lost.id, followUpSchema.parse({ newStatus: "NO_CONCRETADA", lostReason: "Precio" })));
    await req();
    const c = await commercialStats(db, NOW);
    expect(c).toMatchObject({ recibidas: 3, cotizadas: 2, confirmadas: 1, noConcretadas: 1, enSeguimiento: 1, serviciosConfirmados: 1 });
    expect(c.conversion).toBeCloseTo(1 / 3);
    expect(c.cierreCotizaciones).toBe(0.5);
    expect((await commercialStats(db, SEP)).serviciosRealizados).toBe(1);
    expect((await commercialStats(db, monthPeriod(2020, 1))).conversion).toBeNull();
  });
});

describe("Resultados por unidad y costos compartidos", () => {
  it("asigna gastos fijos según el criterio configurado y la suma cuadra con el total", async () => {
    await doneService(vA, "6000", "2026-09-10", 300);
    await doneService(vB, "2000", "2026-09-12", 100);
    await db.$transaction((tx) => createGeneralExpense(tx, admin.id, generalExpenseSchema.parse({ categoryKey: "RENTA", date: "2026-09-01", total: "8000", description: "Renta (DEMO)" })));
    const global = await periodResults(db, SEP);
    expect(global.gastos.fijos).toBe(8000);
    const cases: [string, number, number][] = [["INGRESOS", 6000, 2000], ["KILOMETROS", 6000, 2000], ["SERVICIOS", 4000, 4000], ["PARTES_IGUALES", 4000, 4000]];
    for (const [criterio, a, b] of cases) {
      await saveSetting(db, "finanzas", { tasaIva: 0.16, metodoDepreciacion: "LINEAL_TIEMPO", criterioAsignacionFijos: criterio });
      const vr = await vehicleResults(db, SEP, global);
      const A = vr.rows.find((x) => x.id === vA)!, B = vr.rows.find((x) => x.id === vB)!;
      expect([A.compartidos, B.compartidos], criterio).toEqual([a, b]);
      expect(A.compartidos + B.compartidos).toBe(vr.shared);
      expect(A).toMatchObject({ ingresos: 6000, gastosDirectos: 100, servicios: 1, km: 300 });
      expect(A.utilidad).toBe(6000 - 100 - a);
    }
    // La suma de utilidades por unidad = resultado operativo global (sin depreciación ni otros conceptos en este caso)
    const vr = await vehicleResults(db, SEP, global);
    expect(vr.rows.reduce((s, x) => s + x.utilidad, 0)).toBe(global.resultadoOperativo);
  });

  it("serie mensual del año", async () => {
    await doneService(vA, "4500", "2026-09-10", 40);
    const s = await monthlySeries(db, 2026, 9);
    expect(s).toHaveLength(9);
    expect(s[8]).toMatchObject({ m: 9, ventas: 4500, servicios: 1, gastosDirectos: 100 });
    expect(s[7]).toMatchObject({ ventas: 0, servicios: 0 });
  });
});
