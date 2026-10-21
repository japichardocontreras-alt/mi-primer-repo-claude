import { requirePermission } from "@/lib/auth/server";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Finanzas y administración" };

export default async function Page() {
  await requirePermission("finanzas.ver");
  return (
    <ModulePending
      title="Finanzas y administración"
      phase={7}
      features={[
        "Cobros múltiples por servicio (anticipo, parciales, pago final)",
        "Gastos directos ligados al folio del servicio",
        "Gastos fijos y recurrentes sin duplicados por periodo",
        "Préstamos, aportaciones, compra de activos y financiamientos fuera de resultados operativos",
        "Separación de IVA cuando corresponda",
      ]}
    />
  );
}
