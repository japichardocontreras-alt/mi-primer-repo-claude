"use client";
import { useState } from "react";
import { ActionForm, FormField } from "../ui/action-form";
import { Input, Select } from "../ui/form";
import { SubmitButton } from "../ui/form-status";
import type { ActionState } from "@/lib/action-state";

export function PayrollEntryForm({ action, today }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; today: string }) {
  const [kind, setKind] = useState("BONO");
  return (
    <ActionForm action={action} resetOnSuccess onSuccess={() => setKind("BONO")} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField name="kind" label="Concepto">
          <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="BONO">Bono</option><option value="HORAS_EXTRA">Horas extra</option><option value="DEDUCCION">Deducción autorizada</option><option value="OTRO">Otro devengo</option>
          </Select>
        </FormField>
        <FormField name="date" label="Fecha"><Input id="date" name="date" type="date" defaultValue={today} /></FormField>
        <FormField name="concept" label="Descripción" className="col-span-2"><Input id="concept" name="concept" placeholder={kind === "DEDUCCION" ? "Ej. daño a mueble, préstamo…" : "Ej. bono de puntualidad"} /></FormField>
        {kind === "HORAS_EXTRA" ? (
          <>
            <FormField name="hours" label="Horas"><Input id="hours" name="hours" inputMode="decimal" /></FormField>
            <FormField name="hourlyRate" label="Pago por hora ($)"><Input id="hourlyRate" name="hourlyRate" inputMode="decimal" className="text-right" /></FormField>
          </>
        ) : (
          <FormField name="amount" label={kind === "DEDUCCION" ? "Importe a descontar ($)" : "Importe ($)"}><Input id="amount" name="amount" inputMode="decimal" className="text-right" /></FormField>
        )}
      </div>
      <SubmitButton size="sm">Registrar concepto</SubmitButton>
    </ActionForm>
  );
}
