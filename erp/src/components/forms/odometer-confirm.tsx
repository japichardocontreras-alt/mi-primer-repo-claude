"use client";
import { useContext } from "react";
import { ActionFormContext } from "../ui/action-form-context";

/** Si el servidor detecta km que no cuadran con la lectura anterior, pide confirmación explícita por unidad. */
export function OdometerConfirm({ vehicleId, name }: { vehicleId: string; name: string }) {
  const ctx = useContext(ActionFormContext);
  if (ctx?.state.code !== "ODOMETER_GAP" || !ctx.state.message?.includes(name)) return null;
  return (
    <label className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <input type="checkbox" name={`gap_${vehicleId}`} className="mt-0.5 h-4 w-4 accent-brand-600" />
      Confirmo que el kilometraje de {name} es correcto (p. ej. la unidad se movió sin servicio registrado). Si el kilometraje retrocede, explique el motivo en las observaciones.
    </label>
  );
}
