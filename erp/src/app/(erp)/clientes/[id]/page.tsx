import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { addressLine, CHANNEL } from "@/lib/domain/labels";
import { formatDateOnly, formatDateTime, formatMXN } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { RequestStatusBadge } from "@/components/status-badges";
import { ClientFields } from "@/components/forms/client-fields";
import { deleteClientAction, toggleClientActiveAction, updateClientAction } from "../actions";

export const metadata = { title: "Cliente" };

export default async function ClienteDetalle({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("clientes.ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await prisma.client.findUnique({
    where: { id },
    include: {
      requests: { include: { originAddress: true, destinationAddress: true, currentQuote: true }, orderBy: { registeredAt: "desc" } },
      _count: { select: { services: true, addresses: true } },
    },
  });
  if (!c) notFound();
  const canEdit = can(user, "clientes.editar");
  const hasHistory = c.requests.length > 0 || c._count.services > 0 || c._count.addresses > 0;

  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Clientes</Link>
      <PageHeader
        eyebrow={c.code}
        title={c.name}
        description={<span className="inline-flex flex-wrap items-center gap-2">{c.phone}{c.email ? ` · ${c.email}` : ""}{c.channel ? ` · ${CHANNEL[c.channel]}` : ""}{!c.active && <Badge tone="red">Inactivo</Badge>}</span>}
        actions={can(user, "solicitudes.crear") && c.active ? <Link href={`/solicitudes/nueva?cliente=${c.id}`} className={buttonClass("primary")}><Plus className="h-4 w-4" /> Nueva solicitud</Link> : undefined}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Solicitudes" description={`${c.requests.length} registrada(s) · ${c._count.services} servicio(s)`} />
          {c.requests.length === 0 ? (
            <EmptyState title="Sin solicitudes" description="Las solicitudes de este cliente aparecerán aquí." />
          ) : (
            <Table>
              <thead><tr><Th>Folio</Th><Th>Registro</Th><Th>Fecha solicitada</Th><Th>Ruta</Th><Th className="text-right">Precio</Th><Th>Estado</Th></tr></thead>
              <tbody>
                {c.requests.map((r) => (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap font-medium"><Link href={`/solicitudes/${r.id}`} className="hover:text-brand-600">{r.folio}</Link></Td>
                    <Td className="whitespace-nowrap">{formatDateTime(r.registeredAt)}</Td>
                    <Td className="whitespace-nowrap">{formatDateOnly(r.tentativeDate)}</Td>
                    <Td>{addressLine(r.originAddress)} → {addressLine(r.destinationAddress)}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{r.currentQuote ? formatMXN(r.currentQuote.finalPrice) : "—"}</Td>
                    <Td><RequestStatusBadge status={r.status} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos del cliente" />
            <CardBody>
              {canEdit ? (
                <ActionForm action={updateClientAction.bind(null, c.id)}>
                  <input type="hidden" name="version" value={c.version} />
                  <ClientFields c={c} />
                  <div className="mt-4"><SubmitButton>Guardar cambios</SubmitButton></div>
                </ActionForm>
              ) : (
                <p className="text-sm text-neutral-600 whitespace-pre-line">{c.notes || "Sin notas."}</p>
              )}
            </CardBody>
          </Card>
          {canEdit && (
            <Card>
              <CardHeader title="Estado del registro" />
              <CardBody className="space-y-3 text-sm text-neutral-600">
                <ActionForm action={toggleClientActiveAction.bind(null, c.id, !c.active)}>
                  <p className="mb-2">{c.active ? "Un cliente inactivo no aparece al registrar nuevas solicitudes, pero conserva todo su historial." : "Reactive al cliente para registrarle nuevas solicitudes."}</p>
                  <SubmitButton variant="outline" size="sm" confirmText={c.active ? `¿Desactivar a ${c.name}?` : undefined}>{c.active ? "Desactivar cliente" : "Reactivar cliente"}</SubmitButton>
                </ActionForm>
                {!hasHistory && (
                  <ActionForm action={deleteClientAction.bind(null, c.id)}>
                    <p className="mb-2">Este cliente no tiene historial y puede eliminarse definitivamente.</p>
                    <SubmitButton variant="danger" size="sm" confirmText={`¿Eliminar definitivamente a ${c.name}? Esta acción no se puede deshacer.`}>Eliminar cliente</SubmitButton>
                  </ActionForm>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
