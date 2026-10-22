import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword } from "@/lib/auth/password";
import { createClient, deleteClient, updateClient, DuplicatePhoneError, clientSchema } from "@/lib/domain/clients";
import { addFollowUp, addQuote, createRequest, followUpSchema, parseRequestForm, quoteSchema, updateRequest, requestWhere } from "@/lib/domain/requests";
import { BusinessError } from "@/lib/errors";

const db = testDb();
let actor: { id: string; name: string };

const baseForm = {
  channel: "WHATSAPP", serviceType: "LOCAL", tentativeDate: "2026-11-05", tentativeTime: "09:00", package: "ESTANDAR",
  orig_street: "Av. Tecnológico", orig_extNumber: "100", orig_municipality: "Metepec", orig_state: "Estado de México", orig_postalCode: "52140", orig_floor: "2", orig_hasElevator: "no",
  dest_municipality: "Toluca", dest_state: "Estado de México",
  inventorySummary: "Sala, comedor, 15 cajas (DEMO)", needsPacking: "on", estimatedKm: "18",
};
const newClient = (phone = "722 111 2233", name = "Cliente DEMO Pruebas") => clientSchema.parse({ name, phone, channel: "WHATSAPP" });

async function reset() {
  await truncateData(db);
  const role = await db.role.findUniqueOrThrow({ where: { key: "ADMINISTRATIVO" } });
  const u = await db.user.create({ data: { email: "demo@test.mx", name: "Usuaria DEMO", passwordHash: await hashPassword("ClaveDemo2026"), roleId: role.id } });
  actor = { id: u.id, name: u.name };
}

beforeAll(reset);
beforeEach(reset);
afterAll(() => db.$disconnect());

describe("Validación de formularios", () => {
  it("convierte el formulario a datos tipados (direcciones, números, casillas)", () => {
    const r = parseRequestForm(baseForm);
    expect(r.origin.floor).toBe(2);
    expect(r.origin.hasElevator).toBe(false);
    expect(r.needsPacking).toBe(true);
    expect(r.estimatedKm).toBe(18);
    expect(r.tentativeDate?.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(r.destination.street).toBeUndefined();
  });
  it("rechaza datos inválidos con mensajes claros", () => {
    const bad = requestSchemaErrors({ ...baseForm, serviceType: "", orig_postalCode: "521", tentativeTime: "25:00" });
    expect(bad).toMatchObject({ serviceType: "Seleccione el tipo de servicio.", "origin.postalCode": "El C.P. debe tener 5 dígitos.", tentativeTime: "Hora no válida (HH:mm)." });
  });
  it("precio: acepta formato $4,500.00 y rechaza negativos o más de 2 decimales", () => {
    expect(quoteSchema.parse({ price: "$4,500.00" }).price).toBe(4500);
    expect(() => quoteSchema.parse({ price: "-1" })).toThrow();
    expect(() => quoteSchema.parse({ price: "10.555" })).toThrow();
    expect(() => quoteSchema.parse({})).toThrow(/precio cotizado/);
  });
  it("seguimiento: exige motivo al marcar no concretada o cancelada", () => {
    expect(() => followUpSchema.parse({ newStatus: "NO_CONCRETADA" })).toThrow(/motivo/);
    expect(() => followUpSchema.parse({ newStatus: "CANCELADA" })).toThrow(/motivo/);
    expect(() => followUpSchema.parse({})).toThrow();
  });
});

function requestSchemaErrors(form: Record<string, string>) {
  try { parseRequestForm(form); return {}; } catch (e) {
    return Object.fromEntries((e as { issues: { path: (string | number)[]; message: string }[] }).issues.map((i) => [i.path.join("."), i.message]));
  }
}

describe("Clientes", () => {
  it("asigna código CLI y detecta teléfonos duplicados (con o sin lada +52)", async () => {
    const c = await db.$transaction((tx) => createClient(tx, actor.id, newClient("722 111 2233")));
    expect(c.code).toBe("CLI-000001");
    expect(c.phoneNormalized).toBe("7221112233");
    await expect(db.$transaction((tx) => createClient(tx, actor.id, newClient("+52 (722) 111-2233", "Otro")))).rejects.toBeInstanceOf(DuplicatePhoneError);
    const dup = await db.$transaction((tx) => createClient(tx, actor.id, newClient("722 111 2233", "Otro"), { allowDuplicatePhone: true }));
    expect(dup.code).toBe("CLI-000002");
  });
  it("control de concurrencia: la segunda edición con versión vieja se rechaza", async () => {
    const c = await db.$transaction((tx) => createClient(tx, actor.id, newClient()));
    await db.$transaction((tx) => updateClient(tx, actor.id, c.id, 1, { ...newClient(), name: "Usuario A" }));
    await expect(db.$transaction((tx) => updateClient(tx, actor.id, c.id, 1, { ...newClient(), name: "Usuario B" }))).rejects.toThrow(/Otro usuario/);
    expect((await db.client.findUniqueOrThrow({ where: { id: c.id } })).name).toBe("Usuario A");
  });
  it("solo elimina clientes sin historial", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(baseForm) }));
    await expect(db.$transaction((tx) => deleteClient(tx, actor.id, r.clientId))).rejects.toThrow(/desactivarlo/);
    const sinHist = await db.$transaction((tx) => createClient(tx, actor.id, newClient("5512345678", "Sin historial")));
    await db.$transaction((tx) => deleteClient(tx, actor.id, sinHist.id));
    expect(await db.client.count({ where: { id: sinHist.id } })).toBe(0);
  });
});

describe("Solicitudes y cotizaciones", () => {
  it("flujo: registrar con cliente nuevo y precio $4,500 → folio, cotización v1, historial, notificación", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(baseForm), quote: quoteSchema.parse({ price: "4500", validUntil: "2026-11-01" }) }));
    expect(r.folio).toMatch(/^SOL-\d{4}-000001$/);
    expect(r.status).toBe("COTIZACION_ENVIADA");
    const full = await db.request.findUniqueOrThrow({ where: { id: r.id }, include: { currentQuote: true, originAddress: true, destinationAddress: true, events: true, client: true } });
    expect(Number(full.currentQuote!.finalPrice)).toBe(4500);
    expect(full.currentQuote!.versionNumber).toBe(1);
    expect(full.currentQuote!.calculatedPrice).toBeNull(); // cotizador manual: campo reservado
    expect(full.currentQuote!.calculatorVer).toBe("manual-1");
    expect(full.originAddress!.municipality).toBe("Metepec");
    expect(full.originAddress!.clientId).toBe(full.clientId);
    expect(full.destinationAddress!.municipality).toBe("Toluca");
    expect(full.events.map((e) => e.type).sort()).toEqual(["COTIZACION", "CREADA"]);
    expect(await db.notification.count()).toBe(1);
    expect(await db.auditLog.count({ where: { entity: "Solicitud", entityId: r.id } })).toBe(2);
  });

  it("sin precio queda como Nueva solicitud y no crea dirección vacía", async () => {
    const form = { ...baseForm } as Record<string, string>;
    for (const k of Object.keys(form)) if (k.startsWith("dest_")) delete form[k];
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(form) }));
    expect(r.status).toBe("NUEVA");
    expect(r.destinationAddressId).toBeNull();
    expect(r.currentQuoteId).toBeNull();
  });

  it("cambiar el precio crea una nueva versión y conserva la original", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(baseForm), quote: quoteSchema.parse({ price: "4500" }) }));
    await db.$transaction((tx) => addQuote(tx, actor.id, r.id, quoteSchema.parse({ price: "4200", notes: "Descuento por pago anticipado" })));
    const quotes = await db.quote.findMany({ where: { requestId: r.id }, orderBy: { versionNumber: "asc" } });
    expect(quotes.map((q) => [q.versionNumber, Number(q.finalPrice)])).toEqual([[1, 4500], [2, 4200]]);
    const cur = await db.request.findUniqueOrThrow({ where: { id: r.id } });
    expect(cur.currentQuoteId).toBe(quotes[1].id);
    const ev = await db.requestEvent.findFirstOrThrow({ where: { requestId: r.id, type: "COTIZACION", data: { path: ["version"], equals: 2 } } });
    expect(ev.data).toMatchObject({ precio: 4200, precioAnterior: 4500 });
  });

  it("dos usuarios recotizando al mismo tiempo obtienen versiones distintas", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(baseForm) }));
    await Promise.all([1, 2, 3, 4, 5].map((i) => db.$transaction((tx) => addQuote(tx, actor.id, r.id, quoteSchema.parse({ price: String(4000 + i) })))));
    const versions = (await db.quote.findMany({ where: { requestId: r.id } })).map((q) => q.versionNumber).sort();
    expect(versions).toEqual([1, 2, 3, 4, 5]);
  });

  it("20 solicitudes simultáneas reciben folios únicos y consecutivos", async () => {
    const c = await db.$transaction((tx) => createClient(tx, actor.id, newClient()));
    const rs = await Promise.all(Array.from({ length: 20 }, () => db.$transaction((tx) => createRequest(tx, actor, { clientId: c.id, request: parseRequestForm(baseForm) }))));
    const nums = rs.map((r) => Number(r.folio.split("-")[2])).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("seguimiento: contacto, próxima fecha y solicitud no concretada que permanece en el historial", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(baseForm), quote: quoteSchema.parse({ price: "4500" }) }));
    await db.$transaction((tx) => addFollowUp(tx, actor.id, r.id, followUpSchema.parse({ contactAt: "2026-10-22T10:00", channel: "WHATSAPP", notes: "Lo consulta con su familia", nextContactAt: "2026-10-24T11:00", newStatus: "PENDIENTE_CONFIRMACION" })));
    let cur = await db.request.findUniqueOrThrow({ where: { id: r.id } });
    expect(cur.status).toBe("PENDIENTE_CONFIRMACION");
    expect(cur.lastContactAt?.toISOString()).toBe("2026-10-22T16:00:00.000Z");
    expect(cur.nextContactAt?.toISOString()).toBe("2026-10-24T17:00:00.000Z");
    expect(await db.request.count({ where: requestWhere({ view: "vencidas" }, new Date("2026-10-25T00:00:00Z")) })).toBe(1);

    await db.$transaction((tx) => addFollowUp(tx, actor.id, r.id, followUpSchema.parse({ newStatus: "NO_CONCRETADA", lostReason: "Eligió otra empresa por precio" })));
    cur = await db.request.findUniqueOrThrow({ where: { id: r.id } });
    expect(cur.status).toBe("NO_CONCRETADA");
    expect(cur.lostReason).toBe("Eligió otra empresa por precio");
    expect(cur.nextContactAt).toBeNull();
    expect(await db.request.count()).toBe(1); // no se elimina
    expect(await db.request.count({ where: requestWhere({ view: "seguimiento" }) })).toBe(0);
    expect(await db.request.count({ where: requestWhere({ view: "todas" }) })).toBe(1);

    // No se puede recotizar sin reabrir; al reabrir se limpia el motivo.
    await expect(db.$transaction((tx) => addQuote(tx, actor.id, r.id, quoteSchema.parse({ price: "4000" })))).rejects.toThrow(/Reábrala/);
    await db.$transaction((tx) => addFollowUp(tx, actor.id, r.id, followUpSchema.parse({ notes: "El cliente regresó", newStatus: "PENDIENTE_CONFIRMACION" })));
    cur = await db.request.findUniqueOrThrow({ where: { id: r.id } });
    expect(cur.status).toBe("PENDIENTE_CONFIRMACION");
    expect(cur.lostReason).toBeNull();
    const types = (await db.requestEvent.findMany({ where: { requestId: r.id } })).map((e) => e.type);
    expect(types.filter((t) => t === "CAMBIO_ESTADO")).toHaveLength(3);
  });

  it("la confirmación manual se bloquea (se hará al convertir en servicio)", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(baseForm) }));
    await expect(db.$transaction((tx) => addFollowUp(tx, actor.id, r.id, followUpSchema.parse({ newStatus: "CONFIRMADA" })))).rejects.toBeInstanceOf(BusinessError);
  });

  it("edición: guarda solo diferencias, conserva el folio y rechaza versiones viejas", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient(), request: parseRequestForm(baseForm) }));
    const n = await db.$transaction((tx) => updateRequest(tx, actor.id, r.id, r.version, parseRequestForm({ ...baseForm, tentativeTime: "11:30", dest_street: "Hidalgo", dest_extNumber: "5" })));
    expect(n).toBe(2); // hora + dirección de descarga
    const cur = await db.request.findUniqueOrThrow({ where: { id: r.id }, include: { destinationAddress: true } });
    expect(cur.folio).toBe(r.folio);
    expect(cur.tentativeTime).toBe("11:30");
    expect(cur.destinationAddress?.street).toBe("Hidalgo");
    const ev = await db.requestEvent.findFirstOrThrow({ where: { requestId: r.id, type: "EDICION" } });
    expect(ev.data).toMatchObject({ tentativeTime: { antes: "09:00", despues: "11:30" } });
    await expect(db.$transaction((tx) => updateRequest(tx, actor.id, r.id, r.version, parseRequestForm(baseForm)))).rejects.toThrow(/Otro usuario/);
    expect(await db.$transaction((tx) => updateRequest(tx, actor.id, r.id, cur.version, parseRequestForm({ ...baseForm, tentativeTime: "11:30", dest_street: "Hidalgo", dest_extNumber: "5" })))).toBe(0);
  });

  it("búsqueda por folio, nombre, teléfono y municipio", async () => {
    const r = await db.$transaction((tx) => createRequest(tx, actor, { newClient: newClient("7229998877", "María López DEMO"), request: parseRequestForm(baseForm) }));
    for (const q of [r.folio, "maría lópez", "9998877", "metepec"]) {
      expect(await db.request.count({ where: requestWhere({ q }) }), q).toBe(1);
    }
    expect(await db.request.count({ where: requestWhere({ q: "Guadalajara" }) })).toBe(0);
  });
});
