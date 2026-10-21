import Link from "next/link";
import { Plus, AlertTriangle, Wrench, FileWarning } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { VEHICLE_STATUS, syncFleetNotifications, depParams } from "@/lib/domain/fleet";
import { straightLine } from "@/lib/domain/depreciation";
import { formatMXN, formatNumber, mexicoParts, mexicoMonthRange } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionForm } from "@/components/ui/action-form";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { depreciationAction } from "./actions";

export const metadata = { title: "Flotilla" };

export default async function FlotillaPage({ searchParams }: { searchParams: Promise<{ bajas?: string }> }) {
  const user = await requirePermission("flotilla.ver");
  const sp = await searchParams;
  const p = mexicoParts();
  const month = mexicoMonthRange(p.year, p.month);
  const [vehicles, alerts] = await Promise.all([
    prisma.vehicle.findMany({
      where: sp.bajas ? {} : { active: true },
      include: { _count: { select: { services: { where: { service: { status: "FINALIZADO", actualStart: { gte: month.start, lt: month.end } } } } } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    syncFleetNotifications(prisma),
  ]);
  const money = can(user, "finanzas.ver") || can(user, "costos.editar");
  const ym = `${p.year}-${String(p.month).padStart(2, "0")}`;
  return (
    <>
      <PageHeader
        title="Flotilla"
        description="Unidades, kilometraje, mantenimientos, documentación y depreciación."
        actions={can(user, "flotilla.editar") ? <Link href="/flotilla/nueva" className={buttonClass("primary")}><Plus className="h-4 w-4" /> Nueva unidad</Link> : undefined}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardHeader title="Unidades" description={<Link href={sp.bajas ? "/flotilla" : "/flotilla?bajas=1"} className="text-brand-700 hover:underline">{sp.bajas ? "Ocultar unidades dadas de baja" : "Mostrar también unidades dadas de baja"}</Link>} />
          {vehicles.length === 0 ? <EmptyState title="Sin unidades registradas" /> : (
            <Table>
              <thead><tr><Th>Unidad</Th><Th>Placas</Th><Th>Estado</Th><Th className="text-right">Km actual</Th><Th className="text-center">Servicios del mes</Th>{money && <Th className="text-right">Valor contable</Th>}<Th>Alertas</Th></tr></thead>
              <tbody>
                {vehicles.map((v) => {
                  const a = alerts.filter((x) => x.vehicleId === v.id);
                  const dep = straightLine(depParams(v), p.year, p.month);
                  return (
                    <Tr key={v.id}>
                      <Td><Link href={`/flotilla/${v.id}`} className="font-medium hover:text-brand-600">{v.name}</Link><span className="block text-xs text-neutral-500">{v.code}{v.brand ? ` · ${v.brand} ${v.model ?? ""} ${v.year ?? ""}` : ""}</span></Td>
                      <Td className="whitespace-nowrap">{v.plates ?? "—"}</Td>
                      <Td><Badge tone={VEHICLE_STATUS[v.status].tone}>{VEHICLE_STATUS[v.status].label}</Badge></Td>
                      <Td className="text-right tabular-nums">{formatNumber(v.currentOdometer)}</Td>
                      <Td className="text-center tabular-nums">{v._count.services}</Td>
                      {money && <Td className="whitespace-nowrap text-right tabular-nums">{dep ? formatMXN(dep.bookValue) : <span className="text-xs text-neutral-400">Sin datos</span>}</Td>}
                      <Td>{a.length === 0 ? <span className="text-xs text-neutral-400">—</span> : <Badge tone={a.some((x) => x.level === "VENCIDO") ? "red" : "amber"}>{a.length} alerta(s)</Badge>}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Alertas" description="Mantenimientos por fecha/km y documentos por vencer" />
            {alerts.length === 0 ? <p className="px-5 py-4 text-sm text-neutral-500">Sin alertas.</p> : (
              <ul className="divide-y divide-neutral-100">
                {alerts.map((a) => (
                  <li key={a.refId + a.level}>
                    <Link href={`/flotilla/${a.vehicleId}?tab=${a.kind === "DOCUMENTO" ? "documentos" : "mantenimiento"}`} className="flex gap-3 px-5 py-2.5 hover:bg-neutral-50">
                      {a.kind === "DOCUMENTO" ? <FileWarning className={`mt-0.5 h-4 w-4 shrink-0 ${a.level === "VENCIDO" ? "text-red-600" : "text-amber-600"}`} /> : <Wrench className={`mt-0.5 h-4 w-4 shrink-0 ${a.level === "VENCIDO" ? "text-red-600" : "text-amber-600"}`} />}
                      <span className="text-sm"><span className="font-medium">{a.vehicleName}:</span> {a.title}<span className="block text-xs text-neutral-500">{a.detail}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {can(user, "costos.editar") && (
            <Card>
              <CardHeader title="Depreciación mensual" description="Registra la depreciación del mes (ambos métodos) para usarla en Resultados. Puede recalcularse sin duplicar." />
              <CardBody>
                <ActionForm action={depreciationAction} className="flex flex-wrap items-end gap-2">
                  <Input type="month" name="month" defaultValue={ym} className="w-44" aria-label="Mes" />
                  <SubmitButton size="sm" variant="secondary">Calcular y registrar</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
          {alerts.some((a) => a.level === "VENCIDO") && (
            <p className="flex items-center gap-2 text-xs text-red-700"><AlertTriangle className="h-4 w-4" /> Hay obligaciones vencidas. También aparecen en las notificaciones.</p>
          )}
        </div>
      </div>
    </>
  );
}
