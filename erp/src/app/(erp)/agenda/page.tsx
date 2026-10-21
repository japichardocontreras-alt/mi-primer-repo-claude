import { requirePermission } from "@/lib/auth/server";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Agenda de servicios" };

export default async function Page() {
  await requirePermission("agenda.ver");
  return (
    <ModulePending
      title="Agenda de servicios"
      phase={3}
      features={[
        "Conversión de solicitud confirmada en servicio MM-AAAA-000000 (sin duplicados)",
        "Calendario mensual, semanal y lista",
        "Asignación de unidad, chofer y ayudantes",
        "Validación de empalmes de unidad y personal (incluye servicios que cruzan medianoche)",
        "Autorización excepcional de conflictos registrada en auditoría",
        "Reprogramaciones con historial, sin perder información financiera",
      ]}
    />
  );
}
