"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { assertPermission } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import { clientSchema, createClient, deleteClient, setClientActive, updateClient } from "@/lib/domain/clients";

export async function createClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await assertPermission("clientes.editar");
    const o = formToObject(fd);
    const input = clientSchema.parse(o);
    id = (await withTransaction((tx) => createClient(tx, user.id, input, { allowDuplicatePhone: o.confirmDuplicate === "on" }))).id;
  } catch (e) {
    const st = toActionError(e);
    if (st.code === "DUPLICATE_PHONE") st.fieldErrors = { phone: "Teléfono ya registrado." };
    return st;
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${id}`);
}

export async function updateClientAction(clientId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("clientes.editar");
    const o = formToObject(fd);
    const version = z.coerce.number().int().parse(o.version);
    await withTransaction((tx) => updateClient(tx, user.id, clientId, version, clientSchema.parse(o), { allowDuplicatePhone: o.confirmDuplicate === "on" }));
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true, message: "Cliente actualizado.", at: Date.now() };
  } catch (e) {
    const st = toActionError(e);
    if (st.code === "DUPLICATE_PHONE") st.fieldErrors = { phone: "Teléfono ya registrado." };
    return st;
  }
}

export async function toggleClientActiveAction(clientId: string, active: boolean, _prev: ActionState): Promise<ActionState> {
  try {
    const user = await assertPermission("clientes.editar");
    await withTransaction((tx) => setClientActive(tx, user.id, clientId, active));
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true, message: active ? "Cliente reactivado." : "Cliente desactivado.", at: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteClientAction(clientId: string, _prev: ActionState): Promise<ActionState> {
  try {
    const user = await assertPermission("clientes.editar");
    await withTransaction((tx) => deleteClient(tx, user.id, clientId));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/clientes");
  redirect("/clientes");
}
