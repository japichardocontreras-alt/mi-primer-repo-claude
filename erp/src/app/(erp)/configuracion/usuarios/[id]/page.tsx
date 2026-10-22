import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { PERMISSIONS, ROLE_ADMIN, type PermissionKey } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { updateUserAction, resetPasswordAction, revokeSessionsAction, saveUserPermissionsAction } from "../../actions";

export const metadata = { title: "Usuario" };

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("config.usuarios");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await prisma.user.findUnique({
    where: { id },
    include: { role: { include: { permissions: { include: { permission: true } } } }, permissions: { include: { permission: true } } },
  });
  if (!user) notFound();
  const [roles, sessions, allPerms] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.session.findMany({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] }),
  ]);
  const rolePerms = new Set(user.role.permissions.map((p) => p.permission.key));
  const overrides = new Map(user.permissions.map((p) => [p.permission.key, p.granted]));
  const isAdminRole = user.role.key === ROLE_ADMIN;

  return (
    <div className="space-y-6">
      <Link href="/configuracion/usuarios" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Usuarios</Link>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={user.name} description={`Último acceso: ${formatDateTime(user.lastLoginAt)}`} />
          <CardBody>
            <ActionForm action={updateUserAction.bind(null, user.id)}>
              <input type="hidden" name="version" value={user.version} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField name="name" label="Nombre completo" required className="sm:col-span-2"><Input id="name" name="name" defaultValue={user.name} /></FormField>
                <FormField name="email" label="Correo" required><Input id="email" name="email" type="email" defaultValue={user.email} /></FormField>
                <FormField name="roleId" label="Rol" required>
                  <Select id="roleId" name="roleId" defaultValue={user.roleId}>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </FormField>
                <Checkbox name="active" defaultChecked={user.active} label="Usuario activo" disabled={user.id === actor.id} />
              </div>
              <div className="mt-5"><SubmitButton>Guardar cambios</SubmitButton></div>
            </ActionForm>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Restablecer contraseña" description="Cierra sus sesiones y le obliga a definir una nueva al entrar." />
            <CardBody>
              <ActionForm action={resetPasswordAction.bind(null, user.id)} resetOnSuccess>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <FormField name="password" label="Contraseña temporal" className="flex-1"><Input id="password" name="password" type="text" autoComplete="new-password" /></FormField>
                  <SubmitButton variant="outline" confirmText={`¿Restablecer la contraseña de ${user.name}?`}>Restablecer</SubmitButton>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Sesiones abiertas" description={`${sessions.length} sesión(es) vigente(s)`} />
            {sessions.length > 0 && (
              <Table>
                <thead><tr><Th>Inicio</Th><Th>Última actividad</Th><Th>IP</Th></tr></thead>
                <tbody>
                  {sessions.map((s) => (
                    <Tr key={s.id}><Td>{formatDateTime(s.createdAt)}</Td><Td>{formatDateTime(s.lastSeenAt)}</Td><Td>{s.ip ?? "—"}</Td></Tr>
                  ))}
                </tbody>
              </Table>
            )}
            <CardBody>
              <ActionForm action={revokeSessionsAction.bind(null, user.id)}>
                <SubmitButton variant="danger" size="sm" confirmText="¿Cerrar todas las sesiones de este usuario?">Cerrar sesiones</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>

      {can(actor, "config.permisos") && (
        <Card>
          <CardHeader
            title="Permisos individuales"
            description={isAdminRole ? "El rol Administrador tiene todos los permisos; no requiere ajustes individuales." : "Ajustes sobre los permisos de su rol. «Rol» = hereda lo que define el rol."}
          />
          {!isAdminRole && (
            <CardBody>
              <ActionForm action={saveUserPermissionsAction.bind(null, user.id)}>
                <Table>
                  <thead><tr><Th>Módulo</Th><Th>Permiso</Th><Th>Por rol</Th><Th>Ajuste</Th></tr></thead>
                  <tbody>
                    {allPerms.map((p) => {
                      const o = overrides.get(p.key);
                      return (
                        <Tr key={p.key}>
                          <Td className="text-neutral-500">{p.module}</Td>
                          <Td>{PERMISSIONS[p.key as PermissionKey]?.description ?? p.description}</Td>
                          <Td>{rolePerms.has(p.key) ? <Badge tone="green">Sí</Badge> : <Badge>No</Badge>}</Td>
                          <Td>
                            <Select name={`perm:${p.key}`} defaultValue={o === undefined ? "rol" : o ? "conceder" : "revocar"} className="h-8 w-36 text-xs">
                              <option value="rol">Rol</option>
                              <option value="conceder">Conceder</option>
                              <option value="revocar">Revocar</option>
                            </Select>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
                <div className="mt-4"><SubmitButton>Guardar permisos</SubmitButton></div>
              </ActionForm>
            </CardBody>
          )}
        </Card>
      )}
    </div>
  );
}
