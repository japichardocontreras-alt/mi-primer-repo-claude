import Link from "next/link";
import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { formatDateTime } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Table, Th, Td, Tr } from "@/components/ui/table";

export const metadata = { title: "Usuarios" };

export default async function UsersPage() {
  await requirePermission("config.usuarios");
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <Card>
      <CardHeader
        title="Usuarios del sistema"
        description={`${users.filter((u) => u.active).length} activo(s) de ${users.length}`}
        actions={<Link href="/configuracion/usuarios/nuevo" className={buttonClass("primary", "sm")}><UserPlus className="h-4 w-4" /> Nuevo usuario</Link>}
      />
      <Table>
        <thead><tr><Th>Nombre</Th><Th>Correo</Th><Th>Rol</Th><Th>Estado</Th><Th>Último acceso</Th></tr></thead>
        <tbody>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td><Link href={`/configuracion/usuarios/${u.id}`} className="font-medium text-neutral-900 hover:text-brand-600">{u.name}</Link></Td>
              <Td>{u.email}</Td>
              <Td><Badge tone={u.role.key === "ADMINISTRADOR" ? "dark" : "neutral"}>{u.role.name}</Badge></Td>
              <Td>
                {!u.active ? <Badge tone="red">Inactivo</Badge> : u.lockedUntil && u.lockedUntil > new Date() ? <Badge tone="amber">Bloqueado</Badge> : <Badge tone="green">Activo</Badge>}
                {u.mustChangePassword && <Badge tone="amber" className="ml-1">Cambio de contraseña pendiente</Badge>}
              </Td>
              <Td className="whitespace-nowrap">{formatDateTime(u.lastLoginAt)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
