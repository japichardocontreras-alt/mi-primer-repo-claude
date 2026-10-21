import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { paymentTotals, STAFF_ROLE } from "@/lib/domain/services";
import { PAYMENT_METHOD } from "@/lib/domain/expenses";
import { formatMXN, formatNumber, mexicoParts } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { FormSection } from "@/components/forms/form-section";
import { OdometerConfirm } from "@/components/forms/odometer-confirm";
import { closeServiceAction } from "@/app/(erp)/servicios/actions";

export const metadata = { title: "Cierre operativo" };

const local = (d: Date | null) => {
  if (!d) return "";
  const p = mexicoParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};

export default async function CierreServicio({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("servicios.cerrar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await prisma.service.findUnique({ where: { id }, include: { client: true, vehicles: { include: { vehicle: true } }, staff: { include: { worker: true } } } });
  if (!s) notFound();
  if (s.status === "FINALIZADO") redirect(`/agenda/${id}`);
  const totals = await paymentTotals(prisma, id);
  const price = Number(s.contractedPrice);
  const blocked = s.status === "CANCELADO" || s.status === "POR_PROGRAMAR" ? "Solo se pueden cerrar servicios programados o en proceso." : !s.vehicles.length ? "Asigne la unidad utilizada antes de cerrar el servicio." : null;
  const lastByVehicle = new Map(
    await Promise.all(s.vehicles.map(async (v) => {
      const r = await prisma.odometerReading.findFirst({ where: { vehicleId: v.vehicleId }, orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }] });
      return [v.vehicleId, r?.odometer ?? (v.vehicle.initialOdometer || v.vehicle.currentOdometer || null)] as const;
    })),
  );

  return (
    <>
      <Link href={`/agenda/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> {s.folio}</Link>
      <PageHeader title="Cierre operativo" description={`${s.folio} · ${s.client.name}. Al guardar, el servicio pasa a «Finalizado» y alimenta flotilla, gastos y nómina. El cobro se maneja por separado.`} />
      {blocked ? (
        <Card className="p-6 text-sm text-neutral-700">{blocked} <Link href={`/agenda/${id}`} className="font-medium text-brand-700 hover:underline">Volver al servicio</Link></Card>
      ) : (
        <ActionForm action={closeServiceAction.bind(null, id)} messagePosition="top">
          <input type="hidden" name="version" value={s.version} />
          <Card>
            <FormSection title="Horario real">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField name="actualStart" label="Inicio real" required><Input id="actualStart" name="actualStart" type="datetime-local" defaultValue={local(s.actualStart ?? s.scheduledStart)} /></FormField>
                <FormField name="actualEnd" label="Fin real" required><Input id="actualEnd" name="actualEnd" type="datetime-local" defaultValue={local(s.estimatedEnd)} /></FormField>
              </div>
            </FormSection>

            <FormSection title="Unidad, kilometraje y combustible" description="El kilometraje se guarda en el historial de la unidad y no se sobrescribe. Se compara con la última lectura registrada.">
              <div className="space-y-5">
                {s.vehicles.map((v) => {
                  const last = lastByVehicle.get(v.vehicleId);
                  return (
                    <div key={v.vehicleId}>
                      <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-neutral-400" /> {v.vehicle.name}<span className="font-normal text-neutral-500">· última lectura: {last !== null && last !== undefined ? `${formatNumber(last)} km` : "sin registro"}</span></p>
                      <div className="grid gap-4 sm:grid-cols-4">
                        <FormField name={`km_start_${v.vehicleId}`} label="Km inicial" required><Input id={`km_start_${v.vehicleId}`} name={`km_start_${v.vehicleId}`} inputMode="numeric" defaultValue={last ?? ""} /></FormField>
                        <FormField name={`km_end_${v.vehicleId}`} label="Km final" required><Input id={`km_end_${v.vehicleId}`} name={`km_end_${v.vehicleId}`} inputMode="numeric" /></FormField>
                        <FormField name={`fuel_l_${v.vehicleId}`} label="Combustible (litros)"><Input id={`fuel_l_${v.vehicleId}`} name={`fuel_l_${v.vehicleId}`} inputMode="decimal" /></FormField>
                        <FormField name={`fuel_amt_${v.vehicleId}`} label="Gasto combustible ($)"><Input id={`fuel_amt_${v.vehicleId}`} name={`fuel_amt_${v.vehicleId}`} inputMode="decimal" className="text-right" /></FormField>
                      </div>
                      <OdometerConfirm vehicleId={v.vehicleId} name={v.vehicle.name} />
                    </div>
                  );
                })}
              </div>
            </FormSection>

            <FormSection title="Gastos del servicio" description="Se registran como gastos directos ligados a este folio.">
              <div className="grid gap-4 sm:grid-cols-4">
                <FormField name="tolls" label="Casetas ($)"><Input id="tolls" name="tolls" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="parking" label="Estacionamientos ($)"><Input id="parking" name="parking" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="perDiem" label="Viáticos ($)"><Input id="perDiem" name="perDiem" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="expenseMethod" label="Pagados con">
                  <Select id="expenseMethod" name="expenseMethod" defaultValue="EFECTIVO">{Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                </FormField>
              </div>
              <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-neutral-600">Gastos adicionales</p>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="grid gap-3 sm:grid-cols-4">
                    <FormField name={`extra_desc_${i}`} label="" className="sm:col-span-3"><Input name={`extra_desc_${i}`} placeholder="Descripción (maniobra, material, apoyo…)" aria-label={`Gasto adicional ${i}`} /></FormField>
                    <FormField name={`extra_amt_${i}`} label=""><Input name={`extra_amt_${i}`} inputMode="decimal" placeholder="$0.00" className="text-right" aria-label={`Importe adicional ${i}`} /></FormField>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection title="Personal participante" description="Al cerrar se genera el pago por servicio de cada participante en su registro de nómina (una sola vez).">
              {s.staff.length === 0 ? <p className="text-sm text-neutral-500">Sin personal asignado.</p> : (
                <div className="space-y-2">
                  {s.staff.map((x) => (
                    <div key={x.id} className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm">
                      <label className="flex min-w-[200px] flex-1 items-center gap-2">
                        <input type="checkbox" name={`part_${x.id}`} defaultChecked={x.participated} className="h-4 w-4 accent-brand-600" />
                        {x.worker.fullName} <span className="text-neutral-500">· {STAFF_ROLE[x.role]}</span>
                      </label>
                      <span className="text-xs text-neutral-500">Pago $</span>
                      <input name={`pay_${x.id}`} defaultValue={Number(x.agreedPay).toFixed(2)} inputMode="decimal" className="h-8 w-28 rounded-md border border-neutral-300 px-2 text-right text-sm tabular-nums" aria-label={`Pago de ${x.worker.fullName}`} />
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            <FormSection title="Entrega, incidencias y evidencia">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField name="deliveryEvidence" label="Evidencia de entrega"><Textarea id="deliveryEvidence" name="deliveryEvidence" rows={2} placeholder="Quién recibió, conformidad, firma…" /></FormField>
                <FormField name="incidents" label="Incidencias"><Textarea id="incidents" name="incidents" rows={2} placeholder="Daños, retrasos, reclamos…" /></FormField>
                <FormField name="closingNotes" label="Observaciones del cierre"><Textarea id="closingNotes" name="closingNotes" rows={2} /></FormField>
                <FormField name="files" label="Fotografías / documentos de evidencia"><Input id="files" name="files" type="file" multiple accept="image/*,video/*,application/pdf" className="h-auto py-1.5" /></FormField>
              </div>
            </FormSection>

            <FormSection title="Estado de cobro" description="El servicio puede cerrarse aunque tenga saldo pendiente; los cobros se registran en la ficha del servicio.">
              <p className="text-sm">Precio {formatMXN(price)} · Cobrado {formatMXN(totals.cobrado)} · <b className={price - totals.cobrado > 0 ? "text-brand-700" : "text-emerald-700"}>Saldo {formatMXN(price - totals.cobrado)}</b></p>
            </FormSection>
          </Card>
          <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
            <Link href={`/agenda/${id}`} className="text-sm text-neutral-600 hover:text-neutral-900">Cancelar</Link>
            <SubmitButton size="lg" pendingText="Cerrando…" confirmText="¿Registrar el cierre operativo? El servicio pasará a «Finalizado».">Registrar cierre</SubmitButton>
          </div>
        </ActionForm>
      )}
    </>
  );
}
