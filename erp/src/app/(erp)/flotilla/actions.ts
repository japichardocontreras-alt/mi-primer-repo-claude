"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { assertPermission } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import {
  addDocument, addFuel, addMaintenance, cancelDocument, cancelMaintenance, createVehicle, documentSchema, fuelSchema, generateMonthlyDepreciation,
  localToUtc, maintenanceSchema, odometerSchema, recordOdometer, updateVehicle, vehicleSchema,
} from "@/lib/domain/fleet";

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
const done = (id: string, msg: string) => { revalidatePath(`/flotilla/${id}`); revalidatePath("/flotilla"); return ok(msg); };

export async function createVehicleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await assertPermission("flotilla.editar");
    id = (await withTransaction((tx) => createVehicle(tx, user.id, vehicleSchema.parse(formToObject(fd))))).id;
  } catch (e) { return toActionError(e); }
  revalidatePath("/flotilla");
  redirect(`/flotilla/${id}`);
}

export async function updateVehicleAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("flotilla.editar");
    const o = formToObject(fd);
    await withTransaction((tx) => updateVehicle(tx, user.id, id, z.coerce.number().int().parse(o.version), vehicleSchema.parse(o)));
    return done(id, "Datos de la unidad guardados.");
  } catch (e) { return toActionError(e); }
}

export async function odometerAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("flotilla.editar");
    const o = odometerSchema.parse(formToObject(fd));
    await withTransaction((tx) => recordOdometer(tx, user.id, id, localToUtc(o.readingAt), o.odometer, "MANUAL", o.notes ?? null, o.confirm));
    return done(id, "Lectura registrada.");
  } catch (e) { return toActionError(e); }
}

export async function maintenanceAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("flotilla.editar");
    await withTransaction((tx) => addMaintenance(tx, user.id, id, maintenanceSchema.parse(formToObject(fd))));
    return done(id, "Mantenimiento registrado.");
  } catch (e) { return toActionError(e); }
}

export async function cancelMaintenanceAction(mId: string, id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("flotilla.editar");
    await withTransaction((tx) => cancelMaintenance(tx, user.id, mId, String(fd.get("reason") ?? "")));
    return done(id, "Mantenimiento cancelado.");
  } catch (e) { return toActionError(e); }
}

export async function documentAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("flotilla.editar");
    await withTransaction((tx) => addDocument(tx, user.id, id, documentSchema.parse(formToObject(fd))));
    return done(id, "Documento registrado.");
  } catch (e) { return toActionError(e); }
}

export async function cancelDocumentAction(dId: string, id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("flotilla.editar");
    await withTransaction((tx) => cancelDocument(tx, user.id, dId, String(fd.get("reason") ?? "")));
    return done(id, "Documento cancelado.");
  } catch (e) { return toActionError(e); }
}

export async function fuelAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("flotilla.editar");
    await withTransaction((tx) => addFuel(tx, user.id, id, fuelSchema.parse(formToObject(fd))));
    return done(id, "Carga de combustible registrada.");
  } catch (e) { return toActionError(e); }
}

export async function depreciationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("costos.editar");
    const m = z.string().regex(/^\d{4}-\d{2}$/, "Mes no válido.").parse(fd.get("month"));
    const [y, mm] = m.split("-").map(Number);
    const n = await withTransaction((tx) => generateMonthlyDepreciation(tx, user.id, y, mm));
    revalidatePath("/flotilla");
    return ok(n ? `Depreciación de ${m} registrada (${n} registro(s)).` : `Ninguna unidad tiene depreciación en ${m} (revise precio, valor residual, vida útil y fecha de adquisición).`);
  } catch (e) { return toActionError(e); }
}
