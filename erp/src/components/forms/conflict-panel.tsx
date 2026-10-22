"use client";
import { useContext } from "react";
import { AlertTriangle } from "lucide-react";
import { ActionFormContext } from "../ui/action-form-context";

/** Aparece cuando el servidor detecta empalmes; solo el administrador puede autorizarlos. */
export function ConflictPanel({ canOverride }: { canOverride: boolean }) {
  const ctx = useContext(ActionFormContext);
  if (ctx?.state.code !== "CONFLICT") return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Empalme de horario</p>
      <p className="mt-1">Cambie la fecha, la unidad o el personal. {canOverride ? "Si es indispensable, puede autorizarlo de forma excepcional (queda registrado en auditoría)." : "Solo un administrador puede autorizar empalmes."}</p>
      {canOverride && (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2"><input type="checkbox" name="authorize" className="h-4 w-4 accent-brand-600" /> Autorizar excepcionalmente</label>
          <textarea name="overrideReason" rows={2} placeholder="Motivo de la autorización" className="block w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm" />
        </div>
      )}
    </div>
  );
}
