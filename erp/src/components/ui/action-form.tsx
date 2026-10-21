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
  action, children, className, resetOnSuccess, redirectTo, messagePosition = "bottom",
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  redirectTo?: string;
  messagePosition?: "top" | "bottom";
}) {
  const [state, formAction, actionPending] = useActionState(action, initialState);
  const [transitionPending, startTransition] = useTransition();
  const pending = actionPending || transitionPending;
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok || !state.at) return;
    if (resetOnSuccess) ref.current?.reset();
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }, [state, resetOnSuccess, redirectTo, router]);

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

export function FormField({ name, ...p }: Omit<React.ComponentProps<typeof Field>, "error"> & { name: string }) {
  const ctx = React.useContext(ActionFormContext);
  return <Field {...p} htmlFor={p.htmlFor ?? name} error={ctx?.state.fieldErrors?.[name]} />;
}
