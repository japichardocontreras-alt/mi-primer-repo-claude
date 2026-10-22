"use client";
import { useContext } from "react";
import { ActionFormContext } from "../ui/action-form-context";

/** Aparece solo cuando el servidor detecta un teléfono ya registrado. */
export function DuplicateConfirm() {
  const ctx = useContext(ActionFormContext);
  if (ctx?.state.code !== "DUPLICATE_PHONE") return null;
  return (
    <label className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <input type="checkbox" name="confirmDuplicate" className="mt-0.5 h-4 w-4 accent-brand-600" />
      Confirmo que es un cliente distinto aunque el teléfono ya esté registrado.
    </label>
  );
}
