import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { nextFolio, FOLIO } from "../folios";
import { audit } from "../audit";
import { normalizePhone } from "../format";
import { BusinessError } from "../errors";
import { reqText, optText, phoneSchema, emailOpt } from "../validation";
import { CHANNEL, type ChannelKey } from "./labels";

type Tx = Prisma.TransactionClient;

export const clientSchema = z.object({
  name: reqText("el nombre del cliente", 150),
  phone: phoneSchema,
  email: emailOpt(),
  channel: z.preprocess((v) => (v === "" ? undefined : v), z.enum(Object.keys(CHANNEL) as [ChannelKey, ...ChannelKey[]]).optional()),
  notes: optText(2000),
});
export type ClientInput = z.infer<typeof clientSchema>;

/** Error de teléfono duplicado: el usuario puede confirmar y continuar. */
export class DuplicatePhoneError extends BusinessError {
  constructor(public matches: { id: string; code: string; name: string }[]) {
    super(`Ya existe un cliente con ese teléfono: ${matches.map((m) => `${m.name} (${m.code})`).join(", ")}. Seleccione el cliente existente o confirme que se trata de otra persona.`);
    this.code = "DUPLICATE_PHONE";
  }
}

export async function findByPhone(db: Tx, phone: string, excludeId?: string) {
  const n = normalizePhone(phone);
  if (n.length < 8) return [];
  // Compara los últimos 10 dígitos para tolerar prefijos (+52, 52, 044...).
  const tail = n.slice(-10);
  return db.client.findMany({
    where: { phoneNormalized: { endsWith: tail }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, code: true, name: true },
    take: 5,
  });
}

export async function createClient(tx: Tx, actorId: string | null, input: ClientInput, opts: { allowDuplicatePhone?: boolean } = {}) {
  if (!opts.allowDuplicatePhone) {
    const dups = await findByPhone(tx, input.phone);
    if (dups.length) throw new DuplicatePhoneError(dups);
  }
  const client = await tx.client.create({
    data: {
      code: await nextFolio(tx, FOLIO.CLIENTE),
      name: input.name,
      phone: input.phone,
      phoneNormalized: normalizePhone(input.phone),
      email: input.email,
      channel: input.channel,
      notes: input.notes,
      createdById: actorId,
    },
  });
  await audit(tx, { userId: actorId, action: "CREAR", entity: "Cliente", entityId: client.id, summary: `${client.code} ${client.name}`, after: input });
  return client;
}

export async function updateClient(tx: Tx, actorId: string, id: string, version: number, input: ClientInput, opts: { allowDuplicatePhone?: boolean } = {}) {
  const before = await tx.client.findUniqueOrThrow({ where: { id } });
  if (!opts.allowDuplicatePhone && normalizePhone(input.phone) !== before.phoneNormalized) {
    const dups = await findByPhone(tx, input.phone, id);
    if (dups.length) throw new DuplicatePhoneError(dups);
  }
  const res = await tx.client.updateMany({
    where: { id, version },
    data: { name: input.name, phone: input.phone, phoneNormalized: normalizePhone(input.phone), email: input.email ?? null, channel: input.channel ?? null, notes: input.notes ?? null, version: { increment: 1 } },
  });
  if (res.count === 0) throw new BusinessError("Otro usuario modificó este cliente. Recargue la página para ver los cambios.");
  await audit(tx, {
    userId: actorId, action: "EDITAR", entity: "Cliente", entityId: id, summary: before.code,
    before: { name: before.name, phone: before.phone, email: before.email, channel: before.channel, notes: before.notes }, after: input,
  });
}

export async function setClientActive(tx: Tx, actorId: string, id: string, active: boolean) {
  const c = await tx.client.update({ where: { id }, data: { active, version: { increment: 1 } } });
  await audit(tx, { userId: actorId, action: active ? "REACTIVAR" : "DESACTIVAR", entity: "Cliente", entityId: id, summary: c.code });
}

/** Solo se puede eliminar un cliente sin historial; con historial se desactiva. */
export async function deleteClient(tx: Tx, actorId: string, id: string) {
  const c = await tx.client.findUniqueOrThrow({ where: { id }, include: { _count: { select: { requests: true, services: true, addresses: true } } } });
  if (c._count.requests || c._count.services || c._count.addresses) {
    throw new BusinessError("El cliente tiene solicitudes o servicios registrados y no puede eliminarse. Puede desactivarlo para conservar su historial.");
  }
  await tx.client.delete({ where: { id } });
  await audit(tx, { userId: actorId, action: "ELIMINAR", entity: "Cliente", entityId: id, summary: `${c.code} ${c.name}`, before: { name: c.name, phone: c.phone } });
}

export function clientWhere(q?: string, estado?: string): Prisma.ClientWhereInput {
  const and: Prisma.ClientWhereInput[] = [];
  const t = q?.trim();
  if (t) {
    const d = t.replace(/\D/g, "");
    and.push({ OR: [{ name: { contains: t, mode: "insensitive" } }, { code: { contains: t, mode: "insensitive" } }, { email: { contains: t, mode: "insensitive" } }, ...(d.length >= 4 ? [{ phoneNormalized: { contains: d } }] : [])] });
  }
  if (estado === "activos") and.push({ active: true });
  if (estado === "inactivos") and.push({ active: false });
  return and.length ? { AND: and } : {};
}

