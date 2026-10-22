import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { crewOptions } from "@/lib/queries/crew";
import { PACKAGE, SERVICE_TYPE, addressLine } from "@/lib/domain/labels";
import { formatDateOnly, formatMXN } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { FormSection } from "@/components/forms/form-section";
import { ScheduleFields } from "@/components/forms/schedule-fields";
import { CrewPicker } from "@/components/forms/crew-picker";
import { ConflictPanel } from "@/components/forms/conflict-panel";
import { confirmRequestAction } from "@/app/(erp)/agenda/actions";

export const metadata = { title: "Confirmar solicitud" };

export default async function ConfirmarSolicitud({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("solicitudes.confirmar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await prisma.request.findUnique({ where: { id }, include: { client: true, currentQuote: true, service: true, originAddress: true, destinationAddress: true } });
  if (!r) notFound();
  if (r.service) redirect(`/agenda/${r.service.id}`);
  const [op, crew] = await Promise.all([getSetting(prisma, "operacion"), crewOptions(prisma, r.serviceType)]);
  const closed = r.status === "CANCELADA" || r.status === "NO_CONCRETADA";
  const canAssign = can(user, "agenda.programar");

  return (
    <>
      <Link href={`/solicitudes/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> {r.folio}</Link>
      <PageHeader
        title="Confirmar y convertir en servicio"
        description={`${r.folio} · ${r.client.name} · ${SERVICE_TYPE[r.serviceType]}${r.package ? ` · ${PACKAGE[r.package]}` : ""} · ${addressLine(r.originAddress)} → ${addressLine(r.destinationAddress)}`}
      />
      {closed ? (
        <Card className="p-6 text-sm text-neutral-700">La solicitud está cerrada. Reábrala desde su ficha antes de confirmarla.</Card>
      ) : (
        <ActionForm action={confirmRequestAction.bind(null, id)} messagePosition="top">
          <Card>
            <FormSection title="Precio contratado" description={r.currentQuote ? `Última cotización: v${r.currentQuote.versionNumber} por ${formatMXN(r.currentQuote.finalPrice)}.` : "La solicitud no tiene cotización: capture el precio acordado."}>
              <div className="grid gap-4 sm:grid-cols-4">
                <FormField name="contractedPrice" label="Precio contratado (MXN)" required>
                  <Input id="contractedPrice" name="contractedPrice" inputMode="decimal" defaultValue={r.currentQuote ? Number(r.currentQuote.finalPrice).toFixed(2) : ""} className="text-right font-semibold tabular-nums" />
                </FormField>
                <div className="flex items-end pb-2 sm:col-span-3"><Checkbox name="includesVat" defaultChecked={r.currentQuote?.includesVat ?? false} label="Incluye IVA" /></div>
              </div>
            </FormSection>
            <FormSection
              title="Fecha y horario"
              description={`Fecha tentativa de la solicitud: ${r.tentativeDate ? formatDateOnly(r.tentativeDate) : "sin definir"}${r.tentativeTime ? ` ${r.tentativeTime}` : ""}. Puede dejarlo vacío y programarlo después (quedará «Por programar»).`}
            >
              <ScheduleFields d={{ date: r.tentativeDate?.toISOString().slice(0, 10), time: r.tentativeTime ?? undefined, durationHours: op.duracionDefaultHoras, prepMinutes: op.minutosPreparacion, returnMinutes: op.minutosRegreso }} />
            </FormSection>
            {canAssign && (
              <FormSection title="Unidad y personal" description="El sistema verifica que no tengan otro servicio en el mismo horario (incluye preparación y regreso a base).">
                <CrewPicker vehicles={crew.vehicles} workers={crew.workers} initial={{ vehicleIds: r.suggestedVehicleId && crew.vehicles.some((v) => v.id === r.suggestedVehicleId && v.available) ? [r.suggestedVehicleId] : [], staff: [] }} />
              </FormSection>
            )}
            <FormSection title="Observaciones para la operación">
              <Textarea name="observations" rows={2} placeholder="Indicaciones para el equipo (se agregan a las observaciones de la solicitud)." />
            </FormSection>
          </Card>
          <div className="mt-4"><ConflictPanel canOverride={can(user, "agenda.autorizar_conflictos")} /></div>
          <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
            <Link href={`/solicitudes/${id}`} className="text-sm text-neutral-600 hover:text-neutral-900">Cancelar</Link>
            <SubmitButton size="lg" pendingText="Confirmando…">Confirmar servicio</SubmitButton>
          </div>
        </ActionForm>
      )}
    </>
  );
}
