"use client";
import { useState } from "react";
import { ActionForm, FormField } from "../ui/action-form";
import { Input, Select, Textarea } from "../ui/form";
import { SubmitButton } from "../ui/form-status";
import { CHANNEL, REQUEST_STATUS, type RequestStatusKey } from "@/lib/domain/labels";
import type { ActionState } from "@/lib/action-state";

/** Registro de seguimiento: contacto, nota, próxima fecha y cambio de estado. */
export function FollowUpForm({ action, current, nowLocal }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; current: RequestStatusKey; nowLocal: string }) {
  const [status, setStatus] = useState("");
  const [contacted, setContacted] = useState(true);
  return (
    <ActionForm action={action} resetOnSuccess onSuccess={() => { setStatus(""); setContacted(true); }} className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input type="checkbox" checked={contacted} onChange={(e) => setContacted(e.target.checked)} className="h-4 w-4 accent-brand-600" />
        Hubo contacto con el cliente
      </label>
      {contacted && (
        <div className="grid grid-cols-2 gap-3">
          <FormField name="contactAt" label="Fecha del contacto"><Input id="contactAt" name="contactAt" type="datetime-local" defaultValue={nowLocal} /></FormField>
          <FormField name="channel" label="Medio">
            <Select id="channel" name="channel" defaultValue="WHATSAPP">
              {Object.entries(CHANNEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
        </div>
      )}
      <FormField name="notes" label="Notas de seguimiento"><Textarea id="notes" name="notes" rows={3} placeholder="Qué se habló, dudas del cliente, acuerdos…" /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField name="nextContactAt" label="Próximo contacto"><Input id="nextContactAt" name="nextContactAt" type="datetime-local" /></FormField>
        <FormField name="newStatus" label="Cambiar estado">
          <Select id="newStatus" name="newStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Sin cambio</option>
            {Object.entries(REQUEST_STATUS)
              .filter(([k]) => k !== current && k !== "CONFIRMADA")
              .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
      </div>
      {status === "NO_CONCRETADA" && (
        <FormField name="lostReason" label="Motivo por el que no se concretó" required>
          <Textarea id="lostReason" name="lostReason" rows={2} placeholder="Precio, eligió otra empresa, canceló su mudanza, sin respuesta…" />
        </FormField>
      )}
      {status === "CANCELADA" && (
        <FormField name="cancelReason" label="Motivo de la cancelación" required><Textarea id="cancelReason" name="cancelReason" rows={2} /></FormField>
      )}
      <p className="text-xs text-neutral-500">Para confirmar use «Confirmar y convertir en servicio» (genera el folio MM y lo coloca en la agenda).</p>
      <SubmitButton size="sm">Registrar seguimiento</SubmitButton>
    </ActionForm>
  );
}
