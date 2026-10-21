"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, withTransaction } from "@/lib/db";
import { assertPermission } from "@/lib/auth/server";
import { formToObject, toActionError, type ActionState } from "@/lib/actions";
import { BusinessError } from "@/lib/errors";
import { discardFiles, filesFrom, storeFiles, type StoredFile } from "@/lib/attachments";
import { closeSchema, closeService } from "@/lib/domain/closing";
import { cancelExpense, createExpense, expenseSchema } from "@/lib/domain/expenses";

const num = (v: string | undefined) => (v === undefined ? undefined : v.replace(/[$,\s]/g, ""));

export async function closeServiceAction(serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let stored: StoredFile[] = [];
  try {
    const user = await assertPermission("servicios.cerrar");
    const o = formToObject(fd);
    const svc = await prisma.service.findUniqueOrThrow({ where: { id: serviceId }, include: { vehicles: true, staff: true } });
    const vehicles = svc.vehicles.map((v) => ({
      vehicleId: v.vehicleId,
      odometerStart: num(o[`km_start_${v.vehicleId}`]),
      odometerEnd: num(o[`km_end_${v.vehicleId}`]),
      fuelLiters: num(o[`fuel_l_${v.vehicleId}`]),
      fuelAmount: num(o[`fuel_amt_${v.vehicleId}`]),
      acceptGap: o[`gap_${v.vehicleId}`] === "on",
    }));
    const staff = svc.staff.map((s) => ({
      serviceStaffId: s.id,
      participated: o[`part_${s.id}`] === "on",
      agreedPay: Number(num(o[`pay_${s.id}`]) ?? s.agreedPay) || 0,
    }));
    const extras = [1, 2, 3]
      .map((i) => ({ description: o[`extra_desc_${i}`], amount: num(o[`extra_amt_${i}`]) }))
      .filter((x) => x.description || x.amount)
      .map((x) => ({ description: x.description ?? "", amount: Number(x.amount) }));
    const parsed = closeSchema.safeParse({
      actualStart: o.actualStart, actualEnd: o.actualEnd, vehicles, staff, extras,
      tolls: o.tolls, parking: o.parking, perDiem: o.perDiem, expenseMethod: o.expenseMethod,
      incidents: o.incidents, closingNotes: o.closingNotes, deliveryEvidence: o.deliveryEvidence,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const [a, idx, f] = i.path;
        const key =
          a === "vehicles" ? `${f === "odometerStart" ? "km_start" : f === "odometerEnd" ? "km_end" : f === "fuelLiters" ? "fuel_l" : "fuel_amt"}_${svc.vehicles[Number(idx)].vehicleId}`
          : a === "extras" ? `extra_${f === "amount" ? "amt" : "desc"}_${Number(idx) + 1}`
          : String(a);
        fieldErrors[key] ??= i.message;
      }
      return { ok: false, message: "Revise los campos marcados.", fieldErrors, at: Date.now() };
    }
    stored = await storeFiles(filesFrom(fd));
    const version = z.coerce.number().int().parse(o.version);
    await withTransaction(async (tx) => {
      await closeService(tx, user.id, serviceId, version, parsed.data);
      if (stored.length) await tx.attachment.createMany({ data: stored.map((f) => ({ ...f, category: "EVIDENCIA", serviceId, uploadedById: user.id })) });
    });
  } catch (e) {
    await discardFiles(stored);
    return toActionError(e);
  }
  revalidatePath("/servicios");
  revalidatePath("/agenda");
  redirect(`/agenda/${serviceId}?cerrado=1`);
}

export async function addServiceExpenseAction(serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("servicios.cerrar");
    const o = formToObject(fd);
    const svc = await prisma.service.findUniqueOrThrow({ where: { id: serviceId }, include: { vehicles: true } });
    if (svc.status === "CANCELADO") throw new BusinessError("El servicio está cancelado.");
    const e = expenseSchema.parse(o);
    const cat = await prisma.expenseCategory.findUnique({ where: { key: e.categoryKey } });
    if (!cat || cat.group !== "DIRECTO") throw new BusinessError("Seleccione una categoría de gasto directo.");
    const exp = await withTransaction((tx) =>
      createExpense(tx, user.id, e, { serviceId, vehicleId: svc.vehicles[0]?.vehicleId ?? null }, { allowDuplicate: o.confirmDuplicate === "on" }),
    );
    revalidatePath(`/agenda/${serviceId}`);
    return { ok: true, message: `Gasto ${exp.folio} registrado.`, at: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelExpenseAction(expenseId: string, serviceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("finanzas.gastos");
    await withTransaction((tx) => cancelExpense(tx, user.id, expenseId, String(fd.get("cancelReason") ?? "")));
    revalidatePath(`/agenda/${serviceId}`);
    return { ok: true, message: "Gasto cancelado.", at: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}
