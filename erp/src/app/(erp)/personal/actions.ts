"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { assertPermission } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import { createWorker, updateWorker, workerSchema } from "@/lib/domain/workers";

export async function createWorkerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await assertPermission("personal.editar");
    id = (await withTransaction((tx) => createWorker(tx, user.id, workerSchema.parse(formToObject(fd))))).id;
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/personal");
  redirect(`/personal/${id}`);
}

export async function updateWorkerAction(workerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("personal.editar");
    const o = formToObject(fd);
    await withTransaction((tx) => updateWorker(tx, user.id, workerId, z.coerce.number().int().parse(o.version), workerSchema.parse(o)));
    revalidatePath(`/personal/${workerId}`);
    return { ok: true, message: "Datos guardados.", at: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}
