/**
 * FASE 9 — Prueba integral del flujo obligatorio (sección 19) y escenarios cruzados entre módulos.
 * Recorre el mismo camino que la operación real, con las mismas funciones que usan las pantallas,
 * y al final comprueba que TODOS los módulos (agenda, cobranza, flotilla, nómina, finanzas,
 * resultados y auditoría) reflejan las mismas cifras.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { clientSchema, createClient } from "@/lib/domain/clients";
import { createRequest, parseRequestForm, quoteSchema } from "@/lib/domain/requests";
import { createWorker, workerSchema } from "@/lib/domain/workers";
import {
  changeServiceStatus, confirmRequest, confirmSchema, registerPayment, paymentSchema, scheduleSchema, scheduleService, type Actor,
} from "@/lib/domain/services";
import { closeService, closeSchema, serviceEconomics } from "@/lib/domain/closing";
import { createVehicle, vehicleSchema } from "@/lib/domain/fleet";
import { settlePayroll, workerAccount } from "@/lib/domain/payroll";
import { saveSetting } from "@/lib/settings";
import { periodResults, monthPeriod } from "@/lib/finance/results";
import { commercialStats, monthlySeries, vehicleResults } from "@/lib/finance/dashboard";
import { mexicoParts } from "@/lib/format";

const db = testDb();
let admin: Actor;
let veh: string;
const SEP = monthPeriod(2026, 9);
const pay = (serviceId: string, kind: "ANTICIPO" | "PARCIAL" | "PAGO_FINAL" | "REEMBOLSO", amount: string, at: string) =>
  db.$transaction((tx) => registerPayment(tx, admin.id, serviceId, paymentSchema.parse({ kind, amount, method: "EFECTIVO", receivedAt: at })));
const worker = (fullName: string, position: "CHOFER" | "AYUDANTE") =>
  db.$transaction((tx) => createWorker(tx, admin.id, workerSchema.parse({ fullName, position, payType: "POR_SERVICIO", active: "on" })));

beforeEach(async () => {
  await truncateData(db);
  const role = await db.role.findUniqueOrThrow({ where: { key: "ADMINISTRADOR" } });
  const u = await db.user.create({ data: { email: "admin@test.mx", name: "Admin DEMO", passwordHash: await hashPassword("ClaveDemo2026"), roleId: role.id } });
  admin = { id: u.id, name: u.name, canOverride: true };
  await saveSetting(db, "finanzas", { tasaIva: 0.16, metodoDepreciacion: "LINEAL_TIEMPO", criterioAsignacionFijos: "INGRESOS" });
  veh = (await db.$transaction((tx) => createVehicle(tx, admin.id, vehicleSchema.parse({ code: "F350-T", name: "F350 prueba", initialOdometer: "20000" })))).id;
});
afterAll(() => db.$disconnect());

describe("Flujo completo obligatorio (sección 19)", () => {
  it("cliente → solicitud $4,500 → servicio → anticipo → cierre → nómina → pago final → liquidado → resultados", async () => {
    // 1. Cliente
    const client = await db.$transaction((tx) => createClient(tx, admin.id, clientSchema.parse({ name: "Cliente DEMO Integral", phone: "7221234567" })));
    expect(client.code).toMatch(/^CLI-\d{6}$/);

    // 2. Solicitud con precio manual de $4,500
    const request = await db.$transaction((tx) => createRequest(tx, admin, {
      clientId: client.id,
      request: parseRequestForm({ channel: "WHATSAPP", serviceType: "LOCAL", orig_municipality: "Metepec", dest_municipality: "Toluca" }),
      quote: quoteSchema.parse({ price: "$4,500.00" }),
    }));
    expect(request.folio).toMatch(/^SOL-\d{4}-\d{6}$/);
    const q = await db.quote.findMany({ where: { requestId: request.id } });
    expect(q.map((x) => [x.versionNumber, Number(x.finalPrice)])).toEqual([[1, 4500]]);

    // 3–5. Confirmación → servicio MM, agenda, unidad, chofer y dos ayudantes
    const [chofer, ay1, ay2] = [await worker("Chofer DEMO", "CHOFER"), await worker("Ayudante DEMO 1", "AYUDANTE"), await worker("Ayudante DEMO 2", "AYUDANTE")];
    const svc = await db.$transaction((tx) => confirmRequest(tx, admin, request.id, {
      confirm: confirmSchema.parse({ contractedPrice: "4500" }),
      schedule: scheduleSchema.parse({ date: "2026-09-15", time: "09:00", durationHours: 4, prepMinutes: 30, returnMinutes: 60 }),
      assignment: { vehicleIds: [veh], staff: [{ workerId: chofer.id, role: "CHOFER", agreedPay: 300 }, { workerId: ay1.id, role: "AYUDANTE", agreedPay: 200 }, { workerId: ay2.id, role: "AYUDANTE", agreedPay: 200 }] },
    }));
    expect(svc.folio).toMatch(/^MM-\d{4}-\d{6}$/);
    expect((await db.request.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("CONFIRMADA");
    expect(svc.status).toBe("PROGRAMADO");
    expect(await db.serviceVehicle.count({ where: { serviceId: svc.id } })).toBe(1);
    expect(await db.serviceStaff.count({ where: { serviceId: svc.id } })).toBe(3);

    // 6. Anticipo de $2,000 → cobranza parcial
    await pay(svc.id, "ANTICIPO", "2000", "2026-09-10T12:00");
    let s = await db.service.findUniqueOrThrow({ where: { id: svc.id } });
    expect(s.collectionStatus).toBe("PARCIAL");

    // 7. Arranca y se finaliza con km, gastos y participación del personal (cierre operativo)
    await db.$transaction((tx) => changeServiceStatus(tx, admin.id, svc.id, s.version, "EN_PROCESO"));
    s = await db.service.findUniqueOrThrow({ where: { id: svc.id } });
    const staff = await db.serviceStaff.findMany({ where: { serviceId: svc.id } });
    await db.$transaction((tx) => closeService(tx, admin.id, svc.id, s.version, closeSchema.parse({
      actualStart: "2026-09-15T09:10", actualEnd: "2026-09-15T13:30", extras: [{ description: "Maniobra (DEMO)", amount: 300 }],
      vehicles: [{ vehicleId: veh, odometerStart: 20000, odometerEnd: 20045, fuelLiters: 30, fuelAmount: 700, acceptGap: false }],
      staff: staff.map((x) => ({ serviceStaffId: x.id, participated: true, agreedPay: Number(x.agreedPay) })), tolls: 120, parking: 50, perDiem: 200,
    })));
    s = await db.service.findUniqueOrThrow({ where: { id: svc.id } });
    expect(s.status).toBe("FINALIZADO");
    expect(s.operationalClosedAt).not.toBeNull();
    expect(s.collectionStatus).toBe("PARCIAL"); // el cierre operativo no liquida el cobro
    expect(s.financialClosedAt).toBeNull();

    // 8. Kilometraje registrado en la unidad
    const v = await db.vehicle.findUniqueOrThrow({ where: { id: veh } });
    expect(v.currentOdometer).toBe(20045);
    const readings = await db.odometerReading.findMany({ where: { vehicleId: veh, serviceId: svc.id }, orderBy: { odometer: "asc" } });
    expect(readings.map((r) => r.odometer)).toEqual([20000, 20045]);

    // 9. Gastos del servicio (combustible 700 + casetas 120 + estacionamiento 50 + viáticos 200 + maniobra 300)
    const eco = await serviceEconomics(db, svc.id);
    expect(eco.direct).toBe(1370);
    expect(eco.labor).toBe(700);
    expect(eco.km).toBe(45);

    // 10. Pagos a trabajadores: devengado → pagado, saldo en cero
    for (const [w, monto] of [[chofer.id, 300], [ay1.id, 200], [ay2.id, 200]] as const) {
      const acc = await workerAccount(db, w);
      expect(acc.totals.porPagar).toBe(monto);
      await db.$transaction((tx) => settlePayroll(tx, admin.id, w, { paidAt: "2026-09-20T18:00", method: "EFECTIVO", entryIds: acc.entries.map((e) => e.id), advanceIds: [] }));
      expect((await workerAccount(db, w)).totals.porPagar).toBe(0);
    }

    // 11–12. Pago final $2,500 → liquidado (cierre financiero separado del operativo)
    await pay(svc.id, "PAGO_FINAL", "2500", "2026-09-15T14:00");
    s = await db.service.findUniqueOrThrow({ where: { id: svc.id } });
    expect(s.collectionStatus).toBe("LIQUIDADO");
    expect(s.financialClosedAt).not.toBeNull();
    await expect(pay(svc.id, "PARCIAL", "1", "2026-09-16T10:00")).rejects.toThrow(/excede el saldo/);

    // 13. Resultados actualizados — finanzas, dashboard y unidad cuadran entre sí
    const r = await periodResults(db, SEP);
    expect(r.ventas).toMatchObject({ pactadas: 4500, netas: 4500, servicios: 1 });
    expect(r.cobranza).toMatchObject({ cobrado: 4500, neto: 4500, cuentasPorCobrar: 0 });
    expect(r.gastos.directos).toBe(1370);
    expect(r.nomina).toMatchObject({ devengada: 700, servicios: 700, pagada: 700 });
    expect(r.resultadoOperativo).toBe(4500 - 1370 - 700); // sin fijos ni depreciación (unidad sin valor de compra)
    expect(r.flujo.neto).toBe(4500 - 1370 - 700);

    const byVeh = await vehicleResults(db, SEP, r);
    const row = byVeh.rows.find((x) => x.id === veh)!;
    expect(row).toMatchObject({ ingresos: 4500, km: 45, servicios: 1, gastosDirectos: 1370, nomina: 700, utilidad: 2430 });

    const serie = await monthlySeries(db, 2026, 9);
    expect(serie[8]).toMatchObject({ ventas: 4500, cobrado: 4500, utilidad: 2430, servicios: 1 });

    const now = mexicoParts();
    const c = await commercialStats(db, monthPeriod(now.year, now.month));
    expect(c).toMatchObject({ recibidas: 1, cotizadas: 1, confirmadas: 1, conversion: 1 });

    // Auditoría: cada paso quedó registrado con su usuario
    const logs = await db.auditLog.findMany({ where: { userId: admin.id } });
    const actions = new Set(logs.map((l) => `${l.entity}:${l.action}`));
    for (const k of ["Servicio:COBRO", "Servicio:CAMBIO_ESTADO"]) expect(actions).toContain(k);
    expect(logs.some((l) => l.entity === "Solicitud")).toBe(true);
    expect(logs.some((l) => /CIERRE/.test(l.action))).toBe(true);
    expect(logs.some((l) => l.entity === "Nómina" || /PAGO|NOMINA/.test(l.action))).toBe(true);
  });
});

describe("Escenarios cruzados", () => {
  async function scheduled(price = "4500", date = "2026-09-15") {
    const r = await db.$transaction((tx) => createRequest(tx, admin, {
      newClient: clientSchema.parse({ name: "Cliente DEMO", phone: `722${Math.floor(1e6 + Math.random() * 8e6)}` }), allowDuplicatePhone: true,
      request: parseRequestForm({ channel: "WHATSAPP", serviceType: "LOCAL" }), quote: quoteSchema.parse({ price }),
    }));
    return db.$transaction((tx) => confirmRequest(tx, admin, r.id, {
      confirm: confirmSchema.parse({ contractedPrice: price }),
      schedule: scheduleSchema.parse({ date, time: "09:00", durationHours: 4, prepMinutes: 0, returnMinutes: 0 }),
      assignment: { vehicleIds: [veh], staff: [] },
    }));
  }

  it("servicio cancelado con anticipo: no es venta, no es cuenta por cobrar; lo retenido es ingreso y el reembolso lo revierte", async () => {
    const s = await scheduled();
    await pay(s.id, "ANTICIPO", "2000", "2026-09-10T12:00");
    const cur = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    await db.$transaction((tx) => changeServiceStatus(tx, admin.id, s.id, cur.version, "CANCELADO", "Cliente canceló (DEMO)"));
    await db.service.update({ where: { id: s.id }, data: { cancelledAt: new Date("2026-09-12T18:00:00Z") } }); // fecha controlada para la prueba

    let r = await periodResults(db, SEP);
    expect(r.ventas.netas).toBe(0);
    expect(r.cobranza.cuentasPorCobrar).toBe(0);
    expect(r.cobranza.neto).toBe(2000);
    expect(r.otros.anticiposRetenidos).toBe(2000);
    expect(r.utilidad).toBe(2000);
    await expect(pay(s.id, "PARCIAL", "100", "2026-09-13T10:00")).rejects.toThrow(/cancelado/);

    // Se devuelve la mitad: se registra como reembolso
    await pay(s.id, "REEMBOLSO", "1000", "2026-09-14T10:00");
    r = await periodResults(db, SEP);
    expect(r.cobranza.neto).toBe(1000);
    expect(r.otros.anticiposRetenidos).toBe(1000);
    // la unidad queda libre para otro servicio en el mismo horario
    await expect(scheduled("3000")).resolves.toBeTruthy();
  });

  it("reprogramar a otro mes mueve la venta de periodo, conserva los cobros y revalida empalmes", async () => {
    const s = await scheduled();
    await pay(s.id, "ANTICIPO", "2000", "2026-09-10T12:00");
    const other = await scheduled("3000", "2026-10-05");
    const cur = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    const move = (version: number, date: string) => db.$transaction((tx) => scheduleService(tx, admin, s.id, {
      version, schedule: scheduleSchema.parse({ date, time: "09:00", durationHours: 4, prepMinutes: 0, returnMinutes: 0 }),
      assignment: { vehicleIds: [veh], staff: [] }, reason: "Cliente pidió cambio (DEMO)",
    }));
    await expect(move(cur.version, "2026-10-05")).rejects.toThrow(/empalmes/);
    await move(cur.version, "2026-10-06");
    expect((await periodResults(db, SEP)).ventas.netas).toBe(0);
    const oct = await periodResults(db, monthPeriod(2026, 10));
    expect(oct.ventas.netas).toBe(7500);
    expect(oct.cobranza.cuentasPorCobrar).toBe(2500 + 3000);
    expect((await db.payment.count({ where: { serviceId: s.id, cancelledAt: null } }))).toBe(1);
    expect(await db.serviceReschedule.count({ where: { serviceId: s.id } })).toBe(1);
    expect(other.folio).not.toBe(s.folio);
  });

  it("pagos simultáneos: dos usuarios cobrando el saldo a la vez no generan sobrepago", async () => {
    const s = await scheduled();
    await pay(s.id, "ANTICIPO", "2000", "2026-09-10T12:00");
    const res = await Promise.allSettled([pay(s.id, "PAGO_FINAL", "2500", "2026-09-15T14:00"), pay(s.id, "PAGO_FINAL", "2500", "2026-09-15T14:01")]);
    expect(res.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const totals = await db.payment.aggregate({ where: { serviceId: s.id, cancelledAt: null }, _sum: { amount: true } });
    expect(Number(totals._sum.amount)).toBe(4500);
    expect((await db.service.findUniqueOrThrow({ where: { id: s.id } })).collectionStatus).toBe("LIQUIDADO");
  });

  it("pagos parciales en varios meses: cuentas por cobrar al cierre de cada mes", async () => {
    const s = await scheduled();
    await pay(s.id, "ANTICIPO", "1000", "2026-09-01T12:00");
    await pay(s.id, "PARCIAL", "1500", "2026-09-20T12:00");
    await pay(s.id, "PAGO_FINAL", "2000", "2026-10-03T12:00");
    const sep = await periodResults(db, SEP);
    const oct = await periodResults(db, monthPeriod(2026, 10));
    expect([sep.cobranza.neto, sep.cobranza.cuentasPorCobrar]).toEqual([2500, 2000]);
    expect([oct.cobranza.neto, oct.cobranza.cuentasPorCobrar, oct.ventas.netas]).toEqual([2000, 0, 0]);
  });
});
