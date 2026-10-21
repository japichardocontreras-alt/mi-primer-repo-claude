import { Construction } from "lucide-react";
import { Card } from "./ui/card";
import { PageHeader } from "./ui/page-header";

/**
 * Aviso honesto para módulos cuya fase aún no se entrega.
 * No muestra botones ni datos simulados.
 */
export function ModulePending({ title, phase, features, note }: { title: string; phase: number; features: string[]; note?: string }) {
  return (
    <>
      <PageHeader title={title} eyebrow={`Fase ${phase}`} />
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="h-fit w-fit rounded-lg bg-amber-50 p-3 text-amber-700">
            <Construction className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Módulo en desarrollo — se entrega en la Fase {phase}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              La estructura de base de datos de este módulo ya existe y está relacionada con el resto del sistema.
              Las pantallas de captura y consulta se habilitarán en su fase. Mientras tanto no se muestran datos ni botones simulados.
            </p>
            {note && <p className="mt-2 text-sm text-neutral-600">{note}</p>}
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Incluirá</p>
            <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-sm text-neutral-700 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </>
  );
}
