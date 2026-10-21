import type { Vehicle } from "@prisma/client";
import { FormField } from "../ui/action-form";
import { Input, Select, Textarea } from "../ui/form";
import { FormSection } from "./form-section";
import { VEHICLE_STATUS } from "@/lib/domain/fleet";

const n = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function VehicleFields({ v, showMoney, lockInitial }: { v?: Vehicle | null; showMoney: boolean; lockInitial?: boolean }) {
  return (
    <>
      <FormSection title="Identificación">
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField name="code" label="ID de unidad" required hint="Ej. F350-1"><Input id="code" name="code" defaultValue={v?.code ?? ""} /></FormField>
          <FormField name="name" label="Nombre" required className="sm:col-span-2"><Input id="name" name="name" defaultValue={v?.name ?? ""} /></FormField>
          <FormField name="status" label="Estado operativo">
            <Select id="status" name="status" defaultValue={v?.status ?? "ACTIVA"}>{Object.entries(VEHICLE_STATUS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</Select>
          </FormField>
          <FormField name="brand" label="Marca"><Input id="brand" name="brand" defaultValue={v?.brand ?? ""} /></FormField>
          <FormField name="model" label="Modelo"><Input id="model" name="model" defaultValue={v?.model ?? ""} /></FormField>
          <FormField name="year" label="Año"><Input id="year" name="year" type="number" defaultValue={n(v?.year)} /></FormField>
          <FormField name="capacity" label="Capacidad"><Input id="capacity" name="capacity" defaultValue={v?.capacity ?? ""} placeholder="Ej. 3.5 t / 20 m³" /></FormField>
          <FormField name="plates" label="Placas"><Input id="plates" name="plates" defaultValue={v?.plates ?? ""} /></FormField>
          <FormField name="vin" label="Número de serie" className="sm:col-span-2"><Input id="vin" name="vin" defaultValue={v?.vin ?? ""} /></FormField>
          <FormField name="gps" label="GPS"><Input id="gps" name="gps" defaultValue={v?.gps ?? ""} placeholder="Proveedor / ID de equipo" /></FormField>
        </div>
      </FormSection>
      <FormSection title="Kilometraje y rendimiento">
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField name="initialOdometer" label="Kilometraje inicial" hint={lockInitial ? "No editable: ya hay lecturas registradas." : "Al darla de alta en el sistema."}>
            <Input id="initialOdometer" name="initialOdometer" type="number" min={0} defaultValue={n(v?.initialOdometer ?? "")} readOnly={lockInitial} />
          </FormField>
          <FormField name="estimatedKmPerLiter" label="Rendimiento estimado (km/L)"><Input id="estimatedKmPerLiter" name="estimatedKmPerLiter" inputMode="decimal" defaultValue={n(v?.estimatedKmPerLiter)} /></FormField>
        </div>
      </FormSection>
      {showMoney ? (
        <FormSection title="Adquisición y depreciación" description="Necesario para calcular la depreciación (lineal por tiempo y por kilómetro).">
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField name="acquisitionDate" label="Fecha de adquisición"><Input id="acquisitionDate" name="acquisitionDate" type="date" defaultValue={v?.acquisitionDate?.toISOString().slice(0, 10) ?? ""} /></FormField>
            <FormField name="acquisitionPrice" label="Precio de adquisición"><Input id="acquisitionPrice" name="acquisitionPrice" inputMode="decimal" className="text-right" defaultValue={n(v?.acquisitionPrice)} /></FormField>
            <FormField name="residualValue" label="Valor residual estimado"><Input id="residualValue" name="residualValue" inputMode="decimal" className="text-right" defaultValue={n(v?.residualValue)} /></FormField>
            <div />
            <FormField name="usefulLifeYears" label="Vida útil (años)"><Input id="usefulLifeYears" name="usefulLifeYears" type="number" min={1} defaultValue={n(v?.usefulLifeYears)} /></FormField>
            <FormField name="usefulLifeKm" label="Vida útil estimada (km)"><Input id="usefulLifeKm" name="usefulLifeKm" type="number" min={1000} defaultValue={n(v?.usefulLifeKm)} /></FormField>
          </div>
        </FormSection>
      ) : (
        <>
          {["acquisitionDate", "acquisitionPrice", "residualValue", "usefulLifeYears", "usefulLifeKm"].map((k) => {
            const val = v?.[k as keyof Vehicle];
            return <input key={k} type="hidden" name={k} value={val instanceof Date ? val.toISOString().slice(0, 10) : n(val)} />;
          })}
        </>
      )}
      <FormSection title="Notas"><Textarea name="notes" rows={2} defaultValue={v?.notes ?? ""} aria-label="Notas" /></FormSection>
    </>
  );
}
