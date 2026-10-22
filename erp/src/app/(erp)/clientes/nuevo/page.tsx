import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { ClientFields } from "@/components/forms/client-fields";
import { createClientAction } from "../actions";

export const metadata = { title: "Nuevo cliente" };

export default async function NuevoCliente() {
  await requirePermission("clientes.editar");
  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Clientes</Link>
      <PageHeader title="Nuevo cliente" description="El código de cliente se asigna automáticamente." />
      <Card className="max-w-3xl">
        <CardBody>
          <ActionForm action={createClientAction}>
            <ClientFields />
            <div className="mt-5"><SubmitButton>Guardar cliente</SubmitButton></div>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
