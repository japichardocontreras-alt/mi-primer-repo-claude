import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { clientWhere } from "@/lib/domain/clients";
import { requirePermission, can } from "@/lib/auth/server";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Clientes" };
const PAGE = 25;

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; p?: string }> }) {
  const user = await requirePermission("clientes.ver");
  const sp = await searchParams;
  const estado = sp.estado ?? "activos";
  const page = Math.max(1, Number(sp.p) || 1);
  const where = clientWhere(sp.q, estado);
  const [rows, total] = await Promise.all([
    prisma.client.findMany({ where, include: { _count: { select: { requests: true, services: true } } }, orderBy: { name: "asc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.client.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cada cliente conserva su historial de solicitudes y servicios."
        actions={
          <>
            {can(user, "exportar") && <a href={`/api/exportar/clientes?${new URLSearchParams({ q: sp.q ?? "", estado })}`} className={buttonClass("outline")}><Download className="h-4 w-4" /> Excel</a>}
            {can(user, "clientes.editar") && <Link href="/clientes/nuevo" className={buttonClass("primary")}><Plus className="h-4 w-4" /> Nuevo cliente</Link>}
          </>
        }
      />
      <Card>
        <form className="flex flex-wrap gap-3 border-b border-neutral-100 px-5 py-4">
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Nombre, teléfono, correo o código" className="max-w-sm" aria-label="Buscar" />
          <Select name="estado" defaultValue={estado} className="w-40" aria-label="Estado">
            <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
          </Select>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title={sp.q ? "Sin resultados" : "Aún no hay clientes"} description={sp.q ? "Pruebe con otro nombre o teléfono." : "Los clientes se registran aquí o al capturar una solicitud."} />
        ) : (
          <Table>
            <thead><tr><Th>Código</Th><Th>Nombre</Th><Th>Teléfono</Th><Th>Correo</Th><Th className="text-center">Solicitudes</Th><Th className="text-center">Servicios</Th><Th>Alta</Th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <Tr key={c.id}>
                  <Td className="whitespace-nowrap text-neutral-500">{c.code}</Td>
                  <Td><Link href={`/clientes/${c.id}`} className="font-medium text-neutral-900 hover:text-brand-600">{c.name}</Link>{!c.active && <Badge tone="red" className="ml-2">Inactivo</Badge>}</Td>
                  <Td className="whitespace-nowrap">{c.phone}</Td>
                  <Td>{c.email ?? "—"}</Td>
                  <Td className="text-center tabular-nums">{c._count.requests}</Td>
                  <Td className="text-center tabular-nums">{c._count.services}</Td>
                  <Td className="whitespace-nowrap">{formatDate(c.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE} params={{ q: sp.q, estado }} />
      </Card>
    </>
  );
}
