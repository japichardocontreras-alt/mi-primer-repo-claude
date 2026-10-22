import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { createUserAction } from "../../actions";

export const metadata = { title: "Nuevo usuario" };

export default async function NewUserPage() {
  await requirePermission("config.usuarios");
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Nuevo usuario" description="El usuario deberá definir su propia contraseña en el primer inicio de sesión." />
      <CardBody>
        <ActionForm action={createUserAction} redirectTo="/configuracion/usuarios">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="name" label="Nombre completo" required className="sm:col-span-2"><Input id="name" name="name" /></FormField>
            <FormField name="email" label="Correo (usuario)" required><Input id="email" name="email" type="email" autoComplete="off" /></FormField>
            <FormField name="roleId" label="Rol" required>
              <Select id="roleId" name="roleId" defaultValue={roles.find((r) => r.key === "ADMINISTRATIVO")?.id}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </FormField>
            <FormField name="password" label="Contraseña temporal" required hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`} className="sm:col-span-2">
              <Input id="password" name="password" type="text" autoComplete="new-password" />
            </FormField>
          </div>
          <div className="mt-5 flex gap-3">
            <SubmitButton>Crear usuario</SubmitButton>
            <Link href="/configuracion/usuarios" className="inline-flex h-9 items-center px-3 text-sm text-neutral-600 hover:text-neutral-900">Cancelar</Link>
          </div>
        </ActionForm>
      </CardBody>
    </Card>
  );
}
