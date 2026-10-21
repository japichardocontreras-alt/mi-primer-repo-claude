import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, ClipboardList, FileText, Film, Image as ImageIcon, Paperclip, AlertTriangle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { SERVICE_STATUS, STAFF_ROLE, STATUS_TRANSITIONS, paymentTotals, type ServiceStatusKey } from "@/lib/domain/services";
import { PACKAGE, SERVICE_TYPE, fullAddress } from "@/lib/domain/labels";
import { formatDateTime, formatMXN, mexicoParts } from "@/lib/format";
import { crewOptions } from "@/lib/queries/crew";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { ScheduleFields } from "@/components/forms/schedule-fields";
import { CrewPicker } from "@/components/forms/crew-picker";
import { ConflictPanel } from "@/components/forms/conflict-panel";
import { ServiceStatusForm } from "@/components/forms/service-status-form";
import { cancelPaymentAction, changeStatusAction, registerPaymentAction, scheduleServiceAction, updateServiceAction, uploadServiceFilesAction } from "../actions";
import { removeAttachmentAction } from "@/app/(erp)/solicitudes/actions";
import { addServiceExpenseAction, cancelExpenseAction } from "@/app/(erp)/servicios/actions";
import { serviceEconomics } from "@/lib/domain/closing";
import { PAYMENT_METHOD } from "@/lib/domain/expenses";
import { formatDateOnly, formatNumber } from "@/lib/format";
import { DuplicateExpenseConfirm } from "@/components/forms/duplicate-expense-confirm";

export const metadata = { title: "Servicio" };

const KIND = { ANTICIPO: "Anticipo", PARCIAL: "Pago parcial", PAGO_FINAL: "Pago final", REEMBOLSO: "Reembolso" } as const;
const METHOD = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta", DEPOSITO: "Depósito", CHEQUE: "Cheque", OTRO: "Otro" } as const;
const COLLECTION = { PENDIENTE: { label: "Pendiente de cobro", tone: "amber" }, PARCIAL: { label: "Cobro parcial", tone: "blue" }, LIQUIDADO: { label: "Liquidado", tone: "green" } } as const;

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-neutral-900">{children || <span className="text-neutral-400">—</span>}</dd>
    </div>
  );
}

const mxLocal = (d: Date) => {
  const p = mexicoParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}`, dt: `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}` };
};

export default async function ServicioDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ confirmado?: string; cerrado?: string }> }) {
  const user = await requirePermission("agenda.ver");
  const { id } = await params;
  const { confirmado, cerrado } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await prisma.service.findUnique({
    where: { id },
    include: {
      client: true, request: { include: { attachments: { where: { deletedAt: null } } } }, originAddress: true, destinationAddress: true,
      vehicles: { include: { vehicle: true } }, staff: { include: { worker: true } },
      reschedules: { orderBy: { createdAt: "desc" } }, overrides: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { receivedAt: "asc" } }, attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!s) notFound();
  const [totals, crew, logs, eco, allExpenses, readings, directCats] = await Promise.all([
    paymentTotals(prisma, s.id),
    crewOptions(prisma, s.serviceType),
    prisma.auditLog.findMany({ where: { entity: "Servicio", entityId: s.id }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    serviceEconomics(prisma, id),
    prisma.expense.findMany({ where: { serviceId: id }, include: { category: true, fuelLog: true }, orderBy: { createdAt: "asc" } }),
    prisma.odometerReading.findMany({ where: { serviceId: id }, include: { vehicle: true }, orderBy: { readingAt: "asc" } }),
    prisma.expenseCategory.findMany({ where: { group: "DIRECTO", active: true }, orderBy: { name: "asc" } }),
  ]);
  const payroll = await prisma.payrollEntry.findMany({ where: { serviceId: id }, include: { worker: true } });
  const names = new Map<string, string>([...crew.vehicles.map((v) => [v.id, v.name] as const), ...crew.workers.map((w) => [w.id, w.name] as const)]);
  for (const v of s.vehicles) names.set(v.vehicleId, v.vehicle.name);
  for (const x of s.staff) names.set(x.workerId, x.worker.fullName);
  const conflictFolios = new Map((await prisma.service.findMany({ where: { id: { in: s.overrides.map((o) => o.conflictingServiceId) } }, select: { id: true, folio: true } })).map((x) => [x.id, x.folio]));
  const price = Number(s.contractedPrice);
  const saldo = Math.round((price - totals.cobrado) * 100) / 100;
  const editable = s.status !== "FINALIZADO" && s.status !== "CANCELADO";
  const canProgram = can(user, "agenda.programar");
  const canPay = can(user, "finanzas.cobros");
  const wa = s.client.phoneNormalized.length === 10 ? `52${s.client.phoneNormalized}` : s.client.phoneNormalized;
  const start = s.scheduledStart ? mxLocal(s.scheduledStart) : null;
  const durationHours = s.scheduledStart && s.estimatedEnd ? (s.estimatedEnd.getTime() - s.scheduledStart.getTime()) / 3600_000 : 4;
  const now = mxLocal(new Date());
  const transitions = STATUS_TRANSITIONS[s.status as ServiceStatusKey].map((k) => ({ value: k, label: SERVICE_STATUS[k].label }));
  const files = [...s.attachments.map((a) => ({ ...a, from: "Servicio" })), ...(s.request?.attachments ?? []).map((a) => ({ ...a, from: "Solicitud" }))];
  const col = COLLECTION[s.collectionStatus];
  const choferes = s.staff.filter((x) => x.role === "CHOFER");
  const closable = ["PROGRAMADO", "CONFIRMADO", "EN_PROCESO", "INCIDENCIA"].includes(s.status) && can(user, "servicios.cerrar");
  const kmRows = s.vehicles.map((v) => {
    const a = readings.find((r) => r.vehicleId === v.vehicleId && r.source === "SERVICIO_INICIO");
    const b = readings.find((r) => r.vehicleId === v.vehicleId && r.source === "SERVICIO_FIN");
    return { name: v.vehicle.name, start: a?.odometer, end: b?.odometer };
  });
  const ayudantes = s.staff.filter((x) => x.role !== "CHOFER");

  return (
    <>
      <Link href="/agenda" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Agenda</Link>
      {cerrado && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Cierre operativo registrado: el servicio pasó a «Servicios realizados» y se actualizaron flotilla, gastos y nómina.</div>}
      {confirmado && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Servicio <b>{s.folio}</b> creado y agregado a la agenda.</div>}
      <PageHeader
        eyebrow={`${SERVICE_TYPE[s.serviceType]}${s.package ? ` · Paquete ${PACKAGE[s.package]}` : ""}`}
        title={s.folio}
        description={<span className="inline-flex flex-wrap items-center gap-2"><Badge tone={SERVICE_STATUS[s.status].tone}>{SERVICE_STATUS[s.status].label}</Badge><Badge tone={col.tone}>{col.label}</Badge><Link href={`/clientes/${s.clientId}`} className="font-medium text-neutral-800 hover:text-brand-600">{s.client.name}</Link><span>· {s.client.phone}</span></span>}
        actions={
          <>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonClass("outline")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            {s.request && <Link href={`/solicitudes/${s.request.id}`} className={buttonClass("outline")}><ClipboardList className="h-4 w-4" /> Solicitud {s.request.folio}</Link>}
            {closable && <Link href={`/agenda/${s.id}/cierre`} className={buttonClass("primary")}><CheckCircle2 className="h-4 w-4" /> Registrar cierre operativo</Link>}
          </>
        }
      />
      {s.status === "CANCELADO" && <div className="mb-4 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm"><b>Cancelado</b> el {formatDateTime(s.cancelledAt)}: {s.cancelReason}</div>}
      {s.incidents && <div className="mb-4 flex gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span className="whitespace-pre-line"><b>Incidencias:</b> {s.incidents}</span></div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Resumen" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Item label="Inicio">{s.scheduledStart ? formatDateTime(s.scheduledStart) : "Por programar"}</Item>
                <Item label="Fin estimado">{formatDateTime(s.estimatedEnd)}</Item>
                <Item label="Preparación / regreso">{`${s.prepMinutes} min / ${s.returnMinutes} min`}</Item>
                <Item label="Unidad">{s.vehicles.map((v) => v.vehicle.name).join(", ")}</Item>
                <Item label="Precio contratado">{`${formatMXN(price)}${s.includesVat ? " (IVA incl.)" : ""}`}</Item>
                <Item label="Anticipo">{formatMXN(totals.anticipos)}</Item>
                <Item label="Total cobrado">{formatMXN(totals.cobrado)}</Item>
                <Item label="Saldo"><span className={saldo > 0 ? "font-semibold text-brand-700" : "font-semibold text-emerald-700"}>{formatMXN(saldo)}</span></Item>
                <Item label="Chofer">{choferes.map((x) => x.worker.fullName).join(", ")}</Item>
                <div className="col-span-2 sm:col-span-3"><Item label="Ayudantes">{ayudantes.map((x) => `${x.worker.fullName}${x.role === "OTRO" ? " (otro)" : ""}`).join(", ")}</Item></div>
              </dl>
            </CardBody>
          </Card>

          {s.status === "FINALIZADO" && (
            <Card>
              <CardHeader title="Cierre operativo" description={`Registrado ${formatDateTime(s.operationalClosedAt)}`} />
              <CardBody className="space-y-5">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Item label="Inicio real">{formatDateTime(s.actualStart)}</Item>
                  <Item label="Fin real">{formatDateTime(s.actualEnd)}</Item>
                  <Item label="Km recorridos">{`${formatNumber(eco.km)} km`}</Item>
                  <Item label="Kilometraje">{kmRows.map((k) => `${k.name}: ${k.start !== undefined ? formatNumber(k.start) : "—"} → ${k.end !== undefined ? formatNumber(k.end) : "—"}`).join("\n")}</Item>
                  <div className="col-span-2"><Item label="Evidencia de entrega">{s.deliveryEvidence}</Item></div>
                  <div className="col-span-2"><Item label="Observaciones del cierre">{s.closingNotes}</Item></div>
                </dl>
                <div className="grid grid-cols-2 gap-3 rounded-md bg-neutral-50 p-4 text-sm sm:grid-cols-4">
                  <div><p className="text-xs text-neutral-500">Precio contratado</p><p className="font-semibold tabular-nums">{formatMXN(eco.price)}</p></div>
                  <div><p className="text-xs text-neutral-500">Gastos directos</p><p className="font-semibold tabular-nums">− {formatMXN(eco.direct)}</p></div>
                  <div><p className="text-xs text-neutral-500">Pago a personal</p><p className="font-semibold tabular-nums">− {formatMXN(eco.labor)}</p></div>
                  <div><p className="text-xs text-neutral-500">Margen directo</p><p className={`font-semibold tabular-nums ${eco.margin >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatMXN(eco.margin)}</p></div>
                  <p className="col-span-2 text-[11px] text-neutral-500 sm:col-span-4">Margen directo = precio − gastos ligados al folio − pagos de nómina del servicio. No incluye gastos fijos ni depreciación (se asignan en Resultados).</p>
                </div>
                {payroll.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Pagos generados en nómina</p>
                    <ul className="text-sm">{payroll.map((p) => <li key={p.id} className="flex justify-between border-b border-neutral-100 py-1"><span>{p.worker.fullName} · <span className="text-neutral-500">{p.status === "GENERADO" ? "por pagar" : p.status.toLowerCase()}</span></span><span className="tabular-nums">{formatMXN(p.amount)}</span></li>)}</ul>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {(allExpenses.length > 0 || s.status === "FINALIZADO") && (
            <Card>
              <CardHeader title="Gastos directos del servicio" description={`${formatMXN(eco.direct)} vigentes · ligados al folio ${s.folio}`} />
              {allExpenses.length > 0 && (
                <Table>
                  <thead><tr><Th>Folio</Th><Th>Fecha</Th><Th>Concepto</Th><Th className="text-right">Importe</Th><Th></Th></tr></thead>
                  <tbody>
                    {allExpenses.map((e) => (
                      <Tr key={e.id} className={e.cancelledAt ? "opacity-60" : ""}>
                        <Td className="whitespace-nowrap text-xs">{e.folio}</Td>
                        <Td className="whitespace-nowrap text-xs">{formatDateOnly(e.date)}</Td>
                        <Td>{e.category.name}<span className="block text-xs text-neutral-500">{e.description}{e.fuelLog ? ` · ${formatNumber(e.fuelLog.liters)} L` : ""}{e.cancelledAt ? ` · Cancelado: ${e.cancelReason}` : ""}</span></Td>
                        <Td className={`whitespace-nowrap text-right tabular-nums ${e.cancelledAt ? "line-through" : ""}`}>{formatMXN(e.total)}</Td>
                        <Td>
                          {!e.cancelledAt && can(user, "finanzas.gastos") && (
                            <details>
                              <summary className="cursor-pointer text-xs text-neutral-500 hover:text-red-700">Cancelar</summary>
                              <ActionForm action={cancelExpenseAction.bind(null, e.id, s.id)} className="mt-1 space-y-1">
                                <Input name="cancelReason" placeholder="Motivo" aria-label="Motivo" className="h-8 w-40 text-xs" />
                                <SubmitButton size="sm" variant="danger" confirmText={`¿Cancelar el gasto ${e.folio}?`}>Cancelar gasto</SubmitButton>
                              </ActionForm>
                            </details>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {can(user, "servicios.cerrar") && s.status !== "CANCELADO" && (
                <CardBody className="border-t border-neutral-100">
                  <ActionForm action={addServiceExpenseAction.bind(null, s.id)} resetOnSuccess>
                    <div className="grid gap-3 sm:grid-cols-5">
                      <FormField name="categoryKey" label="Categoría">
                        <Select id="categoryKey" name="categoryKey" defaultValue="OTROS_DIRECTOS">{directCats.map((c) => <option key={c.id} value={c.key}>{c.name}</option>)}</Select>
                      </FormField>
                      <FormField name="description" label="Descripción" className="sm:col-span-2"><Input id="description" name="description" /></FormField>
                      <FormField name="total" label="Importe"><Input id="total" name="total" inputMode="decimal" className="text-right" /></FormField>
                      <FormField name="date" label="Fecha"><Input id="date" name="date" type="date" defaultValue={(s.actualStart ? mxLocal(s.actualStart) : now).date} /></FormField>
                      <FormField name="method" label="Pagado con">
                        <Select id="method" name="method" defaultValue="EFECTIVO">{Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                      </FormField>
                      <FormField name="vatAmount" label="IVA incluido ($)" hint="Opcional"><Input id="vatAmount" name="vatAmount" inputMode="decimal" className="text-right" /></FormField>
                      <FormField name="supplier" label="Proveedor" className="sm:col-span-2"><Input id="supplier" name="supplier" /></FormField>
                    </div>
                    <DuplicateExpenseConfirm />
                    <div className="mt-3"><SubmitButton size="sm" variant="outline">Agregar gasto</SubmitButton></div>
                  </ActionForm>
                </CardBody>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Ruta" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Item label="Origen (carga)">{fullAddress(s.originAddress)}{s.originAddress?.floor != null ? `\nPiso ${s.originAddress.floor}${s.originAddress.hasElevator ? " · con elevador" : s.originAddress.hasElevator === false ? " · sin elevador" : ""}` : ""}{s.originAddress?.accessConditions ? `\n${s.originAddress.accessConditions}` : ""}</Item>
              <Item label="Destino (descarga)">{fullAddress(s.destinationAddress)}{s.destinationAddress?.floor != null ? `\nPiso ${s.destinationAddress.floor}${s.destinationAddress.hasElevator ? " · con elevador" : s.destinationAddress.hasElevator === false ? " · sin elevador" : ""}` : ""}{s.destinationAddress?.accessConditions ? `\n${s.destinationAddress.accessConditions}` : ""}</Item>
            </CardBody>
          </Card>

          {canProgram && editable && (
            <Card>
              <CardHeader title={s.scheduledStart ? "Reprogramar / cambiar asignación" : "Programar servicio"} description="Los cambios conservan el folio, los cobros y quedan en el historial." />
              <ActionForm action={scheduleServiceAction.bind(null, s.id)}>
                <input type="hidden" name="version" value={s.version} />
                <div className="space-y-5 px-5 py-4">
                  <ScheduleFields d={{ date: start?.date, time: start?.time, durationHours, prepMinutes: s.prepMinutes, returnMinutes: s.returnMinutes }} />
                  <CrewPicker vehicles={crew.vehicles} workers={crew.workers} initial={{ vehicleIds: s.vehicles.map((v) => v.vehicleId), staff: s.staff.map((x) => ({ workerId: x.workerId, role: x.role, agreedPay: Number(x.agreedPay) })) }} />
                  <FormField name="reason" label="Motivo del cambio (opcional)"><Input id="reason" name="reason" placeholder="Ej. el cliente cambió de fecha" /></FormField>
                  <ConflictPanel canOverride={can(user, "agenda.autorizar_conflictos")} />
                  <SubmitButton>Guardar programación</SubmitButton>
                </div>
              </ActionForm>
            </Card>
          )}

          <Card>
            <CardHeader title="Inventario y observaciones" />
            <CardBody>
              {canProgram && s.status !== "CANCELADO" ? (
                <ActionForm action={updateServiceAction.bind(null, s.id)}>
                  <input type="hidden" name="version" value={s.version} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField name="inventory" label="Inventario"><Textarea id="inventory" name="inventory" rows={5} defaultValue={s.inventory ?? ""} /></FormField>
                    <FormField name="observations" label="Observaciones"><Textarea id="observations" name="observations" rows={5} defaultValue={s.observations ?? ""} /></FormField>
                    <FormField name="contractedPrice" label="Precio contratado (MXN)"><Input id="contractedPrice" name="contractedPrice" inputMode="decimal" defaultValue={price.toFixed(2)} className="text-right tabular-nums" /></FormField>
                    <div className="flex items-end pb-2"><Checkbox name="includesVat" defaultChecked={s.includesVat} label="Incluye IVA" /></div>
                  </div>
                  <div className="mt-4"><SubmitButton variant="outline">Guardar datos</SubmitButton></div>
                </ActionForm>
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2"><Item label="Inventario">{s.inventory}</Item><Item label="Observaciones">{s.observations}</Item></dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Historial del servicio" description="Programaciones, reprogramaciones, autorizaciones y cambios. No se puede modificar." />
            {s.overrides.length > 0 && (
              <div className="border-b border-neutral-100 px-5 py-3">
                {s.overrides.map((o) => (
                  <p key={o.id} className="text-sm text-red-800"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Empalme autorizado con {conflictFolios.get(o.conflictingServiceId) ?? "otro servicio"} ({o.type === "UNIDAD" ? "unidad" : "personal"}: {names.get(o.resourceId) ?? "—"}) — {o.reason} · {formatDateTime(o.createdAt)}</p>
                ))}
              </div>
            )}
            <ol className="divide-y divide-neutral-100">
              {s.reschedules.map((r) => {
                const b = r.before as { inicio: string | null; unidades: string[]; personal: { trabajador: string }[] };
                const a = r.after as typeof b;
                return (
                  <li key={r.id} className="px-5 py-3 text-sm">
                    <p className="font-medium">{b.inicio ? "Reprogramación / cambio de asignación" : "Programación"}{r.reason ? ` — ${r.reason}` : ""}</p>
                    <p className="text-xs text-neutral-600">
                      {b.inicio && <>Antes: {formatDateTime(b.inicio)} · {b.unidades.map((x) => names.get(x) ?? "unidad").join(", ") || "sin unidad"} · {b.personal.length} pers.<br /></>}
                      Ahora: {formatDateTime(a.inicio)} · {a.unidades.map((x) => names.get(x) ?? "unidad").join(", ") || "sin unidad"} · {a.personal.map((p) => names.get(p.trabajador) ?? "—").join(", ") || "sin personal"}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">{formatDateTime(r.createdAt)}</p>
                  </li>
                );
              })}
              {logs.filter((l) => l.action !== "PROGRAMAR" && l.action !== "REPROGRAMAR").map((l) => (
                <li key={l.id.toString()} className="px-5 py-2.5 text-sm">
                  <span className="font-medium">{l.action.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</span>
                  {l.summary && <span className="text-neutral-600"> · {l.summary}</span>}
                  <span className="block text-xs text-neutral-400">{formatDateTime(l.createdAt)} · {l.user?.name ?? "Sistema"}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          {canProgram && transitions.length > 0 && (
            <Card>
              <CardHeader title="Estado operativo" description="Para finalizar use «Registrar cierre operativo»." />
              <CardBody><ServiceStatusForm action={changeStatusAction.bind(null, s.id)} version={s.version} options={transitions} /></CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Cobros" description={`${formatMXN(totals.cobrado)} de ${formatMXN(price)}`} />
            {s.payments.length > 0 && (
              <ul className="divide-y divide-neutral-100">
                {s.payments.map((p) => (
                  <li key={p.id} className={`px-5 py-2.5 text-sm ${p.cancelledAt ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span><span className="font-medium">{KIND[p.kind]}</span> <span className="text-xs text-neutral-500">{p.folio}</span></span>
                      <span className={`tabular-nums ${p.cancelledAt ? "line-through" : "font-semibold"}`}>{p.kind === "REEMBOLSO" ? "−" : ""}{formatMXN(p.amount)}</span>
                    </div>
                    <p className="text-xs text-neutral-500">{formatDateTime(p.receivedAt)} · {METHOD[p.method]}{p.reference ? ` · Ref. ${p.reference}` : ""}</p>
                    {p.cancelledAt ? (
                      <p className="text-xs text-red-700">Cancelado: {p.cancelReason}</p>
                    ) : canPay && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-neutral-500 hover:text-red-700">Cancelar cobro</summary>
                        <ActionForm action={cancelPaymentAction.bind(null, p.id, s.id)} className="mt-2 space-y-2">
                          <Input name="cancelReason" placeholder="Motivo" aria-label="Motivo de cancelación" />
                          <SubmitButton size="sm" variant="danger" confirmText={`¿Cancelar el cobro ${p.folio}? Se conservará en el historial.`}>Cancelar cobro</SubmitButton>
                        </ActionForm>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canPay && (
              <CardBody className="border-t border-neutral-100">
                <ActionForm action={registerPaymentAction.bind(null, s.id)} resetOnSuccess className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField name="kind" label="Tipo">
                      <Select id="kind" name="kind" defaultValue={totals.cobrado > 0 ? "PAGO_FINAL" : "ANTICIPO"}>
                        {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </Select>
                    </FormField>
                    <FormField name="amount" label="Importe"><Input id="amount" name="amount" inputMode="decimal" placeholder={saldo > 0 ? saldo.toFixed(2) : "0.00"} className="text-right tabular-nums" /></FormField>
                    <FormField name="method" label="Método">
                      <Select id="method" name="method" defaultValue="TRANSFERENCIA">{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                    </FormField>
                    <FormField name="receivedAt" label="Fecha"><Input id="receivedAt" name="receivedAt" type="datetime-local" defaultValue={now.dt} /></FormField>
                    <FormField name="reference" label="Referencia" className="col-span-2"><Input id="reference" name="reference" placeholder="Folio de transferencia, recibo…" /></FormField>
                  </div>
                  <SubmitButton size="sm">Registrar cobro</SubmitButton>
                </ActionForm>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Personal asignado" />
            {s.staff.length === 0 ? <p className="px-5 py-4 text-sm text-neutral-500">Sin personal asignado.</p> : (
              <Table>
                <thead><tr><Th>Nombre</Th><Th>Rol</Th><Th className="text-right">Pago</Th></tr></thead>
                <tbody>
                  {s.staff.map((x) => (
                    <Tr key={x.id}><Td>{x.worker.fullName}</Td><Td>{STAFF_ROLE[x.role]}</Td><Td className="text-right tabular-nums">{formatMXN(x.agreedPay)}</Td></Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Archivos" description={`${files.length} archivo(s), incluidos los de la solicitud`} />
            {files.length > 0 && (
              <ul className="divide-y divide-neutral-100">
                {files.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    {a.category === "FOTO" ? <ImageIcon className="h-4 w-4 text-neutral-400" /> : a.category === "VIDEO" ? <Film className="h-4 w-4 text-neutral-400" /> : <FileText className="h-4 w-4 text-neutral-400" />}
                    <a href={`/api/archivos/${a.id}`} target="_blank" className="min-w-0 flex-1 truncate text-sm hover:text-brand-600">{a.fileName}</a>
                    <span className="text-xs text-neutral-400">{a.from}</span>
                    {canProgram && a.from === "Servicio" && (
                      <ActionForm action={removeAttachmentAction.bind(null, a.id)}><SubmitButton variant="ghost" size="sm" pendingText="…" confirmText={`¿Retirar «${a.fileName}»?`}>Retirar</SubmitButton></ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canProgram && (
              <CardBody className="border-t border-neutral-100">
                <ActionForm action={uploadServiceFilesAction.bind(null, s.id)} resetOnSuccess>
                  <Input name="files" type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className="h-auto py-1.5" aria-label="Archivos" />
                  <div className="mt-3"><SubmitButton size="sm" variant="outline" pendingText="Subiendo…"><Paperclip className="h-4 w-4" /> Adjuntar</SubmitButton></div>
                </ActionForm>
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
