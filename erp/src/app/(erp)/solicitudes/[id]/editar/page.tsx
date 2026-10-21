import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { RequestFields } from "@/components/forms/request-fields";
import { updateRequestAction } from "../../actions";

export const metadata = { title: "Editar solicitud" };

export default async function EditarSolicitud({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("solicitudes.editar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [r, vehicles] = await Promise.all([
    prisma.request.findUnique({ where: { id }, include: { client: true, originAddress: true, destinationAddress: true } }),
    prisma.vehicle.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!r) notFound();
  return (
    <>
      <Link href={`/solicitudes/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> {r.folio}</Link>
      <PageHeader title={`Editar ${r.folio}`} description={`Cliente: ${r.client.name}. El folio no cambia. Los cambios quedan en el historial.`} />
      {r.status === "CONFIRMADA" ? (
        <Card className="p-6 text-sm text-neutral-700">La solicitud ya fue confirmada; los cambios se realizan en el servicio programado.</Card>
      ) : (
        <ActionForm action={updateRequestAction.bind(null, id)} messagePosition="top">
          <input type="hidden" name="version" value={r.version} />
          <Card><RequestFields r={r} vehicles={vehicles} /></Card>
          <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
            <Link href={`/solicitudes/${id}`} className="text-sm text-neutral-600 hover:text-neutral-900">Volver</Link>
            <SubmitButton size="lg">Guardar cambios</SubmitButton>
          </div>
        </ActionForm>
      )}
    </>
  );
}
