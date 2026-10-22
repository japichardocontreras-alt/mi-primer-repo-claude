"use client";
import { changePasswordAction } from "./actions";
import { Input } from "@/components/ui/form";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePasswordAction} className="space-y-4" resetOnSuccess>
      <FormField name="current" label="Contraseña actual" required>
        <Input id="current" name="current" type="password" autoComplete="current-password" />
      </FormField>
      <FormField name="password" label="Nueva contraseña" hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </FormField>
      <FormField name="confirm" label="Confirmar nueva contraseña" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
      </FormField>
      <SubmitButton>Actualizar contraseña</SubmitButton>
    </ActionForm>
  );
}
