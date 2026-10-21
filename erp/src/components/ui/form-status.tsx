"use client";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { ActionFormContext } from "./action-form-context";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./button";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingText = "Guardando…", variant, size, className, confirmText }: {
  children: React.ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "outline" | "danger" | "ghost"; size?: "sm" | "md" | "lg"; className?: string;
  /** Si se indica, pide confirmación antes de enviar (p.ej. eliminar). */
  confirmText?: string;
}) {
  const status = useFormStatus();
  const ctx = React.useContext(ActionFormContext);
  const pending = status.pending || !!ctx?.pending;
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (!state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800",
        className,
      )}
    >
      {state.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{state.message}</span>
    </div>
  );
}
