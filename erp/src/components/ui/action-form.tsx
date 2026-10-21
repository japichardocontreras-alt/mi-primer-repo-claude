"use client";
import * as React from "react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initialState, type ActionState } from "@/lib/action-state";
import { Field } from "./form";
import { FormMessage } from "./form-status";
import { ActionFormContext } from "./action-form-context";


/**
 * Formulario genérico conectado a una server action.
 * - Conserva lo capturado cuando hay errores (React 19 reinicia los <form action> por defecto).
 * - Los hijos pueden ser JSX del servidor; los errores por campo se leen con <FormField>.
 */
export function ActionForm({
  action, children, className, resetOnSuccess, redirectTo, onSuccess, messagePosition = "bottom",
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  redirectTo?: string;
  /** Se ejecuta tras cada respuesta exitosa (p.ej. reiniciar estado local). */
  onSuccess?: () => void;
  messagePosition?: "top" | "bottom";
}) {
  const [state, formAction, actionPending] = useActionState(async (prev: ActionState, fd: FormData) => {
    try {
      return await action(prev, fd);
    } catch (e) {
      if (isNavigation(e)) throw e;
      return connectionFailure();
    }
  }, initialState);
  const [transitionPending, startTransition] = useTransition();
  const pending = actionPending || transitionPending;
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok || !state.at) return;
    if (resetOnSuccess) ref.current?.reset();
    onSuccess?.();
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <ActionFormContext.Provider value={{ state, pending }}>
      <form
        ref={ref}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(fd));
        }}
      >
        {messagePosition === "top" && <FormMessage state={state} className="mb-4" />}
        {children}
        {messagePosition === "bottom" && <FormMessage state={state} className="mt-4" />}
      </form>
    </ActionFormContext.Provider>
  );
}

/** Redirecciones de Next (redirect/notFound) deben seguir su curso. */
function isNavigation(e: unknown) {
  const d = (e as { digest?: unknown } | null)?.digest;
  return typeof d === "string" && (d.startsWith("NEXT_REDIRECT") || d.startsWith("NEXT_HTTP_ERROR_FALLBACK") || d === "NEXT_NOT_FOUND");
}

/** La petición no llegó o la respuesta del servidor no fue válida: lo capturado se conserva para reintentar. */
function connectionFailure(): ActionState {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return {
    ok: false,
    code: "CONNECTION",
    at: Date.now(),
    message: offline
      ? "Sin conexión a internet. Lo capturado se conserva; vuelva a intentar cuando se restablezca."
      : "No se pudo comunicar con el servidor. Lo capturado se conserva; vuelva a intentar en unos momentos.",
  };
}

export function FormField({ name, ...p }: Omit<React.ComponentProps<typeof Field>, "error"> & { name: string }) {
  const ctx = React.useContext(ActionFormContext);
  return <Field {...p} htmlFor={p.htmlFor ?? name} error={ctx?.state.fieldErrors?.[name]} />;
}
