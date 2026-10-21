import { FormField } from "../ui/action-form";
import { Input, Select, Textarea } from "../ui/form";

type Addr = {
  street?: string | null; extNumber?: string | null; intNumber?: string | null; neighborhood?: string | null; municipality?: string | null;
  state?: string | null; postalCode?: string | null; references?: string | null; floor?: number | null; hasElevator?: boolean | null; accessConditions?: string | null;
} | null;

/** Campos de dirección con prefijo (orig_ / dest_). */
export function AddressFields({ prefix, a, defaultState = "Estado de México" }: { prefix: "orig_" | "dest_"; a?: Addr; defaultState?: string }) {
  const n = (k: string) => `${prefix}${k}`;
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <FormField name={n("street")} label="Calle" className="sm:col-span-3"><Input id={n("street")} name={n("street")} defaultValue={a?.street ?? ""} /></FormField>
      <FormField name={n("extNumber")} label="No. exterior" className="sm:col-span-1"><Input id={n("extNumber")} name={n("extNumber")} defaultValue={a?.extNumber ?? ""} /></FormField>
      <FormField name={n("intNumber")} label="No. interior" className="sm:col-span-2"><Input id={n("intNumber")} name={n("intNumber")} defaultValue={a?.intNumber ?? ""} /></FormField>
      <FormField name={n("neighborhood")} label="Colonia" className="sm:col-span-2"><Input id={n("neighborhood")} name={n("neighborhood")} defaultValue={a?.neighborhood ?? ""} /></FormField>
      <FormField name={n("municipality")} label="Municipio" className="sm:col-span-2"><Input id={n("municipality")} name={n("municipality")} defaultValue={a?.municipality ?? ""} /></FormField>
      <FormField name={n("state")} label="Estado" className="sm:col-span-1"><Input id={n("state")} name={n("state")} defaultValue={a ? a.state ?? "" : defaultState} /></FormField>
      <FormField name={n("postalCode")} label="C.P." className="sm:col-span-1"><Input id={n("postalCode")} name={n("postalCode")} inputMode="numeric" maxLength={5} defaultValue={a?.postalCode ?? ""} /></FormField>
      <FormField name={n("floor")} label="Piso" className="sm:col-span-1"><Input id={n("floor")} name={n("floor")} type="number" defaultValue={a?.floor ?? ""} /></FormField>
      <FormField name={n("hasElevator")} label="Elevador" className="sm:col-span-1">
        <Select id={n("hasElevator")} name={n("hasElevator")} defaultValue={a?.hasElevator === true ? "si" : a?.hasElevator === false ? "no" : ""}>
          <option value="">—</option><option value="si">Sí</option><option value="no">No</option>
        </Select>
      </FormField>
      <FormField name={n("references")} label="Referencias" className="sm:col-span-4"><Input id={n("references")} name={n("references")} defaultValue={a?.references ?? ""} /></FormField>
      <FormField name={n("accessConditions")} label="Condiciones especiales de acceso" className="sm:col-span-6">
        <Textarea id={n("accessConditions")} name={n("accessConditions")} rows={2} defaultValue={a?.accessConditions ?? ""} placeholder="Calle cerrada, escaleras angostas, horario de acceso, distancia al camión…" />
      </FormField>
    </div>
  );
}
