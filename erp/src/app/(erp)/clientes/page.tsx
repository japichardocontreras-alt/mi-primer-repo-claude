import { requirePermission } from "@/lib/auth/server";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Clientes" };

export default async function Page() {
  await requirePermission("clientes.ver");
  return (
    <ModulePending
      title="Clientes"
      phase={2}
      features={["Alta y edición de clientes con código CLI-000000", "Detección de teléfonos duplicados", "Historial de solicitudes y servicios por cliente", "Saldo pendiente por cliente"]}
    />
  );
}
