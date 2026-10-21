"use client";
import { useContext } from "react";
import { ActionFormContext } from "../ui/action-form-context";

/** Casilla de confirmación que aparece solo cuando el servidor responde con el código indicado. */
export function CodeConfirm({ code, name = "confirm", label }: { code: string; name?: string; label: string }) {
  const ctx = useContext(ActionFormContext);
  if (ctx?.state.code !== code) return null;
  return (
    <label className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <input type="checkbox" name={name} className="mt-0.5 h-4 w-4 accent-brand-600" />
      {label}
    </label>
  );
}
