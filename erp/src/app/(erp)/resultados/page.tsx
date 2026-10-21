import { requirePermission } from "@/lib/auth/server";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Resultados" };

export default async function Page() {
  await requirePermission("resultados.ver");
  return (
    <ModulePending
      title="Resultados financieros"
      phase={8}
      features={[
        "Embudo comercial y conversión",
        "Ventas pactadas vs. ingresos cobrados vs. cuentas por cobrar",
        "Gastos directos, fijos, nómina y depreciación sin doble conteo",
        "Resultado operativo, utilidad y margen",
        "Flujo de efectivo",
        "Rentabilidad por unidad con criterios configurables",
        "Gráficas interactivas y fórmulas documentadas",
      ]}
    />
  );
}
