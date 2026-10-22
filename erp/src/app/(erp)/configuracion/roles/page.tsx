import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { ROLE_ADMIN } from "@/lib/auth/permissions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { saveRolePermissionsAction } from "../actions";

export const metadata = { title: "Roles y permisos" };

export default async function RolesPage() {
  await requirePermission("config.permisos");
  const [roles, perms] = await Promise.all([
    prisma.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: "asc" } }),
    prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] }),
  ]);
  const modules = [...new Set(perms.map((p) => p.module))];
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {roles.map((role) => {
        const has = new Set(role.permissions.map((p) => p.permission.key));
        const locked = role.key === ROLE_ADMIN;
        return (
          <Card key={role.id}>
            <CardHeader title={role.name} description={`${role.description ?? ""} · ${role._count.users} usuario(s)`} />
            <CardBody>
              <ActionForm action={saveRolePermissionsAction.bind(null, role.id)}>
                <fieldset disabled={locked} className="space-y-4">
                  {modules.map((m) => (
                    <div key={m}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">{m}</p>
                      <div className="grid gap-1.5">
                        {perms.filter((p) => p.module === m).map((p) => (
                          <label key={p.key} className="flex items-center gap-2 text-sm text-neutral-800">
                            <input type="checkbox" name={`perm:${p.key}`} defaultChecked={locked || has.has(p.key)} className="h-4 w-4 accent-brand-600" />
                            {p.description}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </fieldset>
                {locked ? (
                  <p className="mt-4 text-xs text-neutral-500">El rol Administrador siempre conserva todos los permisos.</p>
                ) : (
                  <div className="mt-5"><SubmitButton>Guardar permisos del rol</SubmitButton></div>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
