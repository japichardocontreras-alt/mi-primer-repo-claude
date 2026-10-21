import { Download } from "lucide-react";
import { requirePermission } from "@/lib/auth/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata = { title: "Respaldos" };

export default async function BackupsPage() {
  await requirePermission("config.respaldos");
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Descargar respaldo ahora" description="Copia completa de la base de datos en formato pg_dump (custom)." />
        <CardBody className="space-y-4 text-sm text-neutral-700">
          <p>El archivo contiene toda la información del ERP. Guárdelo en un lugar seguro: incluye datos personales y financieros.</p>
          <a href="/api/respaldo" className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
            <Download className="h-4 w-4" /> Descargar respaldo (.dump)
          </a>
          <p className="text-xs text-neutral-500">Cada descarga queda registrada en la auditoría. Requiere que el servidor tenga instalada la herramienta pg_dump.</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Respaldos automáticos y recuperación" />
        <CardBody className="space-y-3 text-sm text-neutral-700">
          <p>En el servidor se incluye <code className="rounded bg-neutral-100 px-1">scripts/backup.sh</code> para programar respaldos diarios (cron) con rotación, y <code className="rounded bg-neutral-100 px-1">scripts/restore.sh</code> para recuperar.</p>
          <p>La recuperación se realiza solo desde el servidor (no desde la aplicación) para evitar sobrescribir información por error. El procedimiento completo está en <code className="rounded bg-neutral-100 px-1">docs/RESPALDOS.md</code>.</p>
        </CardBody>
      </Card>
    </div>
  );
}
