import { z } from "zod";
import type { MovementType, Prisma } from "@prisma/client";
import { nextFolio, FOLIO } from "../folios";
import { audit } from "../audit";
import { BusinessError } from "../errors";
import { getSetting } from "../settings";
import { checkbox, money, moneyReq, optText, reqText, uuidOpt } from "../validation";
import { createExpense, expenseSchema, DuplicateExpenseError } from "./expenses";

type Tx = Prisma.TransactionClient;

export const MOVEMENT_TYPE: Record<MovementType, { label: string; direction: "ENTRADA" | "SALIDA"; hint: string }> = {
  PRESTAMO_RECIBIDO: { label: "Préstamo recibido", direction: "ENTRADA", hint: "Entra efectivo; no es venta. Genera una deuda." },
  APORTACION_CAPITAL: { label: "Aportación de capital", direction: "ENTRADA", hint: "Dinero de los socios; no es venta." },
  INGRESO_EXTRAORDINARIO: { label: "Ingreso extraordinario", direction: "ENTRADA", hint: "Ingreso fuera de la operación (p. ej. venta de un activo)." },
  COMPRA_ACTIVO: { label: "Compra de activo", direction: "SALIDA", hint: "Sale efectivo; no es gasto operativo. Se reconoce vía depreciación." },
  PAGO_FINANCIAMIENTO: { label: "Pago de financiamiento", direction: "SALIDA", hint: "Abono a capital (no es gasto) + intereses (gasto financiero)." },
  GASTO_EXTRAORDINARIO: { label: "Gasto extraordinario", direction: "SALIDA", hint: "Gasto fuera de la operación ordinaria." },
  RETIRO_SOCIOS: { label: "Retiro de socios", direction: "SALIDA", hint: "Sale efectivo a los socios; no es gasto." },
};

// ------------------------------------------------------------------ Gastos generales

export const generalExpenseSchema = expenseSchema.and(
  z.object({
    serviceFolio: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined), z.string().regex(/^MM-\d{4}-\d{6}$/, "Folio de servicio no válido (MM-AAAA-000000).").optional()),
    vehicleId: uuidOpt(),
  }),
);

/** Gasto capturado en Finanzas: puede ligarse a un servicio (por folio) y/o a una unidad. Detecta duplicados. */
export async function createGeneralExpense(tx: Tx, actorId: string, e: z.infer<typeof generalExpenseSchema>, opts: { allowDuplicate?: boolean } = {}) {
  let serviceId: string | null = null;
  if (e.serviceFolio) {
    const s = await tx.service.findUnique({ where: { folio: e.serviceFolio } });
    if (!s) throw new BusinessError(`No existe el servicio ${e.serviceFolio}.`);
    if (s.status === "CANCELADO") throw new BusinessError(`El servicio ${e.serviceFolio} está cancelado.`);
    serviceId = s.id;
  }
  if (!serviceId && !opts.allowDuplicate) {
    const cat = await tx.expenseCategory.findUnique({ where: { key: e.categoryKey } });
    const dup = cat && (await tx.expense.findFirst({ where: { categoryId: cat.id, total: e.total, date: new Date(`${e.date}T00:00:00.000Z`), cancelledAt: null, serviceId: null, ...(e.supplier ? { supplier: e.supplier } : {}) } }));
    if (dup) throw new DuplicateExpenseError(dup.folio);
  }
  return createExpense(tx, actorId, e, { serviceId, vehicleId: e.vehicleId ?? null }, opts);
}

export async function markExpensePaid(tx: Tx, actorId: string, expenseId: string, paidAt: string, method?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) throw new BusinessError("Fecha de pago no válida.");
  const e = await tx.expense.findUniqueOrThrow({ where: { id: expenseId } });
  if (e.cancelledAt) throw new BusinessError("El gasto está cancelado.");
  if (e.paidAt) throw new BusinessError("El gasto ya estaba marcado como pagado.");
  await tx.expense.update({ where: { id: expenseId }, data: { paidAt: new Date(`${paidAt}T00:00:00.000Z`), ...(method ? { method: method as never } : {}) } });
  await audit(tx, { userId: actorId, action: "GASTO_PAGADO", entity: "Gasto", entityId: expenseId, summary: `${e.folio} pagado ${paidAt}` });
}

// ------------------------------------------------------------------ Gastos recurrentes

export const recurringSchema = z.object({
  categoryKey: reqText("la categoría", 60),
  description: reqText("la descripción", 200),
  amount: moneyReq("el importe", 0.01),
  includesVat: checkbox(),
  dayOfMonth: z.coerce.number({ invalid_type_error: "Día no válido." }).int().min(1, "Entre 1 y 28.").max(28, "Entre 1 y 28 (para que exista en todos los meses)."),
  startDate: z.string({ required_error: "Indique desde cuándo aplica." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida."),
  endDate: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.").optional()),
  active: checkbox(),
});

export async function saveRecurring(tx: Tx, actorId: string, r: z.infer<typeof recurringSchema>, id?: string) {
  const cat = await tx.expenseCategory.findUnique({ where: { key: r.categoryKey } });
  if (!cat || !cat.active) throw new BusinessError("Categoría no válida.");
  if (r.endDate && r.endDate < r.startDate) throw new BusinessError("La fecha final debe ser posterior a la inicial.");
  const data = {
    categoryId: cat.id, description: r.description, amount: r.amount, includesVat: r.includesVat, dayOfMonth: r.dayOfMonth,
    startDate: new Date(`${r.startDate}T00:00:00.000Z`), endDate: r.endDate ? new Date(`${r.endDate}T00:00:00.000Z`) : null, active: r.active,
  };
  const rec = id ? await tx.recurringExpense.update({ where: { id }, data }) : await tx.recurringExpense.create({ data });
  await audit(tx, { userId: actorId, action: id ? "EDITAR" : "CREAR", entity: "GastoRecurrente", entityId: rec.id, summary: `${r.description}: ${r.amount}`, after: r });
  return rec;
}

/**
 * Genera los gastos recurrentes de un mes ("AAAA-MM") como gastos POR PAGAR.
 * No duplica: bloquea las plantillas y además UNIQUE(recurringId, recurringPeriod) lo impide en la base de datos.
 */
export async function generateRecurring(tx: Tx, actorId: string, period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new BusinessError("Periodo no válido.");
  const [y, m] = period.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  await tx.$queryRaw`SELECT "id" FROM "recurring_expenses" WHERE "active" = true ORDER BY "id" FOR UPDATE`;
  const templates = await tx.recurringExpense.findMany({
    where: { active: true, startDate: { lte: last }, OR: [{ endDate: null }, { endDate: { gte: first } }] },
    include: { category: true },
  });
  const { tasaIva } = await getSetting(tx, "finanzas");
  let created = 0, skipped = 0;
  for (const t of templates) {
    if (await tx.expense.findFirst({ where: { recurringId: t.id, recurringPeriod: period } })) { skipped++; continue; }
    const total = Number(t.amount);
    const vat = t.includesVat ? Math.round((total - total / (1 + tasaIva)) * 100) / 100 : 0;
    const e = await createExpense(tx, actorId, {
      categoryKey: t.category.key, date: `${period}-${String(t.dayOfMonth).padStart(2, "0")}`, total, vatAmount: vat, description: `${t.description} (${period})`, paid: false,
    }, {}, { allowDuplicate: true });
    await tx.expense.update({ where: { id: e.id }, data: { recurringId: t.id, recurringPeriod: period } });
    created++;
  }
  await audit(tx, { userId: actorId, action: "GENERAR_RECURRENTES", entity: "Gasto", summary: `${period}: ${created} generado(s), ${skipped} ya existían` });
  return { created, skipped };
}

// ------------------------------------------------------------------ Otros movimientos

export const movementSchema = z
  .object({
    type: z.enum(["PRESTAMO_RECIBIDO", "APORTACION_CAPITAL", "COMPRA_ACTIVO", "PAGO_FINANCIAMIENTO", "INGRESO_EXTRAORDINARIO", "GASTO_EXTRAORDINARIO", "RETIRO_SOCIOS"], { errorMap: () => ({ message: "Seleccione el tipo." }) }),
    date: z.string({ required_error: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida."),
    amount: moneyReq("el importe", 0.01),
    interestPortion: money("los intereses"),
    description: reqText("la descripción", 300),
    reference: optText(150),
    vehicleId: uuidOpt(),
  })
  .superRefine((v, ctx) => {
    if (v.interestPortion && v.type !== "PAGO_FINANCIAMIENTO") ctx.addIssue({ code: "custom", path: ["interestPortion"], message: "Solo aplica a pagos de financiamiento." });
    if (v.interestPortion && v.interestPortion > v.amount) ctx.addIssue({ code: "custom", path: ["interestPortion"], message: "Los intereses no pueden exceder el pago." });
  });

export async function createMovement(tx: Tx, actorId: string, m: z.infer<typeof movementSchema>) {
  const date = new Date(`${m.date}T00:00:00.000Z`);
  const mv = await tx.financialMovement.create({
    data: {
      folio: await nextFolio(tx, FOLIO.MOVIMIENTO, date), type: m.type, date, amount: m.amount, interestPortion: m.interestPortion ?? null,
      description: m.description, reference: m.reference ?? null, vehicleId: m.vehicleId ?? null, createdById: actorId,
    },
  });
  await audit(tx, { userId: actorId, action: "MOVIMIENTO", entity: "Movimiento", entityId: mv.id, summary: `${mv.folio} ${MOVEMENT_TYPE[m.type].label}: ${m.amount}`, after: m });
  return mv;
}

export async function cancelMovement(tx: Tx, actorId: string, id: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new BusinessError("Indique el motivo.");
  const mv = await tx.financialMovement.findUniqueOrThrow({ where: { id } });
  if (mv.cancelledAt) throw new BusinessError("El movimiento ya estaba cancelado.");
  await tx.financialMovement.update({ where: { id }, data: { cancelledAt: new Date() } });
  await audit(tx, { userId: actorId, action: "CANCELAR_MOVIMIENTO", entity: "Movimiento", entityId: id, summary: `${mv.folio}: ${reason}` });
}

// ------------------------------------------------------------------ Categorías

export const categorySchema = z.object({
  name: reqText("el nombre", 80),
  group: z.enum(["DIRECTO", "FIJO", "FLOTILLA", "EXTRAORDINARIO"], { errorMap: () => ({ message: "Seleccione el grupo." }) }),
});

export async function createCategory(tx: Tx, actorId: string, c: z.infer<typeof categorySchema>) {
  const key = c.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50);
  if (!key) throw new BusinessError("Nombre no válido.");
  if (await tx.expenseCategory.findUnique({ where: { key } })) throw new BusinessError("Ya existe una categoría con ese nombre.");
  const cat = await tx.expenseCategory.create({ data: { key, name: c.name, group: c.group } });
  await audit(tx, { userId: actorId, action: "CREAR", entity: "Categoria", entityId: cat.id, summary: `${c.name} (${c.group})` });
  return cat;
}

export async function toggleCategory(tx: Tx, actorId: string, id: string) {
  const c = await tx.expenseCategory.findUniqueOrThrow({ where: { id } });
  if (c.isSystem && c.active) {
    if (["COMBUSTIBLE", "CASETAS", "ESTACIONAMIENTOS", "VIATICOS", "OTROS_DIRECTOS", "MANTENIMIENTO", "DOCUMENTACION_VEHICULAR", "SEGUROS", "COMBUSTIBLE_UNIDAD"].includes(c.key)) {
      throw new BusinessError(`«${c.name}» la usa el sistema automáticamente (cierres y flotilla); no puede desactivarse.`);
    }
  }
  await tx.expenseCategory.update({ where: { id }, data: { active: !c.active } });
  await audit(tx, { userId: actorId, action: c.active ? "DESACTIVAR" : "REACTIVAR", entity: "Categoria", entityId: id, summary: c.name });
}
