import { FormField } from "../ui/action-form";
import { Checkbox, Input, Textarea } from "../ui/form";

/** Campos de precio cotizado manual. */
export function QuoteFields({ priceName = "price", notesName = "notes", defaultValidUntil }: { priceName?: string; notesName?: string; defaultValidUntil?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <FormField name={priceName} label="Precio cotizado (MXN)">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">$</span>
          <Input id={priceName} name={priceName} inputMode="decimal" placeholder="0.00" className="pl-6 text-right font-semibold tabular-nums" />
        </div>
      </FormField>
      <FormField name="validUntil" label="Vigencia hasta"><Input id="validUntil" name="validUntil" type="date" defaultValue={defaultValidUntil} /></FormField>
      <div className="flex items-end pb-2 sm:col-span-2"><Checkbox name="includesVat" label="El precio incluye IVA" /></div>
      <FormField name={notesName} label="Observaciones de la cotización" className="sm:col-span-4">
        <Textarea id={notesName} name={notesName} rows={2} placeholder="Qué incluye, condiciones, forma de pago…" />
      </FormField>
    </div>
  );
}
