import type { Worker } from "@prisma/client";
import { FormField } from "../ui/action-form";
import { Checkbox, Input, Select, Textarea } from "../ui/form";
import { PAY_TYPE, POSITION } from "@/lib/domain/workers";

export function WorkerFields({ w, showMoney = true }: { w?: Worker | null; showMoney?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField name="fullName" label="Nombre completo" required className="sm:col-span-2"><Input id="fullName" name="fullName" defaultValue={w?.fullName ?? ""} /></FormField>
      <FormField name="phone" label="Teléfono"><Input id="phone" name="phone" type="tel" defaultValue={w?.phone ?? ""} /></FormField>
      <FormField name="position" label="Puesto" required>
        <Select id="position" name="position" defaultValue={w?.position ?? ""}>
          <option value="">Seleccione…</option>
          {Object.entries(POSITION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      <FormField name="hireDate" label="Fecha de ingreso"><Input id="hireDate" name="hireDate" type="date" defaultValue={w?.hireDate?.toISOString().slice(0, 10) ?? ""} /></FormField>
      <FormField name="payType" label="Tipo de pago" required>
        <Select id="payType" name="payType" defaultValue={w?.payType ?? "POR_SERVICIO"}>
          {Object.entries(PAY_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      {showMoney ? (
        <FormField name="baseSalary" label="Sueldo base (MXN)" hint="Por periodo según el tipo de pago; 0 si solo cobra por servicio.">
          <Input id="baseSalary" name="baseSalary" inputMode="decimal" defaultValue={w ? Number(w.baseSalary).toFixed(2) : "0"} className="text-right tabular-nums" />
        </FormField>
      ) : (
        <input type="hidden" name="baseSalary" value={w ? Number(w.baseSalary).toFixed(2) : "0"} />
      )}
      <div className="flex items-end pb-2"><Checkbox name="active" defaultChecked={w ? w.active : true} label="Activo" /></div>
      <FormField name="notes" label="Observaciones" className="sm:col-span-2"><Textarea id="notes" name="notes" rows={3} defaultValue={w?.notes ?? ""} /></FormField>
    </div>
  );
}
