import { requirePermission } from "@/lib/auth/server";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Solicitudes" };

export default async function Page() {
  await requirePermission("solicitudes.ver");
  return (
    <ModulePending
      title="Solicitudes y seguimiento comercial"
      phase={2}
      features={[
        "Registro de solicitudes con folio SOL-AAAA-000000 generado en el servidor",
        "Datos de carga y descarga, inventario, maniobras y paquete",
        "Precio cotizado manual con historial de versiones",
        "Estados comerciales y seguimiento (último y próximo contacto)",
        "Tabla con buscador y filtros, exportación a Excel",
        "Fotografías y archivos adjuntos privados",
      ]}
    />
  );
}
