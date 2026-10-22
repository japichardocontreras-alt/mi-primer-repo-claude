import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { POSITION } from "@/lib/domain/workers";
import { SERVICE_STATUS, STAFF_ROLE } from "@/lib/domain/services";
import { ENTRY_KIND, pendingBalance, workerAccount } from "@/lib/domain/payroll";
import { formatDateOnly, formatDateTime, formatMXN, mexicoParts } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, Stat } from "@/components/ui/card";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { WorkerFields } from "@/components/forms/worker-fields";
import { PayrollEntryForm } from "@/components/forms/payroll-entry-form";
import { updateWorkerAction } from "../actions";
import { addEntryAction, cancelEntryAction, cancelPayrollPaymentAction, registerAdvanceAction } from "../nomina-actions";

export const metadata = { title: "Colaborador" };
const STATUS_TONE = { GENERADO: "amber", PAGADO: "green", CANCELADO: "neutral" } as const;
const STATUS_LABEL = { GENERADO: "Por pagar", PAGADO: "Pagado", CANCELADO: "Cancelado" } as const;

function CancelInline({ action, label, confirm }: { action: Parameters<typeof ActionForm>[0]["action"]; label: string; confirm: string }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs text-neutral-500 hover:text-red-700">{label}</summary>
      <ActionForm action={action} className="mt-1 space-y-1">
        <Input name="reason" placeholder="Motivo" aria-label="Motivo" className="h-8 w-40 text-xs" />
        <SubmitButton size="sm" variant="danger" confirmText={confirm}>{label}</SubmitButton>
      </ActionForm>
    </details>
  );
}

export default async function TrabajadorDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pagado?: string }> }) {
  const user = await requirePermission("personal.ver");
  const { id } = await params;
  const { pagado } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const w = await prisma.worker.findUnique({
    where: { id },
    include: { assignments: { include: { service: { include: { client: true } } }, orderBy: { service: { scheduledStart: "desc" } }, take: 100 } },
  });
  if (!w) notFound();
  const money = can(user, "nomina.ver");
  const manage = can(user, "nomina.gestionar");
  const acc = money ? await workerAccount(prisma, id) : null;
  const p = mexicoParts();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  const nowLocal = `${today}T${pad(p.hour)}:${pad(p.minute)}`;
  const justPaid = pagado ? acc?.payments.find((x) => x.id === pagado) : null;

  return (
    <>
      <Link href="/personal" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Personal</Link>
      {justPaid && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Pago {justPaid.folio} registrado por {formatMXN(justPaid.amount)}.
          <Link href={`/imprimir/nomina/${justPaid.id}`} target="_blank" className="font-medium underline">Imprimir recibo</Link>
        </div>
      )}
      <PageHeader
        eyebrow={w.code}
        title={w.fullName}
        description={<span className="inline-flex gap-2">{POSITION[w.position]} {w.active ? <Badge tone="green">Activo</Badge> : <Badge tone="red">Inactivo</Badge>}</span>}
        actions={manage ? <Link href={`/personal/${id}/corte`} className={buttonClass("primary")}><Wallet className="h-4 w-4" /> Corte y pago</Link> : undefined}
      />

      {acc && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total devengado" value={formatMXN(acc.totals.devengado)} hint={`${acc.totals.serviciosRealizados} servicio(s) · ${formatMXN(acc.totals.servicios)}`} />
          <Stat label="Total pagado" value={formatMXN(acc.totals.pagado)} hint={`Incluye anticipos ${formatMXN(acc.totals.anticipos)}`} />
          <Stat label="Saldo pendiente" value={formatMXN(pendingBalance(acc.totals))} tone={pendingBalance(acc.totals) > 0 ? "warn" : "good"} hint={`Por pagar ${formatMXN(acc.totals.porPagar)} − anticipos ${formatMXN(acc.totals.anticiposPendientes)}`} />
          <Stat label="Sueldo base" value={formatMXN(w.baseSalary)} hint={`Bonos ${formatMXN(acc.totals.bonos)} · horas extra ${formatMXN(acc.totals.horasExtra)} · deducciones ${formatMXN(acc.totals.deducciones)}`} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {acc && (
            <Card>
              <CardHeader title="Conceptos de nómina" description="Pagos por servicio (automáticos al cerrar cada servicio), sueldo base, bonos, horas extra y deducciones." />
              {acc.entries.length === 0 ? <EmptyState title="Sin conceptos registrados" /> : (
                <Table>
                  <thead><tr><Th>Fecha</Th><Th>Concepto</Th><Th>Servicio</Th><Th className="text-right">Importe</Th><Th>Estado</Th><Th /></tr></thead>
                  <tbody>
                    {acc.entries.map((e) => (
                      <Tr key={e.id} className={e.status === "CANCELADO" ? "opacity-60" : ""}>
                        <Td className="whitespace-nowrap text-xs">{formatDateOnly(e.date)}</Td>
                        <Td>{e.concept}<span className="block text-xs text-neutral-500">{ENTRY_KIND[e.kind]}{e.payment ? ` · ${e.payment.folio}` : ""}{e.cancelReason ? ` · ${e.cancelReason}` : ""}</span></Td>
                        <Td className="whitespace-nowrap text-xs">{e.service ? <Link href={`/agenda/${e.service.id}`} className="hover:text-brand-600">{e.service.folio}</Link> : "—"}</Td>
                        <Td className={`whitespace-nowrap text-right tabular-nums ${Number(e.amount) < 0 ? "text-red-700" : ""} ${e.status === "CANCELADO" ? "line-through" : ""}`}>{formatMXN(e.amount)}</Td>
                        <Td><Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge></Td>
                        <Td>{manage && e.status === "GENERADO" && <CancelInline action={cancelEntryAction.bind(null, e.id, id)} label="Cancelar" confirm="¿Cancelar este concepto?" />}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}

          {acc && (
            <Card>
              <CardHeader title="Pagos entregados" description="Anticipos y pagos de corte. Un pago cancelado regresa sus conceptos a «por pagar»." />
              {acc.payments.length === 0 ? <EmptyState title="Sin pagos registrados" /> : (
                <Table>
                  <thead><tr><Th>Folio</Th><Th>Fecha</Th><Th>Tipo</Th><Th className="text-right">Bruto</Th><Th className="text-right">Entregado</Th><Th /></tr></thead>
                  <tbody>
                    {acc.payments.map((x) => (
                      <Tr key={x.id} className={x.cancelledAt ? "opacity-60" : ""}>
                        <Td className="whitespace-nowrap font-medium">{x.folio}</Td>
                        <Td className="whitespace-nowrap text-xs">{formatDateTime(x.paidAt)}</Td>
                        <Td>{x.kind === "ANTICIPO" ? <>Anticipo{x.appliedTo ? <span className="block text-xs text-neutral-500">descontado en {x.appliedTo.folio}</span> : <span className="block text-xs text-amber-700">pendiente de descontar</span>}</> : "Pago de corte"}{x.cancelledAt && <span className="block text-xs text-red-700">Cancelado: {x.cancelReason}</span>}</Td>
                        <Td className="text-right tabular-nums">{x.grossAmount ? formatMXN(x.grossAmount) : "—"}</Td>
                        <Td className={`text-right font-medium tabular-nums ${x.cancelledAt ? "line-through" : ""}`}>{formatMXN(x.amount)}</Td>
                        <Td className="whitespace-nowrap">
                          <Link href={`/imprimir/nomina/${x.id}`} target="_blank" className="mr-3 inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-brand-600"><Printer className="h-3.5 w-3.5" /> Recibo</Link>
                          {manage && !x.cancelledAt && !(x.kind === "ANTICIPO" && x.appliedToId) && <CancelInline action={cancelPayrollPaymentAction.bind(null, x.id, id)} label="Cancelar pago" confirm={`¿Cancelar el pago ${x.folio}?`} />}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Servicios asignados" description="Historial de participación en servicios." />
            {w.assignments.length === 0 ? <EmptyState title="Sin servicios asignados" /> : (
              <Table>
                <thead><tr><Th>Fecha</Th><Th>Servicio</Th><Th>Cliente</Th><Th>Rol</Th>{money && <Th className="text-right">Pago pactado</Th>}<Th>Estado</Th></tr></thead>
                <tbody>
                  {w.assignments.map((a) => (
                    <Tr key={a.id}>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(a.service.actualStart ?? a.service.scheduledStart)}</Td>
                      <Td className="font-medium"><Link href={`/agenda/${a.serviceId}`} className="hover:text-brand-600">{a.service.folio}</Link></Td>
                      <Td>{a.service.client.name}</Td>
                      <Td>{STAFF_ROLE[a.role]}{!a.participated && <span className="block text-xs text-neutral-500">no participó</span>}</Td>
                      {money && <Td className="text-right tabular-nums">{formatMXN(a.agreedPay)}</Td>}
                      <Td><Badge tone={SERVICE_STATUS[a.service.status].tone}>{SERVICE_STATUS[a.service.status].label}</Badge></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {manage && (
            <Card>
              <CardHeader title="Bono, horas extra o deducción" />
              <CardBody><PayrollEntryForm action={addEntryAction.bind(null, id)} today={today} /></CardBody>
            </Card>
          )}
          {manage && (
            <Card>
              <CardHeader title="Anticipo de nómina" description="Se descuenta automáticamente en el siguiente corte." />
              <CardBody>
                <ActionForm action={registerAdvanceAction.bind(null, id)} resetOnSuccess className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField name="amount" htmlFor="adv_amount" label="Importe"><Input id="adv_amount" name="amount" inputMode="decimal" className="text-right" /></FormField>
                    <FormField name="paidAt" htmlFor="adv_paidAt" label="Fecha"><Input id="adv_paidAt" name="paidAt" type="datetime-local" defaultValue={nowLocal} /></FormField>
                    <FormField name="method" htmlFor="adv_method" label="Método"><Select id="adv_method" name="method" defaultValue="EFECTIVO"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="DEPOSITO">Depósito</option><option value="OTRO">Otro</option></Select></FormField>
                    <FormField name="reference" htmlFor="adv_reference" label="Referencia"><Input id="adv_reference" name="reference" /></FormField>
                  </div>
                  <SubmitButton size="sm" variant="outline">Registrar anticipo</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Ficha" />
            <CardBody>
              {can(user, "personal.editar") ? (
                <ActionForm action={updateWorkerAction.bind(null, w.id)}>
                  <input type="hidden" name="version" value={w.version} />
                  <WorkerFields w={w} showMoney={money} />
                  <div className="mt-4"><SubmitButton>Guardar cambios</SubmitButton></div>
                </ActionForm>
              ) : (
                <p className="text-sm text-neutral-600">{w.phone ?? "Sin teléfono"}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
