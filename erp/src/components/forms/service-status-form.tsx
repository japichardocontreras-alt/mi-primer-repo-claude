"use client";
import { useState } from "react";
import { ActionForm } from "../ui/action-form";
import { Select, Textarea } from "../ui/form";
import { SubmitButton } from "../ui/form-status";
import type { ActionState } from "@/lib/action-state";

export function ServiceStatusForm({ action, version, options }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; version: number; options: { value: string; label: string }[] }) {
  const [to, setTo] = useState("");
  const needsReason = to === "CANCELADO" || to === "INCIDENCIA";
  return (
    <ActionForm action={action} onSuccess={() => setTo("")} className="space-y-3">
      <input type="hidden" name="version" value={version} />
      <Select name="to" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Nuevo estado">
        <option value="">Seleccione…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
      {needsReason && <Textarea name="reason" rows={2} placeholder={to === "CANCELADO" ? "Motivo de la cancelación" : "Describa la incidencia"} aria-label="Motivo" />}
      <SubmitButton size="sm" variant={to === "CANCELADO" ? "danger" : "secondary"} confirmText={to === "CANCELADO" ? "¿Cancelar el servicio? Se conserva en el historial y libera la unidad y el personal." : undefined}>Cambiar estado</SubmitButton>
    </ActionForm>
  );
}
