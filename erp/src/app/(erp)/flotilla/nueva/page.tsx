import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission, can } from "@/lib/auth/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { VehicleFields } from "@/components/forms/vehicle-fields";
import { createVehicleAction } from "../actions";

export const metadata = { title: "Nueva unidad" };

export default async function NuevaUnidad() {
  const user = await requirePermission("flotilla.editar");
  return (
    <>
      <Link href="/flotilla" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Flotilla</Link>
      <PageHeader title="Nueva unidad" />
      <ActionForm action={createVehicleAction} messagePosition="top">
        <Card><VehicleFields showMoney={can(user, "costos.editar") || can(user, "finanzas.ver")} /></Card>
        <div className="mt-4"><SubmitButton size="lg">Guardar unidad</SubmitButton></div>
      </ActionForm>
    </>
  );
}
