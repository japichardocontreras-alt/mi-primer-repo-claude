import { z } from "zod";
import { Prisma, type ServiceStatus, type StaffRole } from "@prisma/client";
import { nextFolio, FOLIO } from "../folios";
import { audit } from "../audit";
import { BusinessError } from "../errors";
import { formatDateTime, mexicoLocalToUtc } from "../format";
import { moneyReq, optText, checkbox } from "../validation";

type Tx = Prisma.TransactionClient;

// ------------------------------------------------------------------ Catálogos

export const SERVICE_STATUS = {
  POR_PROGRAMAR: { label: "Por programar", tone: "neutral" },
  PROGRAMADO: { label: "Programado", tone: "blue" },
  CONFIRMADO: { label: "Confirmado", tone: "violet" },
  EN_PROCESO: { label: "En proceso", tone: "amber" },
  FINALIZADO: { label: "Finalizado", tone: "green" },
  INCIDENCIA: { label: "Incidencia", tone: "red" },
  CANCELADO: { label: "Cancelado", tone: "dark" },
} as const;
export type ServiceStatusKey = keyof typeof SERVICE_STATUS;

/** Transiciones de estado permitidas manualmente en la agenda. FINALIZADO se registra con el cierre operativo (Fase 4). */
export const STATUS_TRANSITIONS: Record<ServiceStatusKey, ServiceStatusKey[]> = {
  POR_PROGRAMAR: ["PROGRAMADO", "CANCELADO"],
  PROGRAMADO: ["CONFIRMADO", "EN_PROCESO", "POR_PROGRAMAR", "CANCELADO"],
  CONFIRMADO: ["EN_PROCESO", "PROGRAMADO", "CANCELADO"],
  EN_PROCESO: ["INCIDENCIA", "CONFIRMADO"],
  INCIDENCIA: ["EN_PROCESO"],
  FINALIZADO: [],
  CANCELADO: [],
};

export const STAFF_ROLE = { CHOFER: "Chofer", AYUDANTE: "Ayudante", OTRO: "Otro" } as const;

// ------------------------------------------------------------------ Esquemas

const localDate = z.string({ required_error: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.");
const localTime = z.string({ required_error: "Indique la hora." }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida.");

export const scheduleSchema = z.object({
  date: localDate,
  time: localTime,
  durationHours: z.preprocess(
    (v) => (v === undefined || v === "" ? undefined : Number(v)),
    z.number({ required_error: "Indique la duración estimada.", invalid_type_error: "Duración no válida." }).min(0.5, "Mínimo 30 minutos.").max(240, "Máximo 240 horas (10 días)."),
  ),
  prepMinutes: z.coerce.number().int().min(0).max(600),
  returnMinutes: z.coerce.number().int().min(0).max(2880),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export function scheduleWindow(s: ScheduleInput) {
  const [y, m, d] = s.date.split("-").map(Number);
  const [h, min] = s.time.split(":").map(Number);
  const start = mexicoLocalToUtc(y, m, d, h, min);
  const end = new Date(start.getTime() + Math.round(s.durationHours * 60) * 60_000);
  return { start, end };
}

export const staffItemSchema = z.object({
  workerId: z.string().uuid(),
  role: z.enum(["CHOFER", "AYUDANTE", "OTRO"]),
  agreedPay: z.number().min(0).max(1_000_000),
});
export type StaffItem = z.infer<typeof staffItemSchema>;

export const assignmentSchema = z.object({
  vehicleIds: z.array(z.string().uuid()).max(5),
  staff: z.array(staffItemSchema).max(30),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const confirmSchema = z.object({
  contractedPrice: moneyReq("el precio contratado"),
  includesVat: checkbox(),
  observations: optText(3000),
});

export const overrideSchema = z.object({
  authorize: checkbox(),
  overrideReason: optText(1000),
});

export const paymentSchema = z.object({
  kind: z.enum(["ANTICIPO", "PARCIAL", "PAGO_FINAL", "REEMBOLSO"], { errorMap: () => ({ message: "Seleccione el tipo de cobro." }) }),
  amount: moneyReq("el importe", 0.01),
  method: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "DEPOSITO", "CHEQUE", "OTRO"], { errorMap: () => ({ message: "Seleccione el método de pago." }) }),
  receivedAt: z.string({ required_error: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Fecha no válida."),
  reference: optText(200),
  notes: optText(1000),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const serviceEditSchema = z.object({
  contractedPrice: moneyReq("el precio contratado"),
  includesVat: checkbox(),
  inventory: optText(5000),
  observations: optText(3000),
});

// ------------------------------------------------------------------ Conflictos

export type Conflict = {
  type: "UNIDAD" | "PERSONAL";
  resourceId: string;
  resourceName: string;
  serviceId: string;
  folio: string;
  start: Date;
  end: Date;
};

export class ConflictError extends BusinessError {
  constructor(public conflicts: Conflict[]) {
    super(
      "Hay empalmes de horario: " +
        conflicts.map((c) => `${c.resourceName} ya está asignado(a) a ${c.folio} (${formatDateTime(c.start)} – ${formatDateTime(c.end)})`).join("; ") +
        ".",
    );
    this.code = "CONFLICT";
  }
}

/**
 * Busca servicios cuyo periodo ocupado se empalma con [start, end).
 * Periodo ocupado de un servicio = (inicio − preparación) → (fin estimado + regreso a base).
 * Al usar instantes completos, los servicios que cruzan medianoche o duran varios días se validan igual.
 */
export async function findConflicts(
  tx: Tx,
  p: { start: Date; end: Date; prepMinutes: number; returnMinutes: number; vehicleIds: string[]; workerIds: string[]; excludeServiceId?: string },
): Promise<Conflict[]> {
  const busyStart = new Date(p.start.getTime() - p.prepMinutes * 60_000);
  const busyEnd = new Date(p.end.getTime() + p.returnMinutes * 60_000);
  const exclude = p.excludeServiceId ?? "00000000-0000-0000-0000-000000000000";
  const out: Conflict[] = [];

  if (p.vehicleIds.length) {
    const rows = await tx.$queryRaw<{ serviceId: string; folio: string; resourceId: string; name: string; start: Date; end: Date }[]>`
      SELECT s."id" AS "serviceId", s."folio", v."id" AS "resourceId", v."name", s."scheduledStart" AS "start", s."estimatedEnd" AS "end"
      FROM "services" s
      JOIN "service_vehicles" sv ON sv."serviceId" = s."id"
      JOIN "vehicles" v ON v."id" = sv."vehicleId"
      WHERE sv."vehicleId" = ANY(${p.vehicleIds}::uuid[])
        AND s."id" <> ${exclude}::uuid
        AND s."status" <> 'CANCELADO'
        AND s."scheduledStart" IS NOT NULL AND s."estimatedEnd" IS NOT NULL
        AND s."scheduledStart" - make_interval(mins => s."prepMinutes") < ${busyEnd}
        AND s."estimatedEnd" + make_interval(mins => s."returnMinutes") > ${busyStart}
      ORDER BY s."scheduledStart"`;
    out.push(...rows.map((r) => ({ type: "UNIDAD" as const, resourceId: r.resourceId, resourceName: r.name, serviceId: r.serviceId, folio: r.folio, start: r.start, end: r.end })));
  }
  if (p.workerIds.length) {
    const rows = await tx.$queryRaw<{ serviceId: string; folio: string; resourceId: string; name: string; start: Date; end: Date }[]>`
      SELECT s."id" AS "serviceId", s."folio", w."id" AS "resourceId", w."fullName" AS "name", s."scheduledStart" AS "start", s."estimatedEnd" AS "end"
      FROM "services" s
      JOIN "service_staff" ss ON ss."serviceId" = s."id"
      JOIN "workers" w ON w."id" = ss."workerId"
      WHERE ss."workerId" = ANY(${p.workerIds}::uuid[])
        AND s."id" <> ${exclude}::uuid
        AND s."status" <> 'CANCELADO'
        AND s."scheduledStart" IS NOT NULL AND s."estimatedEnd" IS NOT NULL
        AND s."scheduledStart" - make_interval(mins => s."prepMinutes") < ${busyEnd}
        AND s."estimatedEnd" + make_interval(mins => s."returnMinutes") > ${busyStart}
      ORDER BY s."scheduledStart"`;
    out.push(...rows.map((r) => ({ type: "PERSONAL" as const, resourceId: r.resourceId, resourceName: r.name, serviceId: r.serviceId, folio: r.folio, start: r.start, end: r.end })));
  }
  return out;
}

/** Bloquea filas de unidades y trabajadores (en orden fijo para evitar interbloqueos). */
async function lockResources(tx: Tx, vehicleIds: string[], workerIds: string[]) {
  if (vehicleIds.length) await tx.$queryRaw`SELECT "id" FROM "vehicles" WHERE "id" = ANY(${[...vehicleIds].sort()}::uuid[]) ORDER BY "id" FOR UPDATE`;
  if (workerIds.length) await tx.$queryRaw`SELECT "id" FROM "workers" WHERE "id" = ANY(${[...workerIds].sort()}::uuid[]) ORDER BY "id" FOR UPDATE`;
}

async function lockService(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "services" WHERE "id" = ${id}::uuid FOR UPDATE`;
  if (!rows.length) throw new BusinessError("El servicio no existe.");
  return tx.service.findUniqueOrThrow({ where: { id }, include: { vehicles: true, staff: { include: { payrollEntry: true } } } });
}

export type Actor = { id: string; name: string; canOverride: boolean };
export type OverrideInput = { authorize: boolean; overrideReason?: string };

/** Valida empalmes; si los hay, exige autorización excepcional del administrador y la registra. */
async function checkConflicts(
  tx: Tx,
  actor: Actor,
  serviceId: string | null,
  window: { start: Date; end: Date; prepMinutes: number; returnMinutes: number },
  vehicleIds: string[],
  workerIds: string[],
  override: OverrideInput | undefined,
) {
  await lockResources(tx, vehicleIds, workerIds);
  const conflicts = await findConflicts(tx, { ...window, vehicleIds, workerIds, excludeServiceId: serviceId ?? undefined });
  if (!conflicts.length) return [];
  if (!override?.authorize) throw new ConflictError(conflicts);
  if (!actor.canOverride) throw new BusinessError("Hay empalmes de horario y su usuario no puede autorizarlos. Solicite la autorización a un administrador.");
  if (!override.overrideReason || override.overrideReason.length < 5) {
    const e = new ConflictError(conflicts);
    e.message = "Para autorizar el empalme indique el motivo (mínimo 5 caracteres).";
    throw e;
  }
  return conflicts;
}

async function recordOverrides(tx: Tx, actor: Actor, serviceId: string, folio: string, conflicts: Conflict[], reason: string) {
  await tx.conflictOverride.createMany({
    data: conflicts.map((c) => ({ serviceId, type: c.type, resourceId: c.resourceId, conflictingServiceId: c.serviceId, reason, authorizedById: actor.id })),
  });
  await audit(tx, {
    userId: actor.id, action: "OVERRIDE_EMPALME", entity: "Servicio", entityId: serviceId,
    summary: `${folio}: empalme autorizado (${conflicts.map((c) => `${c.resourceName} con ${c.folio}`).join(", ")}) — ${reason}`,
    after: conflicts.map((c) => ({ tipo: c.type, recurso: c.resourceName, servicio: c.folio })),
  });
}

async function validateResources(tx: Tx, a: AssignmentInput) {
  const vIds = [...new Set(a.vehicleIds)];
  const wIds = a.staff.map((s) => s.workerId);
  if (new Set(wIds).size !== wIds.length) throw new BusinessError("Un trabajador aparece más de una vez en la asignación.");
  if (vIds.length) {
    const vs = await tx.vehicle.findMany({ where: { id: { in: vIds } } });
    if (vs.length !== vIds.length) throw new BusinessError("Alguna unidad seleccionada no existe.");
    const bad = vs.find((v) => !v.active || v.status !== "ACTIVA");
    if (bad) throw new BusinessError(`La unidad ${bad.name} no está disponible (estado: ${bad.status.replace(/_/g, " ").toLowerCase()}).`);
  }
  if (wIds.length) {
    const ws = await tx.worker.findMany({ where: { id: { in: wIds } } });
    if (ws.length !== wIds.length) throw new BusinessError("Algún trabajador seleccionado no existe.");
    const bad = ws.find((w) => !w.active);
    if (bad) throw new BusinessError(`${bad.fullName} está dado(a) de baja.`);
  }
  return { vIds, wIds };
}

function snapshot(s: { scheduledStart: Date | null; estimatedEnd: Date | null; prepMinutes: number; returnMinutes: number }, vehicleIds: string[], staff: { workerId: string; role: StaffRole; agreedPay: unknown }[]) {
  return {
    inicio: s.scheduledStart?.toISOString() ?? null,
    finEstimado: s.estimatedEnd?.toISOString() ?? null,
    preparacionMin: s.prepMinutes,
    regresoMin: s.returnMinutes,
    unidades: [...vehicleIds].sort(),
    personal: [...staff].map((x) => ({ trabajador: x.workerId, rol: x.role, pago: Number(x.agreedPay) })).sort((a, b) => a.trabajador.localeCompare(b.trabajador)),
  };
}

/** Sustituye unidades y personal del servicio (conserva pagos ya generados). */
async function applyAssignment(tx: Tx, serviceId: string, current: { vehicles: { vehicleId: string }[]; staff: { id: string; workerId: string; payrollEntry: unknown }[] }, a: AssignmentInput) {
  const keepV = new Set(a.vehicleIds);
  const removeV = current.vehicles.filter((v) => !keepV.has(v.vehicleId)).map((v) => v.vehicleId);
  if (removeV.length) await tx.serviceVehicle.deleteMany({ where: { serviceId, vehicleId: { in: removeV } } });
  const haveV = new Set(current.vehicles.map((v) => v.vehicleId));
  const addV = a.vehicleIds.filter((id) => !haveV.has(id));
  if (addV.length) await tx.serviceVehicle.createMany({ data: addV.map((vehicleId, i) => ({ serviceId, vehicleId, isPrimary: i === 0 && haveV.size === 0 })) });

  const keepW = new Map(a.staff.map((s) => [s.workerId, s]));
  for (const cur of current.staff) {
    const next = keepW.get(cur.workerId);
    if (!next) {
      if (cur.payrollEntry) throw new BusinessError("No se puede quitar a un trabajador cuyo pago por este servicio ya fue generado en nómina.");
      await tx.serviceStaff.delete({ where: { id: cur.id } });
    } else {
      await tx.serviceStaff.update({ where: { id: cur.id }, data: { role: next.role, agreedPay: next.agreedPay } });
    }
  }
  const haveW = new Set(current.staff.map((s) => s.workerId));
  const addW = a.staff.filter((s) => !haveW.has(s.workerId));
  if (addW.length) await tx.serviceStaff.createMany({ data: addW.map((s) => ({ serviceId, workerId: s.workerId, role: s.role, agreedPay: s.agreedPay })) });
}

// ------------------------------------------------------------------ Operaciones

/**
 * Confirma una solicitud y la convierte en servicio programado (una sola vez).
 * Conserva la información original vinculando la solicitud y sus direcciones (no se copian).
 */
export async function confirmRequest(
  tx: Tx,
  actor: Actor,
  requestId: string,
  input: { confirm: z.infer<typeof confirmSchema>; schedule?: ScheduleInput; assignment: AssignmentInput; override?: OverrideInput },
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "requests" WHERE "id" = ${requestId}::uuid FOR UPDATE`;
  if (!rows.length) throw new BusinessError("La solicitud no existe.");
  const req = await tx.request.findUniqueOrThrow({ where: { id: requestId }, include: { service: true, client: true } });
  if (req.service) throw new BusinessError(`Esta solicitud ya fue convertida en el servicio ${req.service.folio}.`);
  if (req.status === "CANCELADA" || req.status === "NO_CONCRETADA") throw new BusinessError("La solicitud está cerrada. Reábrala antes de confirmarla.");
  if (!req.client.active) throw new BusinessError("El cliente está desactivado.");

  const { vIds, wIds } = await validateResources(tx, input.assignment);
  if ((vIds.length || wIds.length) && !input.schedule) throw new BusinessError("Para asignar unidad o personal, indique primero la fecha y hora del servicio.");
  const win = input.schedule ? scheduleWindow(input.schedule) : null;
  let conflicts: Conflict[] = [];
  if (win && input.schedule) {
    conflicts = await checkConflicts(tx, actor, null, { ...win, prepMinutes: input.schedule.prepMinutes, returnMinutes: input.schedule.returnMinutes }, vIds, wIds, input.override);
  }

  const service = await tx.service.create({
    data: {
      folio: await nextFolio(tx, FOLIO.SERVICIO),
      requestId,
      clientId: req.clientId,
      status: win ? "PROGRAMADO" : "POR_PROGRAMAR",
      serviceType: req.serviceType,
      package: req.package,
      scheduledStart: win?.start ?? null,
      estimatedEnd: win?.end ?? null,
      prepMinutes: input.schedule?.prepMinutes ?? 30,
      returnMinutes: input.schedule?.returnMinutes ?? 60,
      originAddressId: req.originAddressId,
      destinationAddressId: req.destinationAddressId,
      contractedPrice: input.confirm.contractedPrice,
      includesVat: input.confirm.includesVat,
      inventory: [req.inventorySummary, req.itemsDescription].filter(Boolean).join("\n\n") || null,
      observations: [req.observations, req.specialManeuvers ? `Maniobras: ${req.specialManeuvers}` : null, input.confirm.observations].filter(Boolean).join("\n") || null,
      createdById: actor.id,
    },
  });
  await applyAssignment(tx, service.id, { vehicles: [], staff: [] }, input.assignment);
  if (conflicts.length) await recordOverrides(tx, actor, service.id, service.folio, conflicts, input.override!.overrideReason!);

  await tx.request.update({ where: { id: requestId }, data: { status: "CONFIRMADA", nextContactAt: null, version: { increment: 1 } } });
  await tx.requestEvent.create({
    data: { requestId, type: "CONVERSION", fromStatus: req.status, toStatus: "CONFIRMADA", createdById: actor.id, data: { servicio: service.folio, servicioId: service.id, precio: input.confirm.contractedPrice } },
  });
  await audit(tx, {
    userId: actor.id, action: "CONFIRMAR", entity: "Servicio", entityId: service.id,
    summary: `${req.folio} → ${service.folio}`, after: { precio: input.confirm.contractedPrice, inicio: win?.start, fin: win?.end, unidades: vIds, personal: input.assignment.staff },
  });
  await tx.notification.create({ data: { type: "SERVICIO", title: `Servicio ${service.folio} confirmado`, body: `${req.client.name}${win ? ` · ${formatDateTime(win.start)}` : " · por programar"}`, link: `/agenda/${service.id}` } });
  return service;
}

/** Programa / reprograma fecha y hora y asigna unidades y personal, con historial y validación de empalmes. */
export async function scheduleService(
  tx: Tx,
  actor: Actor,
  serviceId: string,
  input: { version: number; schedule: ScheduleInput; assignment: AssignmentInput; reason?: string; override?: OverrideInput },
) {
  const svc = await lockService(tx, serviceId);
  if (svc.version !== input.version) throw new BusinessError("Otro usuario modificó este servicio. Recargue la página para ver los cambios.");
  if (svc.status === "FINALIZADO" || svc.status === "CANCELADO") throw new BusinessError(`El servicio está ${SERVICE_STATUS[svc.status].label.toLowerCase()} y no puede reprogramarse.`);

  const { vIds, wIds } = await validateResources(tx, input.assignment);
  const win = scheduleWindow(input.schedule);
  const conflicts = await checkConflicts(tx, actor, serviceId, { ...win, prepMinutes: input.schedule.prepMinutes, returnMinutes: input.schedule.returnMinutes }, vIds, wIds, input.override);

  const before = snapshot(svc, svc.vehicles.map((v) => v.vehicleId), svc.staff);
  const afterSvc = { scheduledStart: win.start, estimatedEnd: win.end, prepMinutes: input.schedule.prepMinutes, returnMinutes: input.schedule.returnMinutes };
  const after = snapshot(afterSvc, vIds, input.assignment.staff);
  if (JSON.stringify(before) === JSON.stringify(after)) return { changed: false };

  await applyAssignment(tx, serviceId, svc, input.assignment);
  const wasScheduled = !!svc.scheduledStart;
  await tx.service.update({
    where: { id: serviceId },
    data: { ...afterSvc, status: svc.status === "POR_PROGRAMAR" ? "PROGRAMADO" : svc.status, version: { increment: 1 } },
  });
  // Un cambio de fecha/hora sobre un servicio ya programado es una reprogramación: se guarda el antes y el después.
  await tx.serviceReschedule.create({ data: { serviceId, before, after, reason: input.reason ?? (wasScheduled ? null : "Programación inicial"), createdById: actor.id } });
  if (conflicts.length) await recordOverrides(tx, actor, serviceId, svc.folio, conflicts, input.override!.overrideReason!);
  await audit(tx, { userId: actor.id, action: wasScheduled ? "REPROGRAMAR" : "PROGRAMAR", entity: "Servicio", entityId: serviceId, summary: svc.folio, before, after });
  return { changed: true };
}

export async function changeServiceStatus(tx: Tx, actorId: string, serviceId: string, version: number, to: ServiceStatusKey, reason?: string) {
  const svc = await lockService(tx, serviceId);
  if (svc.version !== version) throw new BusinessError("Otro usuario modificó este servicio. Recargue la página.");
  const allowed = STATUS_TRANSITIONS[svc.status];
  if (!allowed.includes(to)) throw new BusinessError(`No se puede pasar de «${SERVICE_STATUS[svc.status].label}» a «${SERVICE_STATUS[to].label}».`);
  if ((to === "PROGRAMADO" || to === "CONFIRMADO" || to === "EN_PROCESO") && !svc.scheduledStart) throw new BusinessError("Primero programe la fecha y hora del servicio.");
  if (to === "CANCELADO" && (!reason || reason.length < 3)) throw new BusinessError("Indique el motivo de la cancelación.");
  if (to === "INCIDENCIA" && (!reason || reason.length < 3)) throw new BusinessError("Describa la incidencia.");
  await tx.service.update({
    where: { id: serviceId },
    data: {
      status: to as ServiceStatus,
      ...(to === "CANCELADO" ? { cancelReason: reason, cancelledAt: new Date() } : {}),
      ...(to === "INCIDENCIA" ? { incidents: [svc.incidents, reason].filter(Boolean).join("\n") } : {}),
      ...(to === "EN_PROCESO" && !svc.actualStart ? { actualStart: new Date() } : {}),
      version: { increment: 1 },
    },
  });
  await audit(tx, { userId: actorId, action: "CAMBIO_ESTADO", entity: "Servicio", entityId: serviceId, summary: `${svc.folio}: ${svc.status} → ${to}`, before: { status: svc.status }, after: { status: to, motivo: reason } });
}

export async function updateServiceData(tx: Tx, actorId: string, serviceId: string, version: number, d: z.infer<typeof serviceEditSchema>) {
  const svc = await lockService(tx, serviceId);
  if (svc.version !== version) throw new BusinessError("Otro usuario modificó este servicio. Recargue la página.");
  if (svc.status === "CANCELADO") throw new BusinessError("El servicio está cancelado.");
  await tx.service.update({ where: { id: serviceId }, data: { contractedPrice: d.contractedPrice, includesVat: d.includesVat, inventory: d.inventory ?? null, observations: d.observations ?? null, version: { increment: 1 } } });
  await refreshCollectionStatus(tx, serviceId);
  await audit(tx, {
    userId: actorId, action: "EDITAR", entity: "Servicio", entityId: serviceId, summary: svc.folio,
    before: { precio: Number(svc.contractedPrice), iva: svc.includesVat, observaciones: svc.observations }, after: { precio: d.contractedPrice, iva: d.includesVat, observaciones: d.observations },
  });
}

// ------------------------------------------------------------------ Cobros

export async function paymentTotals(tx: Tx, serviceId: string) {
  const ps = await tx.payment.findMany({ where: { serviceId, cancelledAt: null } });
  let anticipos = 0, cobrado = 0;
  for (const p of ps) {
    const a = Number(p.amount);
    if (p.kind === "REEMBOLSO") cobrado -= a;
    else {
      cobrado += a;
      if (p.kind === "ANTICIPO") anticipos += a;
    }
  }
  return { anticipos: round(anticipos), cobrado: round(cobrado) };
}
const round = (n: number) => Math.round(n * 100) / 100;

export async function refreshCollectionStatus(tx: Tx, serviceId: string) {
  const svc = await tx.service.findUniqueOrThrow({ where: { id: serviceId } });
  const { cobrado } = await paymentTotals(tx, serviceId);
  const price = Number(svc.contractedPrice);
  const status = cobrado <= 0 ? "PENDIENTE" : cobrado + 0.005 >= price ? "LIQUIDADO" : "PARCIAL";
  await tx.service.update({ where: { id: serviceId }, data: { collectionStatus: status, financialClosedAt: status === "LIQUIDADO" ? svc.financialClosedAt ?? new Date() : null } });
  return status;
}

/** Registra un cobro (anticipo, parcial, pago final o reembolso) ligado al servicio. */
export async function registerPayment(tx: Tx, actorId: string, serviceId: string, p: PaymentInput) {
  const svc = await lockService(tx, serviceId);
  if (svc.status === "CANCELADO" && p.kind !== "REEMBOLSO") throw new BusinessError("El servicio está cancelado; solo pueden registrarse reembolsos.");
  const { cobrado } = await paymentTotals(tx, serviceId);
  const saldo = round(Number(svc.contractedPrice) - cobrado);
  if (p.kind === "REEMBOLSO" && p.amount > cobrado + 0.005) throw new BusinessError(`El reembolso no puede ser mayor a lo cobrado (${cobrado.toFixed(2)}).`);
  if (p.kind !== "REEMBOLSO" && p.amount > saldo + 0.005) {
    throw new BusinessError(`El importe excede el saldo pendiente (${saldo.toFixed(2)}). Si el precio cambió, actualice primero el precio contratado.`);
  }
  const [d, t] = p.receivedAt.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  const pay = await tx.payment.create({
    data: {
      folio: await nextFolio(tx, FOLIO.COBRO), serviceId, kind: p.kind, amount: p.amount, method: p.method,
      receivedAt: mexicoLocalToUtc(y, m, day, h, min), reference: p.reference ?? null, notes: p.notes ?? null, createdById: actorId,
    },
  });
  const status = await refreshCollectionStatus(tx, serviceId);
  await audit(tx, { userId: actorId, action: "COBRO", entity: "Servicio", entityId: serviceId, summary: `${svc.folio} ${pay.folio}: ${p.kind} ${p.amount}`, after: { ...p, estadoCobro: status } });
  return pay;
}

export async function cancelPayment(tx: Tx, actorId: string, paymentId: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new BusinessError("Indique el motivo de la cancelación del cobro.");
  const pay = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (pay.cancelledAt) throw new BusinessError("El cobro ya estaba cancelado.");
  await lockService(tx, pay.serviceId);
  await tx.payment.update({ where: { id: paymentId }, data: { cancelledAt: new Date(), cancelReason: reason.trim() } });
  await refreshCollectionStatus(tx, pay.serviceId);
  await audit(tx, { userId: actorId, action: "CANCELAR_COBRO", entity: "Servicio", entityId: pay.serviceId, summary: `${pay.folio}: ${reason}` });
}

// ------------------------------------------------------------------ Consultas

export const serviceInclude = {
  client: true,
  vehicles: { include: { vehicle: true } },
  staff: { include: { worker: true } },
  originAddress: true,
  destinationAddress: true,
} satisfies Prisma.ServiceInclude;
