import { requirePermission } from "@/lib/auth/server";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Servicios realizados" };

export default async function Page() {
  await requirePermission("servicios.ver");
  return (
    <ModulePending
      title="Servicios realizados"
      phase={4}
      features={[
        "Vista del mismo servicio (sin duplicar registros)",
        "Cierre operativo: horarios reales, kilometraje, combustible, casetas, viáticos",
        "Incidencias, evidencia de entrega y archivos",
        "Cierre operativo independiente del cierre financiero",
        "Alimenta automáticamente nómina, flotilla y resultados",
      ]}
    />
  );
}
