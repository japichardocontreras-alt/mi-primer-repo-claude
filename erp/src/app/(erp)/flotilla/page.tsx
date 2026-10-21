import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Flotilla" };

export default async function Page() {
  await requirePermission("flotilla.ver");
  const count = await prisma.vehicle.count({ where: { active: true } });
  return (
    <ModulePending
      title="Flotilla"
      phase={6}
      note={`Unidades registradas en la base de datos: ${count}. Sus datos técnicos (placas, serie, adquisición, etc.) se capturan en esta fase.`}
      features={[
        "Ficha de cada unidad editable; alta y baja de unidades",
        "Historial de servicios y kilometraje inmutable",
        "Detección de inconsistencias de odómetro",
        "Mantenimientos con alertas por fecha y kilometraje",
        "Documentación (seguro, verificación, tenencia, tarjeta) con alertas",
        "Depreciación lineal y por kilómetro",
      ]}
    />
  );
}
