import { z } from "zod";
import type { Prisma, ServiceType, StaffRole } from "@prisma/client";
import { nextFolio, FOLIO } from "../folios";
import { audit } from "../audit";
import { BusinessError } from "../errors";
import { reqText, optText, optDateOnly, money, checkbox } from "../validation";

type Tx = Prisma.TransactionClient;

export const POSITION = { CHOFER: "Chofer", AYUDANTE: "Ayudante", ADMINISTRACION: "Administración", OTRO: "Otro" } as const;
export const PAY_TYPE = { POR_SERVICIO: "Por servicio", SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual", MIXTO: "Mixto (base + servicio)" } as const;

export const workerSchema = z.object({
  fullName: reqText("el nombre completo", 150),
  phone: optText(30),
  position: z.enum(["CHOFER", "AYUDANTE", "ADMINISTRACION", "OTRO"], { errorMap: () => ({ message: "Seleccione el puesto." }) }),
  hireDate: optDateOnly(),
  active: checkbox(),
  baseSalary: money("el sueldo base"),
  payType: z.enum(["POR_SERVICIO", "SEMANAL", "QUINCENAL", "MENSUAL", "MIXTO"], { errorMap: () => ({ message: "Seleccione el tipo de pago." }) }),
  notes: optText(2000),
});
export type WorkerInput = z.infer<typeof workerSchema>;

export async function createWorker(tx: Tx, actorId: string, w: WorkerInput) {
  const worker = await tx.worker.create({
    data: {
      code: (await nextFolio(tx, FOLIO.TRABAJADOR)),
      fullName: w.fullName, phone: w.phone ?? null, position: w.position, hireDate: w.hireDate ?? null,
      active: w.active, baseSalary: w.baseSalary ?? 0, payType: w.payType, notes: w.notes ?? null,
    },
  });
  await audit(tx, { userId: actorId, action: "CREAR", entity: "Trabajador", entityId: worker.id, summary: `${worker.code} ${worker.fullName}`, after: w });
  return worker;
}

export async function updateWorker(tx: Tx, actorId: string, id: string, version: number, w: WorkerInput) {
  const before = await tx.worker.findUniqueOrThrow({ where: { id } });
  const res = await tx.worker.updateMany({
    where: { id, version },
    data: { fullName: w.fullName, phone: w.phone ?? null, position: w.position, hireDate: w.hireDate ?? null, active: w.active, baseSalary: w.baseSalary ?? 0, payType: w.payType, notes: w.notes ?? null, version: { increment: 1 } },
  });
  if (res.count === 0) throw new BusinessError("Otro usuario modificó este registro. Recargue la página.");
  await audit(tx, {
    userId: actorId, action: "EDITAR", entity: "Trabajador", entityId: id, summary: before.code,
    before: { fullName: before.fullName, position: before.position, active: before.active, baseSalary: Number(before.baseSalary), payType: before.payType }, after: w,
  });
}

/** Tarifa vigente por tipo de servicio y rol (configurable en Personal y nómina). 0 si no hay tarifa. */
export async function defaultPay(tx: Tx, serviceType: ServiceType, role: StaffRole, at: Date): Promise<number> {
  const rate = await tx.payRate.findFirst({ where: { serviceType, role, effectiveFrom: { lte: at } }, orderBy: { effectiveFrom: "desc" } });
  return rate ? Number(rate.amount) : 0;
}
