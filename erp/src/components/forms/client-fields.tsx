import type { Client } from "@prisma/client";
import { FormField } from "../ui/action-form";
import { Input, Select, Textarea } from "../ui/form";
import { CHANNEL } from "@/lib/domain/labels";
import { DuplicateConfirm } from "./duplicate-confirm";

export function ClientFields({ c }: { c?: Client | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField name="name" label="Nombre completo" required className="sm:col-span-2"><Input id="name" name="name" defaultValue={c?.name ?? ""} /></FormField>
      <FormField name="phone" label="Teléfono" required><Input id="phone" name="phone" type="tel" defaultValue={c?.phone ?? ""} /></FormField>
      <FormField name="email" label="Correo electrónico"><Input id="email" name="email" type="email" defaultValue={c?.email ?? ""} /></FormField>
      <FormField name="channel" label="¿Cómo nos conoció / contactó?">
        <Select id="channel" name="channel" defaultValue={c?.channel ?? ""}>
          <option value="">Sin especificar</option>
          {Object.entries(CHANNEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      <FormField name="notes" label="Notas" className="sm:col-span-2"><Textarea id="notes" name="notes" rows={3} defaultValue={c?.notes ?? ""} /></FormField>
      <div className="sm:col-span-2"><DuplicateConfirm /></div>
    </div>
  );
}
