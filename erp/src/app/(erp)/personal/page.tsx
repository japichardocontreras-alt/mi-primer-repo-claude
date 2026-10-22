import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { POSITION, PAY_TYPE } from "@/lib/domain/workers";
import { formatDateOnly, formatMXN } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { PersonalTabs } from "./tabs";

export const metadata = { title: "Personal y nómina" };

export default async function PersonalPage({ searchParams }: { searchParams: Promise<{ estado?: string; puesto?: string }> }) {
  const user = await requirePermission("personal.ver");
  const sp = await searchParams;
  const estado = sp.estado ?? "activos";
  const workers = await prisma.worker.findMany({
    where: { ...(estado === "activos" ? { active: true } : estado === "bajas" ? { active: false } : {}), ...(sp.puesto && sp.puesto in POSITION ? { position: sp.puesto as keyof typeof POSITION } : {}) },
    include: { _count: { select: { assignments: true } } },
    orderBy: [{ position: "asc" }, { fullName: "asc" }],
  });
  const money = can(user, "nomina.ver");
  return (
    <>
      <PageHeader
        title="Personal y nómina"
        description="Fichas de colaboradores, nómina por servicio, cortes y pagos. Control administrativo interno (no sustituye el cálculo legal de IMSS, ISR o CFDI)."
        actions={can(user, "personal.editar") ? <Link href="/personal/nuevo" className={buttonClass("primary")}><Plus className="h-4 w-4" /> Nuevo colaborador</Link> : undefined}
      />
      <PersonalTabs active="personal" showPayroll={can(user, "nomina.ver")} showRates={can(user, "nomina.gestionar")} />
      <Card>
        <form className="flex flex-wrap gap-3 border-b border-neutral-100 px-5 py-4">
          <Select name="estado" defaultValue={estado} className="w-40" aria-label="Estado"><option value="activos">Activos</option><option value="bajas">Inactivos</option><option value="todos">Todos</option></Select>
          <Select name="puesto" defaultValue={sp.puesto ?? ""} className="w-44" aria-label="Puesto"><option value="">Todos los puestos</option>{Object.entries(POSITION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>
        {workers.length === 0 ? (
          <EmptyState title="Sin personal registrado" description="Registre a choferes y ayudantes para poder asignarlos a los servicios." />
        ) : (
          <Table>
            <thead><tr><Th>Código</Th><Th>Nombre</Th><Th>Puesto</Th><Th>Teléfono</Th><Th>Ingreso</Th><Th>Tipo de pago</Th>{money && <Th className="text-right">Sueldo base</Th>}<Th className="text-center">Servicios</Th><Th>Estado</Th></tr></thead>
            <tbody>
              {workers.map((w) => (
                <Tr key={w.id}>
                  <Td className="text-neutral-500">{w.code}</Td>
                  <Td><Link href={`/personal/${w.id}`} className="font-medium hover:text-brand-600">{w.fullName}</Link></Td>
                  <Td>{POSITION[w.position]}</Td>
                  <Td className="whitespace-nowrap">{w.phone ?? "—"}</Td>
                  <Td className="whitespace-nowrap">{formatDateOnly(w.hireDate)}</Td>
                  <Td>{PAY_TYPE[w.payType]}</Td>
                  {money && <Td className="text-right tabular-nums">{formatMXN(w.baseSalary)}</Td>}
                  <Td className="text-center tabular-nums">{w._count.assignments}</Td>
                  <Td>{w.active ? <Badge tone="green">Activo</Badge> : <Badge tone="red">Inactivo</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
