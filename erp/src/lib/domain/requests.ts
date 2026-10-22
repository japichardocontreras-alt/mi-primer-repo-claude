import { z } from "zod";
import { Prisma, type RequestStatus } from "@prisma/client";
import { nextFolio, FOLIO } from "../folios";
import { audit } from "../audit";
import { BusinessError } from "../errors";
import { mexicoLocalToUtc } from "../format";
import { getPricingEngine } from "../pricing/engine";
import { optText, optNumber, optDateOnly, optLocalDateTime, optTime, checkbox, optBoolSelect, uuidOpt, money, moneyReq } from "../validation";
import { createClient, clientSchema } from "./clients";
import { CHANNEL, PACKAGE, SERVICE_TYPE, REQUEST_STATUS, OPEN_STATUSES, type ChannelKey, type PackageKey, type ServiceTypeKey, type RequestStatusKey } from "./labels";

type Tx = Prisma.TransactionClient;

const keys = <T extends string>(obj: Record<T, unknown>) => Object.keys(obj) as [T, ...T[]];
const enumReq = <T extends string>(obj: Record<T, unknown>, message: string) => z.enum(keys(obj), { errorMap: () => ({ message }) });
const enumOpt = <T extends string>(obj: Record<T, unknown>) =>
  z.preprocess((v) => (v === "" ? undefined : v), z.enum(keys(obj), { errorMap: () => ({ message: "Seleccione una opción." }) }).optional());

// ------------------------------------------------------------------ Esquemas

export const addressSchema = z.object({
  street: optText(200),
  extNumber: optText(30),
  intNumber: optText(30),
  neighborhood: optText(150),
  municipality: optText(150),
  state: optText(100),
  postalCode: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().regex(/^\d{5}$/, "El C.P. debe tener 5 dígitos.").optional()),
  references: optText(500),
  floor: optNumber({ int: true, min: -5, max: 200 }),
  hasElevator: optBoolSelect(),
  accessConditions: optText(1000),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const requestSchema = z.object({
  channel: enumReq<ChannelKey>(CHANNEL, "Seleccione el canal de contacto."),
  tentativeDate: optDateOnly(),
  tentativeTime: optTime(),
  serviceType: enumReq<ServiceTypeKey>(SERVICE_TYPE, "Seleccione el tipo de servicio."),
  package: enumOpt<PackageKey>(PACKAGE),
  inventorySummary: optText(5000),
  itemsDescription: optText(5000),
  observations: optText(5000),
  specialManeuvers: optText(2000),
  needsPacking: checkbox(),
  suggestedVehicleId: uuidOpt(),
  estimatedKm: optNumber({ min: 0, max: 10000 }),
  estimatedVolumeM3: optNumber({ min: 0, max: 1000 }),
  requiredStaff: optNumber({ int: true, min: 0, max: 50 }),
  estimatedExpenses: money("los gastos estimados"),
  origin: addressSchema,
  destination: addressSchema,
});
export type RequestInput = z.infer<typeof requestSchema>;

export const quoteSchema = z.object({
  price: moneyReq("el precio cotizado"),
  includesVat: checkbox(),
  validUntil: optDateOnly(),
  notes: optText(2000),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const followUpSchema = z
  .object({
    contactAt: optLocalDateTime(),
    channel: enumOpt<ChannelKey>(CHANNEL),
    notes: optText(3000),
    nextContactAt: optLocalDateTime(),
    newStatus: enumOpt<RequestStatusKey>(REQUEST_STATUS),
    lostReason: optText(1000),
    cancelReason: optText(1000),
  })
  .superRefine((v, ctx) => {
    if (!v.notes && !v.newStatus && !v.nextContactAt) ctx.addIssue({ code: "custom", path: ["notes"], message: "Escriba una nota, programe un próximo contacto o cambie el estado." });
    if (v.newStatus === "NO_CONCRETADA" && !v.lostReason) ctx.addIssue({ code: "custom", path: ["lostReason"], message: "Indique el motivo por el que no se concretó." });
    if (v.newStatus === "CANCELADA" && !v.cancelReason) ctx.addIssue({ code: "custom", path: ["cancelReason"], message: "Indique el motivo de la cancelación." });
  });
export type FollowUpInput = z.infer<typeof followUpSchema>;

/** Toma los campos con prefijo (orig_street → street) de un objeto plano de formulario. */
export function pickPrefixed(o: Record<string, unknown>, prefix: string) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  return out;
}

export function parseRequestForm(o: Record<string, unknown>): RequestInput {
  return requestSchema.parse({ ...o, origin: pickPrefixed(o, "orig_"), destination: pickPrefixed(o, "dest_") });
}

// ------------------------------------------------------------------ Utilidades

const hasAddressData = (a: AddressInput) => Object.values(a).some((v) => v !== undefined && v !== null && v !== "");

const addressData = (a: AddressInput) => ({
  street: a.street ?? null, extNumber: a.extNumber ?? null, intNumber: a.intNumber ?? null, neighborhood: a.neighborhood ?? null,
  municipality: a.municipality ?? null, state: a.state ?? null, postalCode: a.postalCode ?? null, references: a.references ?? null,
  floor: a.floor ?? null, hasElevator: a.hasElevator ?? null, accessConditions: a.accessConditions ?? null,
});

const requestData = (r: RequestInput) => ({
  channel: r.channel,
  tentativeDate: r.tentativeDate ?? null,
  tentativeTime: r.tentativeTime ?? null,
  serviceType: r.serviceType,
  package: r.package ?? null,
  inventorySummary: r.inventorySummary ?? null,
  itemsDescription: r.itemsDescription ?? null,
  observations: r.observations ?? null,
  specialManeuvers: r.specialManeuvers ?? null,
  needsPacking: r.needsPacking,
  suggestedVehicleId: r.suggestedVehicleId ?? null,
  estimatedKm: r.estimatedKm ?? null,
  estimatedVolumeM3: r.estimatedVolumeM3 ?? null,
  requiredStaff: r.requiredStaff ?? null,
  estimatedExpenses: r.estimatedExpenses ?? null,
});

/** Bloquea la fila de la solicitud hasta el fin de la transacción (evita carreras entre usuarios). */
async function lockRequest(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "requests" WHERE "id" = ${id}::uuid FOR UPDATE`;
  if (!rows.length) throw new BusinessError("La solicitud no existe.");
  return tx.request.findUniqueOrThrow({ where: { id } });
}

async function notifyAll(tx: Tx, title: string, body: string, link: string) {
  await tx.notification.create({ data: { type: "SOLICITUD", title, body, link } });
}

// ------------------------------------------------------------------ Operaciones

export async function createRequest(
  tx: Tx,
  actor: { id: string; name: string },
  input: {
    clientId?: string;
    newClient?: z.infer<typeof clientSchema>;
    allowDuplicatePhone?: boolean;
    request: RequestInput;
    quote?: QuoteInput;
  },
) {
  let clientId = input.clientId;
  if (!clientId) {
    if (!input.newClient) throw new BusinessError("Seleccione un cliente o capture uno nuevo.");
    clientId = (await createClient(tx, actor.id, input.newClient, { allowDuplicatePhone: input.allowDuplicatePhone })).id;
  } else {
    const c = await tx.client.findUnique({ where: { id: clientId } });
    if (!c) throw new BusinessError("El cliente seleccionado no existe.");
    if (!c.active) throw new BusinessError("El cliente seleccionado está desactivado.");
  }

  const r = input.request;
  const origin = hasAddressData(r.origin) ? await tx.address.create({ data: { ...addressData(r.origin), clientId } }) : null;
  const destination = hasAddressData(r.destination) ? await tx.address.create({ data: { ...addressData(r.destination), clientId } }) : null;

  const request = await tx.request.create({
    data: {
      folio: await nextFolio(tx, FOLIO.SOLICITUD),
      clientId,
      ...requestData(r),
      originAddressId: origin?.id,
      destinationAddressId: destination?.id,
      status: "NUEVA",
      lastContactAt: new Date(),
      createdById: actor.id,
    },
  });
  await tx.requestEvent.create({ data: { requestId: request.id, type: "CREADA", toStatus: "NUEVA", contactAt: request.lastContactAt, createdById: actor.id } });
  await audit(tx, { userId: actor.id, action: "CREAR", entity: "Solicitud", entityId: request.id, summary: request.folio, after: r });

  if (input.quote) await addQuote(tx, actor.id, request.id, input.quote);
  await notifyAll(tx, `Nueva solicitud ${request.folio}`, `Registrada por ${actor.name}`, `/solicitudes/${request.id}`);
  return tx.request.findUniqueOrThrow({ where: { id: request.id } });
}

const EDITABLE_FIELDS = [
  "channel", "tentativeDate", "tentativeTime", "serviceType", "package", "inventorySummary", "itemsDescription", "observations",
  "specialManeuvers", "needsPacking", "suggestedVehicleId", "estimatedKm", "estimatedVolumeM3", "requiredStaff", "estimatedExpenses",
] as const;

function norm(v: unknown) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v instanceof Prisma.Decimal) return Number(v.toString());
  return v;
}

export async function updateRequest(tx: Tx, actorId: string, id: string, version: number, r: RequestInput) {
  const before = await lockRequest(tx, id);
  if (before.version !== version) throw new BusinessError("Otro usuario modificó esta solicitud. Recargue la página para ver los cambios.");
  if (before.status === "CONFIRMADA") throw new BusinessError("La solicitud ya fue confirmada; los cambios se hacen en el servicio programado.");

  const data = requestData(r);
  const changes: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const f of EDITABLE_FIELDS) {
    const a = norm(before[f]);
    const b = norm(data[f]);
    if (JSON.stringify(a) !== JSON.stringify(b)) changes[f] = { antes: a, despues: b };
  }

  // Direcciones: se actualiza la fila propia de la solicitud (aún no la usa ningún servicio).
  for (const [key, fk] of [["origin", "originAddressId"], ["destination", "destinationAddressId"]] as const) {
    const input = r[key];
    const currentId = before[fk];
    if (currentId) {
      const cur = await tx.address.findUniqueOrThrow({ where: { id: currentId } });
      const next = addressData(input);
      const diff = Object.keys(next).some((k) => JSON.stringify(norm(cur[k as keyof typeof cur])) !== JSON.stringify(norm(next[k as keyof typeof next])));
      if (diff) {
        await tx.address.update({ where: { id: currentId }, data: next });
        changes[key === "origin" ? "direccionCarga" : "direccionDescarga"] = { antes: "modificada", despues: "modificada" };
      }
    } else if (hasAddressData(input)) {
      const a = await tx.address.create({ data: { ...addressData(input), clientId: before.clientId } });
      (data as Record<string, unknown>)[fk] = a.id;
      changes[key === "origin" ? "direccionCarga" : "direccionDescarga"] = { antes: null, despues: "capturada" };
    }
  }

  await tx.request.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
  if (Object.keys(changes).length) {
    await tx.requestEvent.create({ data: { requestId: id, type: "EDICION", data: changes as Prisma.InputJsonValue, createdById: actorId } });
    await audit(tx, { userId: actorId, action: "EDITAR", entity: "Solicitud", entityId: id, summary: before.folio, after: changes });
  }
  return Object.keys(changes).length;
}

/** Registra una nueva versión de cotización (las anteriores se conservan intactas). */
export async function addQuote(tx: Tx, actorId: string, requestId: string, q: QuoteInput) {
  const req = await lockRequest(tx, requestId);
  if (req.status === "CONFIRMADA" || req.status === "CANCELADA" || req.status === "NO_CONCRETADA") {
    throw new BusinessError(`La solicitud está «${REQUEST_STATUS[req.status].label}». Reábrala para modificar el precio.`);
  }
  const last = await tx.quote.findFirst({ where: { requestId }, orderBy: { versionNumber: "desc" } });
  const versionNumber = (last?.versionNumber ?? 0) + 1;

  // Punto de integración del cotizador: hoy el motor manual no calcula (calculatedPrice = null).
  const engine = getPricingEngine();
  const calc = await engine.calculate({
    serviceType: req.serviceType, packageType: req.package, vehicleId: req.suggestedVehicleId,
    estimatedKm: req.estimatedKm ? Number(req.estimatedKm) : null, estimatedVolumeM3: req.estimatedVolumeM3 ? Number(req.estimatedVolumeM3) : null,
    requiredStaff: req.requiredStaff, estimatedExpenses: req.estimatedExpenses ? Number(req.estimatedExpenses) : null,
    needsPacking: req.needsPacking, inventory: req.inventorySummary,
  });

  const quote = await tx.quote.create({
    data: {
      requestId, versionNumber, source: "MANUAL", manualPrice: q.price, finalPrice: q.price, calculatedPrice: calc.calculatedPrice,
      calculatorVer: calc.engineVersion, includesVat: q.includesVat, validUntil: q.validUntil ?? null, notes: q.notes ?? null, createdById: actorId,
    },
  });
  const autoAdvance: RequestStatus[] = ["NUEVA", "INFORMACION_INCOMPLETA", "PENDIENTE_COTIZAR"];
  const newStatus: RequestStatus = autoAdvance.includes(req.status) ? "COTIZACION_ENVIADA" : req.status;
  await tx.request.update({ where: { id: requestId }, data: { currentQuoteId: quote.id, status: newStatus, version: { increment: 1 } } });
  await tx.requestEvent.create({
    data: {
      requestId, type: "COTIZACION", fromStatus: req.status, toStatus: newStatus, notes: q.notes ?? null, createdById: actorId,
      data: { version: versionNumber, precio: q.price, precioAnterior: last ? Number(last.finalPrice) : null, incluyeIva: q.includesVat },
    },
  });
  await audit(tx, {
    userId: actorId, action: versionNumber === 1 ? "COTIZAR" : "RECOTIZAR", entity: "Solicitud", entityId: requestId,
    summary: `${req.folio} v${versionNumber}: ${q.price}`, before: last ? { version: last.versionNumber, precio: Number(last.finalPrice) } : undefined,
    after: { version: versionNumber, precio: q.price },
  });
  return quote;
}

/** Seguimiento comercial: contacto, notas, próxima fecha y cambio de estado. */
export async function addFollowUp(tx: Tx, actorId: string, requestId: string, f: FollowUpInput) {
  const req = await lockRequest(tx, requestId);
  if (req.status === "CONFIRMADA") throw new BusinessError("La solicitud ya fue confirmada; el seguimiento continúa en el servicio.");
  if (f.newStatus === "CONFIRMADA") {
    throw new BusinessError("La confirmación se realiza con «Confirmar y convertir en servicio», que genera el folio de servicio y lo coloca en la agenda.");
  }
  if (f.nextContactAt && f.contactAt && f.nextContactAt <= f.contactAt) {
    throw new BusinessError("La próxima fecha de contacto debe ser posterior al contacto registrado.");
  }
  const status = f.newStatus && f.newStatus !== req.status ? f.newStatus : undefined;
  const closing = status === "NO_CONCRETADA" || status === "CANCELADA";
  const reopening = !!status && OPEN_STATUSES.includes(status) && (req.status === "NO_CONCRETADA" || req.status === "CANCELADA");

  const lastContactAt = f.contactAt && (!req.lastContactAt || f.contactAt > req.lastContactAt) ? f.contactAt : req.lastContactAt;
  await tx.request.update({
    where: { id: requestId },
    data: {
      lastContactAt,
      nextContactAt: closing ? null : f.nextContactAt ?? (f.contactAt ? null : req.nextContactAt),
      ...(status ? { status } : {}),
      ...(status === "NO_CONCRETADA" ? { lostReason: f.lostReason } : {}),
      ...(status === "CANCELADA" ? { cancelReason: f.cancelReason } : {}),
      ...(reopening ? { lostReason: null, cancelReason: null } : {}),
      version: { increment: 1 },
    },
  });
  if (f.contactAt || f.notes || f.nextContactAt) {
    await tx.requestEvent.create({
      data: {
        requestId, type: f.contactAt ? "CONTACTO" : "NOTA", contactAt: f.contactAt ?? null, nextContactAt: f.nextContactAt ?? null,
        notes: f.notes ?? null, data: f.channel ? { canal: f.channel } : undefined, createdById: actorId,
      },
    });
  }
  if (status) {
    await tx.requestEvent.create({
      data: { requestId, type: "CAMBIO_ESTADO", fromStatus: req.status, toStatus: status, notes: f.lostReason ?? f.cancelReason ?? null, createdById: actorId },
    });
    await audit(tx, { userId: actorId, action: "CAMBIO_ESTADO", entity: "Solicitud", entityId: requestId, summary: `${req.folio}: ${req.status} → ${status}`, before: { status: req.status }, after: { status, motivo: f.lostReason ?? f.cancelReason } });
  }
}

// ------------------------------------------------------------------ Consultas

export type RequestFilters = {
  q?: string;
  status?: string;
  serviceType?: string;
  view?: "seguimiento" | "todas" | "vencidas";
  from?: string;
  to?: string;
};

export function requestWhere(f: RequestFilters, now = new Date()): Prisma.RequestWhereInput {
  const and: Prisma.RequestWhereInput[] = [];
  const q = f.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { folio: { contains: q, mode: "insensitive" } },
        { client: { name: { contains: q, mode: "insensitive" } } },
        { client: { code: { contains: q, mode: "insensitive" } } },
        ...(digits.length >= 4 ? [{ client: { phoneNormalized: { contains: digits } } }] : []),
        { originAddress: { municipality: { contains: q, mode: "insensitive" } } },
        { destinationAddress: { municipality: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (f.status && f.status in REQUEST_STATUS) and.push({ status: f.status as RequestStatus });
  else if (f.view === "seguimiento" || f.view === "vencidas") and.push({ status: { in: OPEN_STATUSES } });
  if (f.view === "vencidas") and.push({ nextContactAt: { lte: now } });
  if (f.serviceType && f.serviceType in SERVICE_TYPE) and.push({ serviceType: f.serviceType as ServiceTypeKey });
  const ymd = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").map(Number) : null);
  const from = ymd(f.from);
  const to = ymd(f.to);
  if (from) and.push({ registeredAt: { gte: mexicoLocalToUtc(from[0], from[1], from[2]) } });
  if (to) and.push({ registeredAt: { lt: mexicoLocalToUtc(to[0], to[1], to[2] + 1) } });
  return and.length ? { AND: and } : {};
}

export const requestListInclude = {
  client: true,
  originAddress: true,
  destinationAddress: true,
  currentQuote: true,
} satisfies Prisma.RequestInclude;
