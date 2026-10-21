import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { straightLine, perKilometer, monthsElapsed } from "@/lib/domain/depreciation";
import {
  createVehicle, updateVehicle, vehicleSchema, addMaintenance, maintenanceSchema, cancelMaintenance, addDocument, documentSchema, cancelDocument,
  addFuel, fuelSchema, recordOdometer, generateMonthlyDepreciation, fleetAlerts, syncFleetNotifications, kmBetween,
} from "@/lib/domain/fleet";
import { clientSchema } from "@/lib/domain/clients";
import { createRequest, parseRequestForm } from "@/lib/domain/requests";
import { confirmRequest, confirmSchema, scheduleSchema } from "@/lib/domain/services";

const db = testDb();
let admin: { id: string; name: string; canOverride: boolean };
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
const veh = (o: Record<string, string> = {}) => db.$transaction((tx) => createVehicle(tx, admin.id, vehicleSchema.parse({ code: "F350-T", name: "F350 prueba", ...o })));

beforeEach(async () => {
  await truncateData(db);
  const role = await db.role.findUniqueOrThrow({ where: { key: "ADMINISTRADOR" } });
  const u = await db.user.create({ data: { email: "admin@test.mx", name: "Admin DEMO", passwordHash: await hashPassword("ClaveDemo2026"), roleId: role.id } });
  admin = { id: u.id, name: u.name, canOverride: true };
});
afterAll(() => db.$disconnect());

describe("Depreciación", () => {
  const p = { acquisitionPrice: 600000, residualValue: 120000, usefulLifeYears: 5, usefulLifeKm: 400000, acquisitionDate: D("2026-01-15") };
  it("lineal por tiempo: inicia el mes siguiente a la compra y se detiene al agotar la vida útil", () => {
    expect(monthsElapsed(D("2026-01-15"), 2026, 1)).toBe(0);
    expect(straightLine(p, 2026, 1)).toMatchObject({ annual: 96000, monthly: 8000, thisMonth: 0, accumulated: 0, bookValue: 600000 });
    expect(straightLine(p, 2026, 10)).toMatchObject({ thisMonth: 8000, accumulated: 72000, bookValue: 528000, monthsElapsed: 9 });
    expect(straightLine(p, 2031, 1)).toMatchObject({ accumulated: 480000, bookValue: 120000 }); // 60 meses
    expect(straightLine(p, 2031, 2)).toMatchObject({ thisMonth: 0, accumulated: 480000, bookValue: 120000 });
    expect(straightLine({ ...p, usefulLifeYears: null }, 2026, 10)).toBeNull();
  });
  it("por kilómetro, con tope en la base depreciable", () => {
    expect(perKilometer(p, 45, 45)).toMatchObject({ perKm: 1.2, accumulated: 54, thisPeriod: 54, bookValue: 599946 });
    expect(perKilometer(p, 1_000_000)).toMatchObject({ accumulated: 480000, bookValue: 120000 });
  });
  it("registro mensual idempotente con ambos métodos", async () => {
    const v = await veh({ acquisitionPrice: "600000", residualValue: "120000", usefulLifeYears: "5", usefulLifeKm: "400000", acquisitionDate: "2026-01-15", initialOdometer: "10000" });
    await db.$transaction((tx) => recordOdometer(tx, admin.id, v.id, new Date("2026-09-30T18:00:00Z"), 10500, "MANUAL", null));
    await db.$transaction((tx) => recordOdometer(tx, admin.id, v.id, new Date("2026-10-20T18:00:00Z"), 11000, "MANUAL", null));
    expect(await kmBetween(db, v.id, 10000, new Date("2026-10-01T06:00:00Z"), new Date("2026-11-01T06:00:00Z"))).toBe(500);
    await db.$transaction((tx) => generateMonthlyDepreciation(tx, admin.id, 2026, 10));
    await db.$transaction((tx) => generateMonthlyDepreciation(tx, admin.id, 2026, 10));
    const rows = await db.depreciationEntry.findMany({ where: { vehicleId: v.id }, orderBy: { method: "asc" } });
    expect(rows.map((r) => [r.method, Number(r.amount)])).toEqual([["LINEAL_TIEMPO", 8000], ["POR_KILOMETRO", 600]]);
  });
});

describe("Unidades y kilometraje", () => {
  it("identificador y placas únicos; km inicial bloqueado con historial; lecturas que retroceden requieren confirmación", async () => {
    const v = await veh({ plates: "mex-123-a", initialOdometer: "50000" });
    expect(v.plates).toBe("MEX-123-A");
    expect(v.currentOdometer).toBe(50000);
    await expect(veh()).rejects.toThrow(/identificador/);
    await expect(veh({ code: "OTRA", plates: "MEX-123-A" })).rejects.toThrow(/placas/);
    await db.$transaction((tx) => recordOdometer(tx, admin.id, v.id, new Date("2026-10-01T18:00:00Z"), 50100, "MANUAL", null));
    await expect(db.$transaction((tx) => recordOdometer(tx, admin.id, v.id, new Date("2026-10-02T18:00:00Z"), 50050, "MANUAL", null))).rejects.toThrow(/menor/);
    await expect(db.$transaction((tx) => recordOdometer(tx, admin.id, v.id, new Date("2026-09-01T18:00:00Z"), 50200, "MANUAL", null))).rejects.toThrow(/posterior/);
    const cur = await db.vehicle.findUniqueOrThrow({ where: { id: v.id } });
    expect(cur.currentOdometer).toBe(50100);
    await expect(db.$transaction((tx) => updateVehicle(tx, admin.id, v.id, cur.version, vehicleSchema.parse({ code: "F350-T", name: "F350 prueba", initialOdometer: "1" })))).rejects.toThrow(/no puede cambiarse/);
  });

  it("no se puede mandar a taller una unidad con servicios programados", async () => {
    const v = await veh();
    const r = await db.$transaction((tx) => createRequest(tx, admin, { newClient: clientSchema.parse({ name: "Cliente DEMO", phone: "7221234567" }), request: parseRequestForm({ channel: "WHATSAPP", serviceType: "LOCAL" }) }));
    const next = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
    const s = await db.$transaction((tx) => confirmRequest(tx, admin, r.id, { confirm: confirmSchema.parse({ contractedPrice: "4500" }), schedule: scheduleSchema.parse({ date: next, time: "09:00", durationHours: 3, prepMinutes: 0, returnMinutes: 0 }), assignment: { vehicleIds: [v.id], staff: [] } }));
    const cur = await db.vehicle.findUniqueOrThrow({ where: { id: v.id } });
    await expect(db.$transaction((tx) => updateVehicle(tx, admin.id, v.id, cur.version, vehicleSchema.parse({ code: "F350-T", name: "F350 prueba", status: "EN_TALLER" })))).rejects.toThrow(new RegExp(s.folio));
  });
});

describe("Mantenimientos, documentos, combustible y alertas", () => {
  it("el costo del mantenimiento se registra una sola vez como gasto de la unidad; cancelar revierte el gasto", async () => {
    const v = await veh({ initialOdometer: "40000" });
    const m = await db.$transaction((tx) => addMaintenance(tx, admin.id, v.id, maintenanceSchema.parse({ type: "CAMBIO_ACEITE", date: "2026-10-10", odometer: "41000", cost: "1800", provider: "Taller DEMO", nextOdometer: "46000", nextDate: "2027-04-10" })));
    const exps = await db.expense.findMany({ where: { vehicleId: v.id }, include: { category: true } });
    expect(exps.map((e) => [e.category.key, Number(e.total), e.id])).toEqual([["MANTENIMIENTO", 1800, m.expenseId]]);
    expect((await db.vehicle.findUniqueOrThrow({ where: { id: v.id } })).currentOdometer).toBe(41000);
    await expect(db.$transaction((tx) => addMaintenance(tx, admin.id, v.id, maintenanceSchema.parse({ type: "FRENOS", date: "2026-10-12", odometer: "40500" })))).rejects.toThrow(/menor/);
    await db.$transaction((tx) => cancelMaintenance(tx, admin.id, m.id, "Capturado en la unidad equivocada"));
    expect((await db.expense.findUniqueOrThrow({ where: { id: m.expenseId! } })).cancelledAt).not.toBeNull();
  });

  it("alertas por kilometraje, fecha y documentos; el mantenimiento más reciente sustituye al anterior; notificaciones sin duplicar", async () => {
    const v = await veh({ initialOdometer: "40000" });
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const minus = (n: number) => iso(new Date(today.getTime() - n * 86400_000));
    const plus = (n: number) => iso(new Date(today.getTime() + n * 86400_000));
    await db.$transaction((tx) => addMaintenance(tx, admin.id, v.id, maintenanceSchema.parse({ type: "CAMBIO_ACEITE", date: minus(200), odometer: "40000", nextOdometer: "40800" })));
    await db.$transaction((tx) => addMaintenance(tx, admin.id, v.id, maintenanceSchema.parse({ type: "AFINACION", date: minus(400), nextDate: minus(5) })));
    await db.$transaction((tx) => addMaintenance(tx, admin.id, v.id, maintenanceSchema.parse({ type: "FRENOS", date: minus(300), nextDate: minus(30) })));
    await db.$transaction((tx) => addMaintenance(tx, admin.id, v.id, maintenanceSchema.parse({ type: "FRENOS", date: minus(10), nextDate: plus(300) }))); // sustituye
    await db.$transaction((tx) => addDocument(tx, admin.id, v.id, documentSchema.parse({ type: "VERIFICACION", expiresAt: plus(10) })));
    await db.$transaction((tx) => addDocument(tx, admin.id, v.id, documentSchema.parse({ type: "SEGURO", expiresAt: plus(200), amount: "15000", paidAt: minus(1), provider: "Aseguradora DEMO" })));
    const alerts = await fleetAlerts(db);
    expect(alerts.map((a) => [a.kind, a.title, a.level]).sort()).toEqual([
      ["DOCUMENTO", "Verificación por vencer", "PROXIMO"],
      ["MANTENIMIENTO", "Afinación vencido", "VENCIDO"],
      ["MANTENIMIENTO", "Cambio de aceite próximo", "PROXIMO"], // 40,000 ≥ 40,800 − 1,000
    ]);
    await syncFleetNotifications(db);
    await syncFleetNotifications(db);
    expect(await db.notification.count({ where: { type: "FLOTILLA" } })).toBe(3);
    const seg = await db.expense.findFirstOrThrow({ where: { vehicleId: v.id, category: { key: "SEGUROS" } } });
    expect(Number(seg.total)).toBe(15000);
    const doc = await db.vehicleDocument.findFirstOrThrow({ where: { type: "SEGURO" } });
    await db.$transaction((tx) => cancelDocument(tx, admin.id, doc.id, "Póliza duplicada"));
    expect((await db.expense.findUniqueOrThrow({ where: { id: seg.id } })).cancelledAt).not.toBeNull();
  });

  it("carga de combustible fuera de servicio: litros en bitácora, importe en gastos, lectura de odómetro", async () => {
    const v = await veh({ initialOdometer: "1000" });
    const f = await db.$transaction((tx) => addFuel(tx, admin.id, v.id, fuelSchema.parse({ date: "2026-10-15T08:00", liters: "60", amount: "1450", odometer: "1200", station: "Gasolinera DEMO" })));
    expect(Number(f.liters)).toBe(60);
    const e = await db.expense.findUniqueOrThrow({ where: { id: f.expenseId! }, include: { category: true } });
    expect([e.category.key, Number(e.total), e.serviceId]).toEqual(["COMBUSTIBLE_UNIDAD", 1450, null]);
    expect((await db.vehicle.findUniqueOrThrow({ where: { id: v.id } })).currentOdometer).toBe(1200);
  });
});
