"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { assertPermission } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import {
  addPayrollEntry, advanceSchema, cancelPayrollEntry, cancelPayrollPayment, entrySchema, generateBaseSalary, payRateSchema,
  paySchema, registerAdvance, setPayRate, settlePayroll,
} from "@/lib/domain/payroll";

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
const periodSchema = z.object({ periodType: z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]), ref: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function setPayRateAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("nomina.gestionar");
    await withTransaction((tx) => setPayRate(tx, user.id, payRateSchema.parse(formToObject(fd))));
    revalidatePath("/personal/tarifas");
    return ok("Tarifa guardada. Se aplicará a los servicios que se asignen a partir de su fecha de vigencia.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function addEntryAction(workerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("nomina.gestionar");
    await withTransaction((tx) => addPayrollEntry(tx, user.id, workerId, entrySchema.parse(formToObject(fd))));
    revalidatePath(`/personal/${workerId}`);
    return ok("Concepto registrado.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function generateBaseAction(workerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("nomina.gestionar");
    const p = periodSchema.parse(formToObject(fd));
    await withTransaction((tx) => generateBaseSalary(tx, user.id, workerId, p.periodType, p.ref));
    revalidatePath(`/personal/${workerId}`);
    return ok("Sueldo base del periodo generado.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelEntryAction(entryId: string, workerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("nomina.gestionar");
    await withTransaction((tx) => cancelPayrollEntry(tx, user.id, entryId, String(fd.get("reason") ?? "")));
    revalidatePath(`/personal/${workerId}`);
    return ok("Concepto cancelado.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function registerAdvanceAction(workerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("nomina.gestionar");
    const p = await withTransaction((tx) => registerAdvance(tx, user.id, workerId, advanceSchema.parse(formToObject(fd))));
    revalidatePath(`/personal/${workerId}`);
    return ok(`Anticipo ${p.folio} registrado. Se descontará en el siguiente corte.`);
  } catch (e) {
    return toActionError(e);
  }
}

export async function settleAction(workerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let paymentId: string;
  try {
    const user = await assertPermission("nomina.gestionar");
    const o = formToObject(fd);
    const pay = paySchema.parse(o);
    const period = periodSchema.safeParse(o);
    const entryIds = fd.getAll("entry").map(String);
    const advanceIds = fd.getAll("advance").map(String);
    const p = await withTransaction((tx) =>
      settlePayroll(tx, user.id, workerId, { ...pay, entryIds, advanceIds, ...(period.success ? period.data : {}) }),
    );
    paymentId = p.id;
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/personal/${workerId}`);
  redirect(`/personal/${workerId}?pagado=${paymentId}`);
}

export async function cancelPayrollPaymentAction(paymentId: string, workerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("nomina.gestionar");
    await withTransaction((tx) => cancelPayrollPayment(tx, user.id, paymentId, String(fd.get("reason") ?? "")));
    revalidatePath(`/personal/${workerId}`);
    return ok("Pago cancelado; los conceptos regresaron a «por pagar».");
  } catch (e) {
    return toActionError(e);
  }
}
