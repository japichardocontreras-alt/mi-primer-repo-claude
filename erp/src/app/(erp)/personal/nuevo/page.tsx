import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission, can } from "@/lib/auth/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { WorkerFields } from "@/components/forms/worker-fields";
import { createWorkerAction } from "../actions";

export const metadata = { title: "Nuevo colaborador" };

export default async function NuevoTrabajador() {
  const user = await requirePermission("personal.editar");
  return (
    <>
      <Link href="/personal" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Personal</Link>
      <PageHeader title="Nuevo colaborador" description="El identificador (EMP-000001) se asigna automáticamente." />
      <Card className="max-w-3xl"><CardBody>
        <ActionForm action={createWorkerAction}>
          <WorkerFields showMoney={can(user, "nomina.ver")} />
          <div className="mt-5"><SubmitButton>Guardar</SubmitButton></div>
        </ActionForm>
      </CardBody></Card>
    </>
  );
}
