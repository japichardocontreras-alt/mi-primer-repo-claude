import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { accountsReceivable } from "@/lib/queries/home";
import { nextFolio, FOLIO } from "@/lib/folios";

const db = testDb();
beforeEach(() => truncateData(db));
afterAll(() => db.$disconnect());

async function fixture() {
  const client = await db.client.create({ data: { code: await nextFolio(db, FOLIO.CLIENTE), name: "Cliente DEMO", phone: "722 000 0000", phoneNormalized: "7220000000" } });
  const request = await db.request.create({ data: { folio: await nextFolio(db, FOLIO.SOLICITUD), clientId: client.id, serviceType: "LOCAL" } });
  return { client, request };
}

describe("Integridad de la base de datos", () => {
  it("una solicitud no puede generar dos servicios", async () => {
    const { client, request } = await fixture();
    const base = { clientId: client.id, requestId: request.id, serviceType: "LOCAL" as const, contractedPrice: 4500 };
    await db.service.create({ data: { ...base, folio: "MM-2026-000001" } });
    await expect(db.service.create({ data: { ...base, folio: "MM-2026-000002" } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("los folios son únicos", async () => {
    const { client } = await fixture();
    await expect(db.request.create({ data: { folio: "SOL-2026-000001", clientId: client.id, serviceType: "LOCAL" } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("no permite borrar un cliente con historial (sin borrado en cascada)", async () => {
    const { client } = await fixture();
    await expect(db.client.delete({ where: { id: client.id } })).rejects.toBeTruthy();
    expect(await db.request.count()).toBe(1);
  });

  it("las versiones de cotización, la auditoría y el odómetro son inmutables", async () => {
    const { request } = await fixture();
    const q = await db.quote.create({ data: { requestId: request.id, versionNumber: 1, manualPrice: 4500, finalPrice: 4500 } });
    await expect(db.quote.update({ where: { id: q.id }, data: { manualPrice: 1 } })).rejects.toThrow(/histórica/);
    await expect(db.quote.delete({ where: { id: q.id } })).rejects.toThrow(/histórica/);
    const a = await db.auditLog.create({ data: { action: "PRUEBA", entity: "Test" } });
    await expect(db.auditLog.delete({ where: { id: a.id } })).rejects.toThrow(/histórica/);
    const v = await db.vehicle.create({ data: { code: "T-1", name: "Unidad prueba" } });
    const o = await db.odometerReading.create({ data: { vehicleId: v.id, readingAt: new Date(), odometer: 1000, source: "MANUAL" } });
    await expect(db.odometerReading.update({ where: { id: o.id }, data: { odometer: 5 } })).rejects.toThrow(/histórica/);
  });

  it("rechaza importes inválidos (CHECK)", async () => {
    const { client, request } = await fixture();
    const s = await db.service.create({ data: { folio: "MM-2026-000001", clientId: client.id, requestId: request.id, serviceType: "LOCAL", contractedPrice: 4500 } });
    await expect(db.payment.create({ data: { folio: "COB-1", serviceId: s.id, kind: "ANTICIPO", receivedAt: new Date(), amount: -10, method: "EFECTIVO" } })).rejects.toThrow();
    const cat = await db.expenseCategory.findUniqueOrThrow({ where: { key: "CASETAS" } });
    await expect(db.expense.create({ data: { folio: "GAS-1", categoryId: cat.id, date: new Date(), subtotal: 100, vatAmount: 16, total: 120, description: "x" } })).rejects.toThrow();
    await expect(db.service.update({ where: { id: s.id }, data: { scheduledStart: new Date("2026-10-22T18:00:00Z"), estimatedEnd: new Date("2026-10-22T17:00:00Z") } })).rejects.toThrow();
  });

  it("un gasto recurrente no se duplica en el mismo periodo", async () => {
    const cat = await db.expenseCategory.findUniqueOrThrow({ where: { key: "RENTA" } });
    const r = await db.recurringExpense.create({ data: { categoryId: cat.id, description: "Renta", amount: 8000, startDate: new Date("2026-01-01") } });
    const base = { categoryId: cat.id, date: new Date("2026-10-01"), subtotal: 8000, total: 8000, description: "Renta", recurringId: r.id, recurringPeriod: "2026-10" };
    await db.expense.create({ data: { ...base, folio: "GAS-1" } });
    await expect(db.expense.create({ data: { ...base, folio: "GAS-2" } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("cuentas por cobrar: precio − cobros vigentes, reembolsos restan, cancelados no cuentan", async () => {
    expect(await accountsReceivable(db)).toBe(0);
    const { client, request } = await fixture();
    const s = await db.service.create({ data: { folio: "MM-2026-000001", clientId: client.id, requestId: request.id, serviceType: "LOCAL", contractedPrice: 4500 } });
    expect(await accountsReceivable(db)).toBe(4500);
    await db.payment.create({ data: { folio: "COB-1", serviceId: s.id, kind: "ANTICIPO", receivedAt: new Date(), amount: 2000, method: "TRANSFERENCIA" } });
    expect(await accountsReceivable(db)).toBe(2500);
    await db.payment.create({ data: { folio: "COB-2", serviceId: s.id, kind: "PAGO_FINAL", receivedAt: new Date(), amount: 2500, method: "EFECTIVO", cancelledAt: new Date() } });
    expect(await accountsReceivable(db)).toBe(2500);
    await db.payment.create({ data: { folio: "COB-3", serviceId: s.id, kind: "PAGO_FINAL", receivedAt: new Date(), amount: 2500, method: "EFECTIVO" } });
    expect(await accountsReceivable(db)).toBe(0);
    const c2 = await db.client.create({ data: { code: "CLI-X", name: "Otro", phone: "1", phoneNormalized: "1" } });
    await db.service.create({ data: { folio: "MM-2026-000002", clientId: c2.id, serviceType: "FLETE", contractedPrice: 9999, status: "CANCELADO" } });
    expect(await accountsReceivable(db)).toBe(0);
  });
});
