import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { completedServices, completedWhere, type CompletedFilters } from "@/lib/queries/completed";
import { SERVICE_TYPE } from "@/lib/domain/labels";
import { formatDateTime, formatMXN, formatNumber, formatPercent, mexicoParts } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, Stat } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Servicios realizados" };
const COBRO = { PENDIENTE: { label: "Pendiente", tone: "amber" }, PARCIAL: { label: "Parcial", tone: "blue" }, LIQUIDADO: { label: "Liquidado", tone: "green" } } as const;

export default async function ServiciosRealizados({ searchParams }: { searchParams: Promise<CompletedFilters & { todos?: string }> }) {
  const user = await requirePermission("servicios.ver");
  const sp = await searchParams;
  const p = mexicoParts();
  const mes = sp.todos ? undefined : sp.mes ?? `${p.year}-${String(p.month).padStart(2, "0")}`;
  const f: CompletedFilters = { ...sp, mes };
  const [rows, vehicles, total] = await Promise.all([
    completedServices(prisma, f, { skip: 0, take: 500 }),
    prisma.vehicle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.service.count({ where: completedWhere(f) }),
  ]);
  const money = can(user, "finanzas.ver") || can(user, "finanzas.cobros");
  const sum = (k: "precio" | "cobrado" | "saldo" | "directos" | "nomina" | "margen" | "km") => rows.reduce((a, r) => a + r[k], 0);
  const qs = new URLSearchParams(Object.entries({ ...f }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Servicios realizados"
        description="Servicios con cierre operativo. Es la misma información del servicio (no una copia), con sus datos de ejecución."
        actions={can(user, "exportar") ? <a href={`/api/exportar/servicios?${qs}`} className={buttonClass("outline")}><Download className="h-4 w-4" /> Excel</a> : undefined}
      />
      <Card className="mb-6">
        <form className="flex flex-wrap items-center gap-2 px-5 py-4">
          <Input type="month" name="mes" defaultValue={mes ?? ""} className="w-44" aria-label="Mes" />
          <Select name="unidad" defaultValue={sp.unidad ?? ""} className="w-48" aria-label="Unidad"><option value="">Todas las unidades</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
          <Select name="tipo" defaultValue={sp.tipo ?? ""} className="w-40" aria-label="Tipo"><option value="">Todos los tipos</option>{Object.entries(SERVICE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select name="cobro" defaultValue={sp.cobro ?? ""} className="w-44" aria-label="Cobro"><option value="">Cualquier cobro</option>{Object.entries(COBRO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Folio o cliente" className="w-48" aria-label="Buscar" />
          <Button type="submit" variant="secondary">Filtrar</Button>
          <Link href="/servicios?todos=1" className="text-sm text-neutral-600 hover:text-neutral-900">Ver todos los meses</Link>
        </form>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Servicios realizados" value={total} hint={`${formatNumber(sum("km"))} km recorridos`} />
        {money && <Stat label="Ventas de estos servicios" value={formatMXN(sum("precio"))} hint={`Cobrado ${formatMXN(sum("cobrado"))}`} />}
        {money && <Stat label="Saldo por cobrar" value={formatMXN(sum("saldo"))} tone={sum("saldo") > 0 ? "warn" : "neutral"} />}
        {money && <Stat label="Margen directo" value={formatMXN(sum("margen"))} hint={sum("precio") ? `${formatPercent(sum("margen") / sum("precio"))} · gastos ${formatMXN(sum("directos"))} · personal ${formatMXN(sum("nomina"))}` : undefined} tone="good" />}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Sin servicios realizados en este periodo" description="Aparecen aquí al registrar el cierre operativo desde la agenda." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Folio</Th><Th>Realizado</Th><Th>Cliente</Th><Th>Unidad</Th><Th className="text-right">Km</Th>
                {money && <><Th className="text-right">Precio</Th><Th className="text-right">Saldo</Th><Th className="text-right">Gastos</Th><Th className="text-right">Personal</Th><Th className="text-right">Margen</Th></>}
                <Th>Cobro</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.s.id}>
                  <Td className="whitespace-nowrap font-medium"><Link href={`/agenda/${r.s.id}`} className="hover:text-brand-600">{r.s.folio}</Link></Td>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(r.s.actualStart)}</Td>
                  <Td className="min-w-[130px]">{r.s.client.name}</Td>
                  <Td className="text-xs">{r.s.vehicles.map((v) => v.vehicle.name).join(", ")}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(r.km)}</Td>
                  {money && (
                    <>
                      <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(r.precio)}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(r.saldo)}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(r.directos)}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(r.nomina)}</Td>
                      <Td className={`whitespace-nowrap text-right font-medium tabular-nums ${r.margen < 0 ? "text-red-700" : ""}`}>{formatMXN(r.margen)}</Td>
                    </>
                  )}
                  <Td><Badge tone={COBRO[r.s.collectionStatus].tone}>{COBRO[r.s.collectionStatus].label}</Badge></Td>
                </Tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50 font-semibold">
                <Td colSpan={4}>Totales ({rows.length})</Td>
                <Td className="text-right tabular-nums">{formatNumber(sum("km"))}</Td>
                {money && (
                  <>
                    <Td className="text-right tabular-nums">{formatMXN(sum("precio"))}</Td>
                    <Td className="text-right tabular-nums">{formatMXN(sum("saldo"))}</Td>
                    <Td className="text-right tabular-nums">{formatMXN(sum("directos"))}</Td>
                    <Td className="text-right tabular-nums">{formatMXN(sum("nomina"))}</Td>
                    <Td className="text-right tabular-nums">{formatMXN(sum("margen"))}</Td>
                  </>
                )}
                <Td />
              </tr>
            </tfoot>
          </Table>
        )}
      </Card>
      {total > rows.length && <p className="mt-2 text-xs text-neutral-500">Se muestran los {rows.length} más recientes; use los filtros o la exportación a Excel para ver todos.</p>}
    </>
  );
}
