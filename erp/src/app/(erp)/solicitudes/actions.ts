"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, withTransaction } from "@/lib/db";
import { assertPermission } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import { BusinessError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { clientSchema, type ClientInput } from "@/lib/domain/clients";
import type { RequestInput } from "@/lib/domain/requests";
import { addFollowUp, addQuote, createRequest, followUpSchema, parseRequestForm, quoteSchema, updateRequest, type QuoteInput } from "@/lib/domain/requests";
import { discardFiles, filesFrom, storeFiles, type StoredFile } from "@/lib/attachments";

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });

export async function createRequestAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  let stored: StoredFile[] = [];
  try {
    const user = await assertPermission("solicitudes.crear");
    const o = formToObject(fd);
    // Se validan cliente, solicitud y precio juntos para mostrar todos los errores en un solo envío.
    const fieldErrors: Record<string, string> = {};
    const collect = (issues: z.ZodIssue[], name: (path: (string | number)[]) => string) => {
      for (const i of issues) fieldErrors[name(i.path)] ??= i.message;
    };
    const mode = o.clientMode === "existente" ? "existente" : "nuevo";
    let clientId: string | undefined;
    let newClient: ClientInput | undefined;
    if (mode === "existente") {
      const c = z.string({ required_error: "Seleccione un cliente." }).uuid("Seleccione un cliente.").safeParse(o.clientId);
      if (c.success) clientId = c.data;
      else fieldErrors.clientId = "Seleccione un cliente.";
    } else {
      const c = clientSchema.safeParse({ name: o.client_name, phone: o.client_phone, email: o.client_email, channel: o.channel });
      if (c.success) newClient = c.data;
      else collect(c.error.issues, (p) => `client_${String(p[0])}`);
    }
    let request: RequestInput | undefined;
    try {
      request = parseRequestForm(o);
    } catch (err) {
      if (err instanceof z.ZodError) collect(err.issues, (p) => p.join(".").replace(/^origin\./, "orig_").replace(/^destination\./, "dest_"));
      else throw err;
    }
    let quote: QuoteInput | undefined;
    if (o.price) {
      if (!(await assertPermission("solicitudes.cotizar").catch(() => null))) throw new BusinessError("No tiene permiso para capturar precios.");
      const q = quoteSchema.safeParse({ price: o.price, includesVat: o.includesVat, validUntil: o.validUntil, notes: o.quoteNotes });
      if (q.success) quote = q.data;
      else collect(q.error.issues, (p) => (p[0] === "notes" ? "quoteNotes" : String(p[0])));
    }
    if (Object.keys(fieldErrors).length || !request) {
      return { ok: false, message: "Revise los campos marcados.", fieldErrors, at: Date.now() };
    }
    const validRequest = request;
    stored = await storeFiles(filesFrom(fd));
    const created = await withTransaction(async (tx) => {
      const r = await createRequest(tx, { id: user.id, name: user.name }, { clientId, newClient, allowDuplicatePhone: o.confirmDuplicate === "on", request: validRequest, quote });
      if (stored.length) await tx.attachment.createMany({ data: stored.map((s) => ({ ...s, requestId: r.id, uploadedById: user.id })) });
      return r;
    });
    id = created.id;
  } catch (e) {
    await discardFiles(stored);
    const st = toActionError(e);
    // Los errores de zod del bloque de solicitud usan rutas origin.x / destination.x → nombres del formulario.
    if (st.fieldErrors) {
      st.fieldErrors = Object.fromEntries(Object.entries(st.fieldErrors).map(([k, v]) => [k.replace(/^origin\./, "orig_").replace(/^destination\./, "dest_"), v]));
    }
    if (st.code === "DUPLICATE_PHONE") st.fieldErrors = { ...st.fieldErrors, client_phone: "Teléfono ya registrado." };
    return st;
  }
  revalidatePath("/solicitudes");
  redirect(`/solicitudes/${id}?creada=1`);
}

export async function updateRequestAction(requestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("solicitudes.editar");
    const o = formToObject(fd);
    const version = z.coerce.number().int().parse(o.version);
    const request = parseRequestForm(o);
    const n = await withTransaction((tx) => updateRequest(tx, user.id, requestId, version, request));
    revalidatePath(`/solicitudes/${requestId}`);
    return ok(n ? `Cambios guardados (${n} campo(s) modificado(s)).` : "No hubo cambios que guardar.");
  } catch (e) {
    const st = toActionError(e);
    if (st.fieldErrors) st.fieldErrors = Object.fromEntries(Object.entries(st.fieldErrors).map(([k, v]) => [k.replace(/^origin\./, "orig_").replace(/^destination\./, "dest_"), v]));
    return st;
  }
}

export async function addQuoteAction(requestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("solicitudes.cotizar");
    const q = quoteSchema.parse(formToObject(fd));
    const quote = await withTransaction((tx) => addQuote(tx, user.id, requestId, q));
    revalidatePath(`/solicitudes/${requestId}`);
    return ok(`Cotización versión ${quote.versionNumber} guardada.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function addFollowUpAction(requestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("solicitudes.editar");
    const f = followUpSchema.parse(formToObject(fd));
    await withTransaction((tx) => addFollowUp(tx, user.id, requestId, f));
    revalidatePath(`/solicitudes/${requestId}`);
    return ok("Seguimiento registrado.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function uploadRequestFilesAction(requestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let stored: StoredFile[] = [];
  try {
    const user = await assertPermission("solicitudes.editar");
    const files = filesFrom(fd);
    if (!files.length) throw new BusinessError("Seleccione al menos un archivo.");
    stored = await storeFiles(files);
    await withTransaction(async (tx) => {
      const r = await tx.request.findUniqueOrThrow({ where: { id: requestId } });
      await tx.attachment.createMany({ data: stored.map((s) => ({ ...s, requestId, uploadedById: user.id, description: (fd.get("description") as string) || null })) });
      await audit(tx, { userId: user.id, action: "ADJUNTAR", entity: "Solicitud", entityId: requestId, summary: `${r.folio}: ${stored.map((s) => s.fileName).join(", ")}` });
    });
    revalidatePath(`/solicitudes/${requestId}`);
    return ok(`${stored.length} archivo(s) adjuntado(s).`);
  } catch (e) {
    await discardFiles(stored);
    return toActionError(e);
  }
}

/** Retira un adjunto (borrado lógico; el archivo se conserva para auditoría). */
export async function removeAttachmentAction(attachmentId: string, _prev: ActionState): Promise<ActionState> {
  try {
    const user = await assertPermission("solicitudes.editar");
    await withTransaction(async (tx) => {
      const a = await tx.attachment.update({ where: { id: attachmentId }, data: { deletedAt: new Date() } });
      await audit(tx, { userId: user.id, action: "RETIRAR_ADJUNTO", entity: "Archivo", entityId: a.id, summary: a.fileName });
      if (a.requestId) revalidatePath(`/solicitudes/${a.requestId}`);
    });
    return ok("Archivo retirado.");
  } catch (e) {
    return toActionError(e);
  }
}

/** Lista de clientes para el selector (búsqueda en vivo). */
export async function searchClientsAction(q: string) {
  await assertPermission("solicitudes.crear");
  const term = q.trim();
  const digits = term.replace(/\D/g, "");
  if (term.length < 2) return [];
  const rows = await prisma.client.findMany({
    where: {
      active: true,
      OR: [{ name: { contains: term, mode: "insensitive" } }, { code: { contains: term, mode: "insensitive" } }, ...(digits.length >= 4 ? [{ phoneNormalized: { contains: digits } }] : [])],
    },
    take: 8,
    orderBy: { name: "asc" },
  });
  return rows.map((c) => ({ id: c.id, code: c.code, name: c.name, phone: c.phone }));
}
