import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { nextFolio, FOLIO } from "../folios";
import { audit } from "../audit";
import { BusinessError } from "../errors";
import { moneyReq, money, optText, reqText } from "../validation";

type Tx = Prisma.TransactionClient;

export const PAYMENT_METHOD = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta", DEPOSITO: "Depósito", CHEQUE: "Cheque", OTRO: "Otro" } as const;

export const expenseSchema = z.object({
  categoryKey: reqText("la categoría", 60),
  date: z.string({ required_error: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida."),
  total: moneyReq("el importe", 0.01),
  vatAmount: money("el IVA"),
  description: reqText("la descripción", 300),
  supplier: optText(150),
  method: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "CHEQUE", "OTRO"]).optional()),
  reference: optText(150),
  paid: z.preprocess((v) => v === undefined ? true : v === true || v === "on" || v === "true", z.boolean()),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export class DuplicateExpenseError extends BusinessError {
  constructor(folio: string) {
    super(`Ya existe un gasto igual (${folio}): misma categoría, importe y fecha en este servicio. Si realmente es otro gasto, confirme y guarde de nuevo.`);
    this.code = "DUPLICATE_EXPENSE";
  }
}

/**
 * Registra un gasto. El importe vive SOLO aquí (combustible, mantenimiento, etc. se ligan a este registro),
 * para que los resultados nunca lo cuenten dos veces.
 */
export async function createExpense(
  tx: Tx,
  actorId: string,
  e: ExpenseInput,
  links: { serviceId?: string | null; vehicleId?: string | null },
  opts: { allowDuplicate?: boolean } = {},
) {
  const category = await tx.expenseCategory.findUnique({ where: { key: e.categoryKey } });
  if (!category || !category.active) throw new BusinessError("Categoría de gasto no válida.");
  const vat = e.vatAmount ?? 0;
  if (vat > e.total) throw new BusinessError("El IVA no puede ser mayor al total.");
  const date = new Date(`${e.date}T00:00:00.000Z`);
  if (links.serviceId && !opts.allowDuplicate) {
    const dup = await tx.expense.findFirst({ where: { serviceId: links.serviceId, categoryId: category.id, total: e.total, date, cancelledAt: null } });
    if (dup) throw new DuplicateExpenseError(dup.folio);
  }
  const subtotal = Math.round((e.total - vat) * 100) / 100;
  const expense = await tx.expense.create({
    data: {
      folio: await nextFolio(tx, FOLIO.GASTO, date),
      categoryId: category.id, serviceId: links.serviceId ?? null, vehicleId: links.vehicleId ?? null,
      date, paidAt: e.paid ? date : null, subtotal, vatAmount: vat, total: e.total,
      supplier: e.supplier ?? null, description: e.description, method: e.method ?? null, reference: e.reference ?? null, createdById: actorId,
    },
  });
  await audit(tx, { userId: actorId, action: "GASTO", entity: links.serviceId ? "Servicio" : "Gasto", entityId: links.serviceId ?? expense.id, summary: `${expense.folio} ${category.name}: ${e.total}`, after: { ...e, ...links } });
  return expense;
}

export async function cancelExpense(tx: Tx, actorId: string, expenseId: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new BusinessError("Indique el motivo de la cancelación del gasto.");
  const e = await tx.expense.findUniqueOrThrow({ where: { id: expenseId } });
  if (e.cancelledAt) throw new BusinessError("El gasto ya estaba cancelado.");
  await tx.expense.update({ where: { id: expenseId }, data: { cancelledAt: new Date(), cancelReason: reason.trim() } });
  await audit(tx, { userId: actorId, action: "CANCELAR_GASTO", entity: e.serviceId ? "Servicio" : "Gasto", entityId: e.serviceId ?? e.id, summary: `${e.folio}: ${reason}` });
}
