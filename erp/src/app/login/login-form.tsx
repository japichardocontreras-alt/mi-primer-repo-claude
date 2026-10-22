"use client";
import { loginAction } from "./actions";
import { Input } from "@/components/ui/form";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormField name="email" label="Correo electrónico">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </FormField>
      <FormField name="password" label="Contraseña">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      <SubmitButton className="w-full" size="lg" pendingText="Verificando…">Iniciar sesión</SubmitButton>
    </ActionForm>
  );
}
