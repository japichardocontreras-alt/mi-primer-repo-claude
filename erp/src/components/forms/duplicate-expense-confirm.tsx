"use client";
import { useContext } from "react";
import { ActionFormContext } from "../ui/action-form-context";

export function DuplicateExpenseConfirm() {
  const ctx = useContext(ActionFormContext);
  if (ctx?.state.code !== "DUPLICATE_EXPENSE") return null;
  return (
    <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <input type="checkbox" name="confirmDuplicate" className="mt-0.5 h-4 w-4 accent-brand-600" />
      Confirmo que es un gasto distinto y no un registro duplicado.
    </label>
  );
}
