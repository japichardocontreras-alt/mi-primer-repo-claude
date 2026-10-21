import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { POSITION } from "@/lib/domain/workers";
import { SERVICE_STATUS, STAFF_ROLE } from "@/lib/domain/services";
import { formatDateTime, formatMXN } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { WorkerFields } from "@/components/forms/worker-fields";
import { updateWorkerAction } from "../actions";

export const metadata = { title: "Colaborador" };

export default async function TrabajadorDetalle({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("personal.ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const w = await prisma.worker.findUnique({
    where: { id },
    include: { assignments: { include: { service: { include: { client: true } } }, orderBy: { service: { scheduledStart: "desc" } }, take: 100 } },
  });
  if (!w) notFound();
  const money = can(user, "nomina.ver");
  return (
    <>
      <Link href="/personal" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Personal</Link>
      <PageHeader eyebrow={w.code} title={w.fullName} description={<span className="inline-flex gap-2">{POSITION[w.position]} {w.active ? <Badge tone="green">Activo</Badge> : <Badge tone="red">Inactivo</Badge>}</span>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Servicios asignados" description="Historial de participación. Los pagos de nómina por servicio se generan en la Fase 5." />
          {w.assignments.length === 0 ? <EmptyState title="Sin servicios asignados" /> : (
            <Table>
              <thead><tr><Th>Fecha</Th><Th>Servicio</Th><Th>Cliente</Th><Th>Rol</Th>{money && <Th className="text-right">Pago pactado</Th>}<Th>Estado</Th></tr></thead>
              <tbody>
                {w.assignments.map((a) => (
                  <Tr key={a.id}>
                    <Td className="whitespace-nowrap text-xs">{formatDateTime(a.service.scheduledStart)}</Td>
                    <Td className="font-medium"><Link href={`/agenda/${a.serviceId}`} className="hover:text-brand-600">{a.service.folio}</Link></Td>
                    <Td>{a.service.client.name}</Td>
                    <Td>{STAFF_ROLE[a.role]}</Td>
                    {money && <Td className="text-right tabular-nums">{formatMXN(a.agreedPay)}</Td>}
                    <Td><Badge tone={SERVICE_STATUS[a.service.status].tone}>{SERVICE_STATUS[a.service.status].label}</Badge></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Ficha" />
          <CardBody>
            {can(user, "personal.editar") ? (
              <ActionForm action={updateWorkerAction.bind(null, w.id)}>
                <input type="hidden" name="version" value={w.version} />
                <WorkerFields w={w} showMoney={money} />
                <div className="mt-4"><SubmitButton>Guardar cambios</SubmitButton></div>
              </ActionForm>
            ) : (
              <p className="text-sm text-neutral-600">{w.phone ?? "Sin teléfono"}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
