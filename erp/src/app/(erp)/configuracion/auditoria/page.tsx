import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { formatDateTime } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Auditoría" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entidad?: string; usuario?: string; accion?: string; p?: string }> }) {
  await requirePermission("auditoria.ver");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.entidad ? { entity: sp.entidad } : {}),
    ...(sp.usuario ? { userId: sp.usuario } : {}),
    ...(sp.accion ? { action: sp.accion } : {}),
  };
  const [rows, total, entities, actions, users] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.entidad) u.set("entidad", sp.entidad);
    if (sp.usuario) u.set("usuario", sp.usuario);
    if (sp.accion) u.set("accion", sp.accion);
    u.set("p", String(p));
    return `?${u}`;
  };
  return (
    <Card>
      <CardHeader title="Historial de auditoría" description={`${total} registro(s). Este historial no puede modificarse ni eliminarse.`} />
      <form className="flex flex-wrap gap-3 border-b border-neutral-100 px-5 py-3">
        <Select name="entidad" defaultValue={sp.entidad ?? ""} className="w-44">
          <option value="">Todas las entidades</option>
          {entities.map((e) => <option key={e.entity} value={e.entity}>{e.entity}</option>)}
        </Select>
        <Select name="accion" defaultValue={sp.accion ?? ""} className="w-48">
          <option value="">Todas las acciones</option>
          {actions.map((a) => <option key={a.action} value={a.action}>{a.action}</option>)}
        </Select>
        <Select name="usuario" defaultValue={sp.usuario ?? ""} className="w-48">
          <option value="">Todos los usuarios</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <Button type="submit" variant="outline">Filtrar</Button>
        <Input type="hidden" name="p" value="1" />
      </form>
      {rows.length === 0 ? (
        <EmptyState title="Sin registros" description="No hay movimientos que coincidan con el filtro." />
      ) : (
        <Table>
          <thead><tr><Th>Fecha</Th><Th>Usuario</Th><Th>Acción</Th><Th>Entidad</Th><Th>Detalle</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id.toString()}>
                <Td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
                <Td>{r.user?.name ?? "Sistema"}</Td>
                <Td><Badge tone={r.action.includes("OVERRIDE") || r.action === "BLOQUEO" ? "red" : "neutral"}>{r.action}</Badge></Td>
                <Td>{r.entity}</Td>
                <Td className="max-w-md">
                  {r.summary && <p className="text-sm">{r.summary}</p>}
                  {(r.before || r.after) && (
                    <details className="text-xs text-neutral-500">
                      <summary className="cursor-pointer">Ver cambios</summary>
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2">{JSON.stringify({ antes: r.before, despues: r.after }, null, 2)}</pre>
                    </details>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 text-sm text-neutral-600">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className={buttonClass("outline", "sm")} href={qs(page - 1)}>Anterior</Link>}
            {page < pages && <Link className={buttonClass("outline", "sm")} href={qs(page + 1)}>Siguiente</Link>}
          </div>
        </div>
      )}
    </Card>
  );
}
