"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { assertPermission, getCurrentUser } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import { BusinessError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { discardFiles, filesFrom, storeFiles, type StoredFile } from "@/lib/attachments";
import {
  assignmentSchema, cancelPayment, changeServiceStatus, confirmRequest, confirmSchema, overrideSchema, paymentSchema, registerPayment,
  scheduleSchema, scheduleService, serviceEditSchema, updateServiceData, type Actor, type AssignmentInput, type ServiceStatusKey,
} from "@/lib/domain/services";

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });

/** Lee unidades (checkboxes vehicleIds) y personal (JSON del selector de cuadrilla). */
function parseAssignment(fd: FormData): AssignmentInput {
  const vehicleIds = fd.getAll("vehicleIds").filter((v): v is string => typeof v === "string" && v !== "");
  let staff: unknown = [];
  const raw = fd.get("staffJson");
  if (typeof raw === "string" && raw) {
    try { staff = JSON.parse(raw); } catch { throw new BusinessError("La lista de personal no es válida."); }
  }
  return assignmentSchema.parse({ vehicleIds, staff });
}

function scheduleFrom(o: Record<string, string | undefined>, fieldErrors: Record<string, string>) {
  const r = scheduleSchema.safeParse({ date: o.date, time: o.time, durationHours: o.durationHours, prepMinutes: o.prepMinutes, returnMinutes: o.returnMinutes });
  if (!r.success) {
    for (const i of r.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return undefined;
  }
  return r.data;
}

async function actorFor(): Promise<Actor> {
  const u = await getCurrentUser();
  if (!u) throw new BusinessError("Su sesión expiró. Inicie sesión de nuevo.");
  return { id: u.id, name: u.name, canOverride: u.permissions.has("agenda.autorizar_conflictos") };
}

export async function confirmRequestAction(requestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let serviceId: string;
  try {
    await assertPermission("solicitudes.confirmar");
    const actor = await actorFor();
    const o = formToObject(fd);
    const fieldErrors: Record<string, string> = {};
    const confirm = confirmSchema.safeParse(o);
    if (!confirm.success) for (const i of confirm.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    const wantsSchedule = !!(o.date || o.time);
    const schedule = wantsSchedule ? scheduleFrom(o, fieldErrors) : undefined;
    const assignment = parseAssignment(fd);
    if ((assignment.vehicleIds.length || assignment.staff.length) && !(await assertPermission("agenda.programar").catch(() => null))) {
      throw new BusinessError("No tiene permiso para asignar unidades o personal.");
    }
    if (Object.keys(fieldErrors).length || !confirm.success) return { ok: false, message: "Revise los campos marcados.", fieldErrors, at: Date.now() };
    const override = overrideSchema.parse(o);
    const svc = await withTransaction((tx) => confirmRequest(tx, actor, requestId, { confirm: confirm.data, schedule, assignment, override }));
    serviceId = svc.id;
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/agenda");
  revalidatePath(`/solicitudes/${requestId}`);
  redirect(`/agenda/${serviceId}?confirmado=1`);
}

export async function scheduleServiceAction(serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await assertPermission("agenda.programar");
    const actor = await actorFor();
    const o = formToObject(fd);
    const fieldErrors: Record<string, string> = {};
    const schedule = scheduleFrom(o, fieldErrors);
    if (!schedule) return { ok: false, message: "Revise los campos marcados.", fieldErrors, at: Date.now() };
    const version = z.coerce.number().int().parse(o.version);
    const r = await withTransaction((tx) =>
      scheduleService(tx, actor, serviceId, { version, schedule, assignment: parseAssignment(fd), reason: o.reason, override: overrideSchema.parse(o) }),
    );
    revalidatePath(`/agenda/${serviceId}`);
    revalidatePath("/agenda");
    return ok(r.changed ? "Programación y asignación guardadas." : "No hubo cambios.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function changeStatusAction(serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("agenda.programar");
    const o = formToObject(fd);
    const version = z.coerce.number().int().parse(o.version);
    const to = z.enum(["POR_PROGRAMAR", "PROGRAMADO", "CONFIRMADO", "EN_PROCESO", "FINALIZADO", "INCIDENCIA", "CANCELADO"], { errorMap: () => ({ message: "Seleccione el nuevo estado." }) }).parse(o.to) as ServiceStatusKey;
    await withTransaction((tx) => changeServiceStatus(tx, user.id, serviceId, version, to, o.reason));
    revalidatePath(`/agenda/${serviceId}`);
    revalidatePath("/agenda");
    return ok("Estado actualizado.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateServiceAction(serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("agenda.programar");
    const o = formToObject(fd);
    const version = z.coerce.number().int().parse(o.version);
    await withTransaction((tx) => updateServiceData(tx, user.id, serviceId, version, serviceEditSchema.parse(o)));
    revalidatePath(`/agenda/${serviceId}`);
    return ok("Datos del servicio guardados.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function registerPaymentAction(serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.cobros");
    const p = await withTransaction((tx) => registerPayment(tx, user.id, serviceId, paymentSchema.parse(formToObject(fd))));
    revalidatePath(`/agenda/${serviceId}`);
    return ok(`Cobro ${p.folio} registrado.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelPaymentAction(paymentId: string, serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.cobros");
    await withTransaction((tx) => cancelPayment(tx, user.id, paymentId, String(fd.get("cancelReason") ?? "")));
    revalidatePath(`/agenda/${serviceId}`);
    return ok("Cobro cancelado.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function uploadServiceFilesAction(serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let stored: StoredFile[] = [];
  try {
    const user = await assertPermission("agenda.programar");
    const files = filesFrom(fd);
    if (!files.length) throw new BusinessError("Seleccione al menos un archivo.");
    stored = await storeFiles(files);
    await withTransaction(async (tx) => {
      const s = await tx.service.findUniqueOrThrow({ where: { id: serviceId } });
      await tx.attachment.createMany({ data: stored.map((f) => ({ ...f, serviceId, uploadedById: user.id })) });
      await audit(tx, { userId: user.id, action: "ADJUNTAR", entity: "Servicio", entityId: serviceId, summary: `${s.folio}: ${stored.map((f) => f.fileName).join(", ")}` });
    });
    revalidatePath(`/agenda/${serviceId}`);
    return ok(`${stored.length} archivo(s) adjuntado(s).`);
  } catch (e) {
    await discardFiles(stored);
    return toActionError(e);
  }
}
