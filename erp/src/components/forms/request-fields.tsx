import type { Address, Request } from "@prisma/client";
import { FormField } from "../ui/action-form";
import { Checkbox, Input, Select, Textarea } from "../ui/form";
import { AddressFields } from "./address-fields";
import { FormSection } from "./form-section";
import { CHANNEL, PACKAGE, SERVICE_TYPE } from "@/lib/domain/labels";

type Defaults = (Request & { originAddress: Address | null; destinationAddress: Address | null }) | null;
const num = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const dateOnly = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Campos de la solicitud (compartidos por «nueva» y «editar»). */
export function RequestFields({ r, vehicles }: { r?: Defaults; vehicles: { id: string; name: string }[] }) {
  return (
    <>
      <FormSection title="Datos del servicio">
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField name="channel" label="Canal de contacto" required>
            <Select id="channel" name="channel" defaultValue={r?.channel ?? "WHATSAPP"}>
              {Object.entries(CHANNEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          <FormField name="serviceType" label="Tipo de servicio" required>
            <Select id="serviceType" name="serviceType" defaultValue={r?.serviceType ?? ""}>
              <option value="">Seleccione…</option>
              {Object.entries(SERVICE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          <FormField name="tentativeDate" label="Fecha tentativa"><Input id="tentativeDate" name="tentativeDate" type="date" defaultValue={dateOnly(r?.tentativeDate)} /></FormField>
          <FormField name="tentativeTime" label="Hora tentativa"><Input id="tentativeTime" name="tentativeTime" type="time" defaultValue={r?.tentativeTime ?? ""} /></FormField>
          <FormField name="package" label="Paquete solicitado">
            <Select id="package" name="package" defaultValue={r?.package ?? ""}>
              <option value="">Sin definir</option>
              {Object.entries(PACKAGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          <FormField name="suggestedVehicleId" label="Unidad sugerida">
            <Select id="suggestedVehicleId" name="suggestedVehicleId" defaultValue={r?.suggestedVehicleId ?? ""}>
              <option value="">Sin definir</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </FormField>
          <div className="flex items-end pb-2 sm:col-span-2">
            <Checkbox name="needsPacking" defaultChecked={r?.needsPacking ?? false} label="Requiere embalaje" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Datos de carga" description="Dónde se recogen los artículos.">
        <AddressFields prefix="orig_" a={r ? r.originAddress : undefined} />
      </FormSection>

      <FormSection title="Datos de descarga" description="Dónde se entregan los artículos.">
        <AddressFields prefix="dest_" a={r ? r.destinationAddress : undefined} defaultState="" />
      </FormSection>

      <FormSection title="Información adicional">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="inventorySummary" label="Inventario general"><Textarea id="inventorySummary" name="inventorySummary" rows={4} defaultValue={r?.inventorySummary ?? ""} placeholder="Ej. sala 3-2-1, comedor 6 sillas, refrigerador, lavadora, 20 cajas…" /></FormField>
          <FormField name="itemsDescription" label="Descripción de los artículos"><Textarea id="itemsDescription" name="itemsDescription" rows={4} defaultValue={r?.itemsDescription ?? ""} placeholder="Artículos frágiles, voluminosos o de valor…" /></FormField>
          <FormField name="specialManeuvers" label="Maniobras especiales"><Textarea id="specialManeuvers" name="specialManeuvers" rows={2} defaultValue={r?.specialManeuvers ?? ""} placeholder="Subir por fachada, desarmado, piano…" /></FormField>
          <FormField name="observations" label="Observaciones"><Textarea id="observations" name="observations" rows={2} defaultValue={r?.observations ?? ""} /></FormField>
        </div>
      </FormSection>

      <FormSection title="Estimaciones (opcional)" description="Datos de referencia; también alimentarán al cotizador automático cuando se incorpore.">
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField name="estimatedKm" label="Kilómetros estimados"><Input id="estimatedKm" name="estimatedKm" type="number" step="0.1" min={0} defaultValue={num(r?.estimatedKm)} /></FormField>
          <FormField name="estimatedVolumeM3" label="Volumen estimado (m³)"><Input id="estimatedVolumeM3" name="estimatedVolumeM3" type="number" step="0.1" min={0} defaultValue={num(r?.estimatedVolumeM3)} /></FormField>
          <FormField name="requiredStaff" label="Personal requerido"><Input id="requiredStaff" name="requiredStaff" type="number" min={0} defaultValue={num(r?.requiredStaff)} /></FormField>
          <FormField name="estimatedExpenses" label="Gastos estimados ($)"><Input id="estimatedExpenses" name="estimatedExpenses" inputMode="decimal" defaultValue={num(r?.estimatedExpenses)} /></FormField>
        </div>
      </FormSection>
    </>
  );
}
