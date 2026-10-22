import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { mexicoParts } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { FormSection } from "@/components/forms/form-section";
import { RequestFields } from "@/components/forms/request-fields";
import { QuoteFields } from "@/components/forms/quote-fields";
import { ClientPicker } from "@/components/forms/client-picker";
import { Input } from "@/components/ui/form";
import { createRequestAction, searchClientsAction } from "../actions";

export const metadata = { title: "Nueva solicitud" };

export default async function NuevaSolicitud({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const user = await requirePermission("solicitudes.crear");
  const { cliente } = await searchParams;
  const [vehicles, op, preset] = await Promise.all([
    prisma.vehicle.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getSetting(prisma, "operacion"),
    cliente && /^[0-9a-f-]{36}$/i.test(cliente) ? prisma.client.findUnique({ where: { id: cliente } }) : null,
  ]);
  const p = mexicoParts();
  const valid = new Date(Date.UTC(p.year, p.month - 1, p.day + op.vigenciaCotizacionDias)).toISOString().slice(0, 10);

  return (
    <>
      <Link href="/solicitudes" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Solicitudes</Link>
      <PageHeader title="Nueva solicitud" description="El folio se asigna automáticamente al guardar." />
      <ActionForm action={createRequestAction} messagePosition="top">
        <Card>
          <FormSection title="Cliente">
            <ClientPicker search={searchClientsAction} initial={preset ? { id: preset.id, code: preset.code, name: preset.name, phone: preset.phone } : null} />
          </FormSection>
          <RequestFields vehicles={vehicles} />
          {can(user, "solicitudes.cotizar") && (
            <FormSection title="Precio cotizado (opcional)" description="Captura manual. Si lo deja vacío, la solicitud queda como «Nueva solicitud» y puede cotizarse después; cada cambio de precio se guarda como una nueva versión.">
              <QuoteFields notesName="quoteNotes" defaultValidUntil={valid} />
            </FormSection>
          )}
          <FormSection title="Fotografías y archivos" description="Fotos, videos, PDF u Office. Máximo 50 MB por archivo.">
            <FormField name="files" label="Adjuntar">
              <Input id="files" name="files" type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className="h-auto py-1.5" />
            </FormField>
          </FormSection>
        </Card>
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <Link href="/solicitudes" className="text-sm text-neutral-600 hover:text-neutral-900">Cancelar</Link>
          <SubmitButton size="lg">Registrar solicitud</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
