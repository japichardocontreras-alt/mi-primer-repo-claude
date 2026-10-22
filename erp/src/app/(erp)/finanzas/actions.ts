"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { assertPermission } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import { cancelExpense } from "@/lib/domain/expenses";
import {
  cancelMovement, categorySchema, createCategory, createGeneralExpense, createMovement, generalExpenseSchema, generateRecurring, markExpensePaid,
  movementSchema, recurringSchema, saveRecurring, toggleCategory,
} from "@/lib/domain/finance";

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
const reval = () => { revalidatePath("/finanzas", "layout"); };

export async function createExpenseAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    const o = formToObject(fd);
    // Casilla desmarcada = no viene en el formulario → «por pagar».
    o.paid = o.paid === "on" ? "on" : "false";
    const e = await withTransaction((tx) => createGeneralExpense(tx, user.id, generalExpenseSchema.parse(o), { allowDuplicate: o.confirmDuplicate === "on" }));
    reval();
    return ok(`Gasto ${e.folio} registrado${e.paidAt ? "" : " como por pagar"}.`);
  } catch (e) { return toActionError(e); }
}

export async function markPaidAction(expenseId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    await withTransaction((tx) => markExpensePaid(tx, user.id, expenseId, String(fd.get("paidAt") ?? ""), (fd.get("method") as string) || undefined));
    reval();
    return ok("Gasto marcado como pagado.");
  } catch (e) { return toActionError(e); }
}

export async function cancelExpenseFinAction(expenseId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    await withTransaction((tx) => cancelExpense(tx, user.id, expenseId, String(fd.get("reason") ?? "")));
    reval();
    return ok("Gasto cancelado.");
  } catch (e) { return toActionError(e); }
}

export async function saveRecurringAction(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    await withTransaction((tx) => saveRecurring(tx, user.id, recurringSchema.parse(formToObject(fd)), id ?? undefined));
    reval();
    return ok("Gasto recurrente guardado.");
  } catch (e) { return toActionError(e); }
}

export async function generateRecurringAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    const period = z.string().regex(/^\d{4}-\d{2}$/, "Mes no válido.").parse(fd.get("period"));
    const r = await withTransaction((tx) => generateRecurring(tx, user.id, period));
    reval();
    return ok(`${period}: ${r.created} gasto(s) generado(s) como «por pagar»${r.skipped ? `; ${r.skipped} ya existía(n) y no se duplicaron` : ""}.`);
  } catch (e) { return toActionError(e); }
}

export async function createMovementAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    const m = await withTransaction((tx) => createMovement(tx, user.id, movementSchema.parse(formToObject(fd))));
    reval();
    return ok(`Movimiento ${m.folio} registrado.`);
  } catch (e) { return toActionError(e); }
}

export async function cancelMovementAction(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    await withTransaction((tx) => cancelMovement(tx, user.id, id, String(fd.get("reason") ?? "")));
    reval();
    return ok("Movimiento cancelado.");
  } catch (e) { return toActionError(e); }
}

export async function createCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("costos.editar");
    await withTransaction((tx) => createCategory(tx, user.id, categorySchema.parse(formToObject(fd))));
    reval();
    return ok("Categoría creada.");
  } catch (e) { return toActionError(e); }
}

export async function toggleCategoryAction(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    const user = await assertPermission("costos.editar");
    await withTransaction((tx) => toggleCategory(tx, user.id, id));
    reval();
    return ok("Categoría actualizada.");
  } catch (e) { return toActionError(e); }
}
