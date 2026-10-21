import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { clientSchema } from "@/lib/domain/clients";
import { createRequest, parseRequestForm, quoteSchema } from "@/lib/domain/requests";
import { createWorker, workerSchema } from "@/lib/domain/workers";
import {
  confirmRequest, scheduleService, changeServiceStatus, registerPayment, cancelPayment, paymentTotals, ConflictError,
  confirmSchema, scheduleSchema, paymentSchema, type Actor, type AssignmentInput,
} from "@/lib/domain/services";
import { BusinessError } from "@/lib/errors";

const db = testDb();
let admin: Actor, staffUser: Actor;
let v1: string, v2: string, chofer: string, ay1: string, ay2: string, ay3: string;

const form = { channel: "WHATSAPP", serviceType: "LOCAL", orig_municipality: "Metepec", dest_municipality: "Toluca", inventorySummary: "Sala y 10 cajas (DEMO)" };
const sched = (date: string, time: string, durationHours = 4, prepMinutes = 30, returnMinutes = 60) => scheduleSchema.parse({ date, time, durationHours, prepMinutes, returnMinutes });
const crew = (vehicle: string, ...people: [string, "CHOFER" | "AYUDANTE", number?][]): AssignmentInput => ({
  vehicleIds: [vehicle], staff: people.map(([workerId, role, pay]) => ({ workerId, role, agreedPay: pay ?? 0 })),
});

async function newRequest(price = "4500", phone?: string) {
  return db.$transaction((tx) => createRequest(tx, admin, {
    newClient: clientSchema.parse({ name: "Cliente DEMO Agenda", phone: phone ?? `722${Math.floor(1e6 + Math.random() * 8e6)}` }),
    allowDuplicatePhone: true, request: parseRequestForm(form), quote: quoteSchema.parse({ price }),
  }));
}
async function confirm(requestId: string, schedule?: ReturnType<typeof sched>, assignment: AssignmentInput = { vehicleIds: [], staff: [] }, actor = admin, override?: { authorize: boolean; overrideReason?: string }) {
  return db.$transaction((tx) => confirmRequest(tx, actor, requestId, { confirm: confirmSchema.parse({ contractedPrice: "4500" }), schedule, assignment, override }));
}

beforeEach(async () => {
  await truncateData(db);
  const [ra, rs] = await Promise.all([db.role.findUniqueOrThrow({ where: { key: "ADMINISTRADOR" } }), db.role.findUniqueOrThrow({ where: { key: "ADMINISTRATIVO" } })]);
  const pw = await hashPassword("ClaveDemo2026");
  const a = await db.user.create({ data: { email: "admin@test.mx", name: "Admin DEMO", passwordHash: pw, roleId: ra.id } });
  const s = await db.user.create({ data: { email: "staff@test.mx", name: "Staff DEMO", passwordHash: pw, roleId: rs.id } });
  admin = { id: a.id, name: a.name, canOverride: true };
  staffUser = { id: s.id, name: s.name, canOverride: false };
  v1 = (await db.vehicle.create({ data: { code: "T-F350-1", name: "F350 #1 (prueba)" } })).id;
  v2 = (await db.vehicle.create({ data: { code: "T-F350-2", name: "F350 #2 (prueba)" } })).id;
  const w = (name: string, position: "CHOFER" | "AYUDANTE") => db.$transaction((tx) => createWorker(tx, admin.id, workerSchema.parse({ fullName: name, position, payType: "POR_SERVICIO", active: "on" })));
  chofer = (await w("Chofer DEMO 1", "CHOFER")).id;
  ay1 = (await w("Ayudante DEMO 1", "AYUDANTE")).id;
  ay2 = (await w("Ayudante DEMO 2", "AYUDANTE")).id;
  ay3 = (await w("Ayudante DEMO 3", "AYUDANTE")).id;
});
afterAll(() => db.$disconnect());

describe("Confirmación de solicitudes", () => {
  it("genera el servicio MM, lo vincula a la solicitud y a sus direcciones sin copiarlas", async () => {
    const r = await newRequest();
    const s = await confirm(r.id, sched("2026-11-10", "09:00"), crew(v1, [chofer, "CHOFER", 300], [ay1, "AYUDANTE", 200], [ay2, "AYUDANTE", 200]));
    expect(s.folio).toMatch(/^MM-2026-000001$/);
    expect(s.status).toBe("PROGRAMADO");
    expect(s.scheduledStart?.toISOString()).toBe("2026-11-10T15:00:00.000Z"); // 09:00 hora de México
    expect(s.estimatedEnd?.toISOString()).toBe("2026-11-10T19:00:00.000Z");
    const full = await db.service.findUniqueOrThrow({ where: { id: s.id }, include: { staff: true, vehicles: true, request: true } });
    expect(full.request!.status).toBe("CONFIRMADA");
    expect(full.request!.folio).toBe(r.folio); // el folio de la solicitud no cambia
    expect(full.originAddressId).toBe(r.originAddressId);
    expect(full.vehicles.map((v) => v.vehicleId)).toEqual([v1]);
    expect(full.staff).toHaveLength(3);
    expect(full.staff.reduce((a, x) => a + Number(x.agreedPay), 0)).toBe(700);
    expect(await db.requestEvent.count({ where: { requestId: r.id, type: "CONVERSION" } })).toBe(1);
  });

  it("no permite convertir dos veces la misma solicitud (ni con dos usuarios a la vez)", async () => {
    const r = await newRequest();
    const results = await Promise.allSettled([confirm(r.id), confirm(r.id), confirm(r.id)]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.service.count({ where: { requestId: r.id } })).toBe(1);
    await expect(confirm(r.id)).rejects.toThrow(/ya fue convertida/);
  });

  it("sin fecha queda «Por programar»; no se puede asignar sin fecha", async () => {
    const r = await newRequest();
    await expect(confirm(r.id, undefined, crew(v1))).rejects.toThrow(/indique primero la fecha/);
    const s = await confirm(r.id);
    expect(s.status).toBe("POR_PROGRAMAR");
  });
});

describe("Empalmes de unidades y personal", () => {
  it("bloquea la misma unidad en horarios que se empalman y permite el mismo día si hay disponibilidad", async () => {
    // A: 09:00–13:00, ocupado 08:30–14:00 (preparación 30 min + regreso 60 min)
    await confirm((await newRequest()).id, sched("2026-11-10", "09:00", 4), crew(v1));
    const b = await newRequest();
    await expect(confirm(b.id, sched("2026-11-10", "14:00", 3), crew(v1))).rejects.toBeInstanceOf(ConflictError); // ocupado desde 13:30
    const ok = await confirm(b.id, sched("2026-11-10", "14:30", 3), crew(v1)); // ocupado desde 14:00 = libre
    expect(ok.status).toBe("PROGRAMADO");
    const c = await newRequest();
    expect((await confirm(c.id, sched("2026-11-10", "10:00", 2), crew(v2))).status).toBe("PROGRAMADO"); // otra unidad sí
  });

  it("detecta doble asignación de personal aunque la unidad sea distinta", async () => {
    await confirm((await newRequest()).id, sched("2026-11-10", "09:00", 4), crew(v1, [chofer, "CHOFER"], [ay1, "AYUDANTE"]));
    const b = await newRequest();
    const err = await confirm(b.id, sched("2026-11-10", "11:00", 2), crew(v2, [ay1, "AYUDANTE"], [ay3, "AYUDANTE"])).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).conflicts.map((c) => [c.type, c.resourceName])).toEqual([["PERSONAL", "Ayudante DEMO 1"]]);
  });

  it("servicios que cruzan medianoche y de varios días", async () => {
    // Foráneo: 10-nov 20:00 por 8 h → termina 11-nov 04:00; ocupado hasta 05:00
    await confirm((await newRequest()).id, sched("2026-11-10", "20:00", 8), crew(v1, [chofer, "CHOFER"]));
    const b = await newRequest();
    await expect(confirm(b.id, sched("2026-11-11", "05:00", 2), crew(v1))).rejects.toBeInstanceOf(ConflictError); // ocupado desde 04:30
    await expect(confirm(b.id, sched("2026-11-11", "08:00", 2), crew(v2, [chofer, "CHOFER"]))).resolves.toBeTruthy();
    // Viaje de 30 h: bloquea la unidad el día siguiente completo
    await confirm((await newRequest()).id, sched("2026-11-20", "06:00", 30), crew(v2));
    await expect(confirm((await newRequest()).id, sched("2026-11-21", "09:00", 2), crew(v2))).rejects.toBeInstanceOf(ConflictError);
  });

  it("los servicios cancelados liberan la unidad", async () => {
    const a = await confirm((await newRequest()).id, sched("2026-11-10", "09:00"), crew(v1));
    await db.$transaction((tx) => changeServiceStatus(tx, admin.id, a.id, a.version, "CANCELADO", "El cliente pospuso (DEMO)"));
    await expect(confirm((await newRequest()).id, sched("2026-11-10", "09:00"), crew(v1))).resolves.toBeTruthy();
  });

  it("autorización excepcional: solo administrador, con motivo, y queda en auditoría", async () => {
    const a = await confirm((await newRequest()).id, sched("2026-11-10", "09:00"), crew(v1));
    const b = await newRequest();
    await expect(confirm(b.id, sched("2026-11-10", "10:00"), crew(v1), staffUser, { authorize: true, overrideReason: "Urgente" })).rejects.toThrow(/Solicite la autorización a un administrador/);
    await expect(confirm(b.id, sched("2026-11-10", "10:00"), crew(v1), admin, { authorize: true })).rejects.toThrow(/indique el motivo/);
    const s = await confirm(b.id, sched("2026-11-10", "10:00"), crew(v1), admin, { authorize: true, overrideReason: "Mudanza pequeña, se atiende en el mismo viaje" });
    const o = await db.conflictOverride.findFirstOrThrow({ where: { serviceId: s.id } });
    expect(o).toMatchObject({ type: "UNIDAD", resourceId: v1, conflictingServiceId: a.id, authorizedById: admin.id });
    expect(await db.auditLog.count({ where: { action: "OVERRIDE_EMPALME", entityId: s.id } })).toBe(1);
  });

  it("dos usuarios asignando la misma unidad al mismo tiempo: solo uno lo logra", async () => {
    const ss = await Promise.all([confirm((await newRequest()).id), confirm((await newRequest()).id), confirm((await newRequest()).id)]);
    const results = await Promise.allSettled(ss.map((s) => db.$transaction((tx) => scheduleService(tx, admin, s.id, { version: s.version, schedule: sched("2026-11-12", "09:00"), assignment: crew(v1) }))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected" && r.reason instanceof ConflictError)).toHaveLength(2);
  });
});

describe("Reprogramaciones, estados y cobros", () => {
  it("reprogramar conserva folio, cobros e historial (antes/después)", async () => {
    const s = await confirm((await newRequest()).id, sched("2026-11-10", "09:00"), crew(v1, [chofer, "CHOFER", 300]));
    await db.$transaction((tx) => registerPayment(tx, admin.id, s.id, paymentSchema.parse({ kind: "ANTICIPO", amount: "2000", method: "TRANSFERENCIA", receivedAt: "2026-10-22T12:00" })));
    const cur = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    const res = await db.$transaction((tx) => scheduleService(tx, admin, s.id, { version: cur.version, schedule: sched("2026-11-12", "08:00", 5), assignment: crew(v2, [chofer, "CHOFER", 300], [ay1, "AYUDANTE", 200]), reason: "Cliente cambió de fecha" }));
    expect(res.changed).toBe(true);
    const after = await db.service.findUniqueOrThrow({ where: { id: s.id }, include: { reschedules: true, vehicles: true, staff: true } });
    expect(after.folio).toBe(s.folio);
    expect(after.scheduledStart?.toISOString()).toBe("2026-11-12T14:00:00.000Z");
    expect(after.vehicles.map((v) => v.vehicleId)).toEqual([v2]);
    expect(after.staff).toHaveLength(2);
    expect(after.reschedules).toHaveLength(1);
    expect(after.reschedules[0].reason).toBe("Cliente cambió de fecha");
    expect((after.reschedules[0].before as { inicio: string }).inicio).toBe("2026-11-10T15:00:00.000Z");
    expect(await db.service.count()).toBe(1); // no se creó un servicio nuevo
    expect((await paymentTotals(db, s.id)).anticipos).toBe(2000);
    // versión vieja → rechazo
    await expect(db.$transaction((tx) => scheduleService(tx, admin, s.id, { version: cur.version, schedule: sched("2026-11-13", "08:00"), assignment: crew(v2) }))).rejects.toThrow(/Otro usuario/);
  });

  it("transiciones de estado válidas, motivo obligatorio al cancelar", async () => {
    const s = await confirm((await newRequest()).id, sched("2026-11-10", "09:00"), crew(v1));
    await expect(db.$transaction((tx) => changeServiceStatus(tx, admin.id, s.id, s.version, "FINALIZADO"))).rejects.toBeInstanceOf(BusinessError);
    await expect(db.$transaction((tx) => changeServiceStatus(tx, admin.id, s.id, s.version, "CANCELADO"))).rejects.toThrow(/motivo/);
    await db.$transaction((tx) => changeServiceStatus(tx, admin.id, s.id, s.version, "CONFIRMADO"));
    const c = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    await db.$transaction((tx) => changeServiceStatus(tx, admin.id, s.id, c.version, "EN_PROCESO"));
    const e = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    expect(e.status).toBe("EN_PROCESO");
    expect(e.actualStart).not.toBeNull();
  });

  it("cobros: anticipo $2,000 → parcial; pago final $2,500 → liquidado; sin sobrepagos; cancelar revierte", async () => {
    const s = await confirm((await newRequest()).id, sched("2026-11-10", "09:00"));
    const pay = (kind: string, amount: string) => db.$transaction((tx) => registerPayment(tx, admin.id, s.id, paymentSchema.parse({ kind, amount, method: "EFECTIVO", receivedAt: "2026-11-10T18:00" })));
    const a = await pay("ANTICIPO", "2000");
    expect(a.folio).toMatch(/^COB-2026-\d{6}$/);
    expect((await db.service.findUniqueOrThrow({ where: { id: s.id } })).collectionStatus).toBe("PARCIAL");
    await expect(pay("PAGO_FINAL", "2600")).rejects.toThrow(/excede el saldo/);
    const f = await pay("PAGO_FINAL", "2500");
    let svc = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    expect(svc.collectionStatus).toBe("LIQUIDADO");
    expect(svc.financialClosedAt).not.toBeNull();
    expect(await paymentTotals(db, s.id)).toEqual({ anticipos: 2000, cobrado: 4500 });
    await db.$transaction((tx) => cancelPayment(tx, admin.id, f.id, "Transferencia rechazada (DEMO)"));
    svc = await db.service.findUniqueOrThrow({ where: { id: s.id } });
    expect(svc.collectionStatus).toBe("PARCIAL");
    expect(await db.payment.count({ where: { serviceId: s.id } })).toBe(2); // el cobro cancelado se conserva
  });
});
