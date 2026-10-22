import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { loadDashboard, parseDashboardParams, type DashboardParams } from "@/lib/finance/dashboard-page";
import { SERVICE_TYPE } from "@/lib/domain/labels";
import { MONTHS_ES, formatMXN, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, Stat } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart, BarList } from "@/components/charts/charts";
import { IncomeStatement, CashFlow } from "@/components/finance/statement";

export const metadata = { title: "Resultados" };

const CRITERIO = { INGRESOS: "proporcional a ingresos", KILOMETROS: "proporcional a kilómetros", SERVICIOS: "proporcional a servicios", PARTES_IGUALES: "en partes iguales" } as const;
const pct = (v: number | null) => (v === null ? "—" : formatPercent(v));
const delta = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? "—" : "nuevo") : `${cur - prev >= 0 ? "+" : ""}${formatPercent((cur - prev) / Math.abs(prev))}`);

export default async function Resultados({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePermission("resultados.ver");
  const prm: DashboardParams = parseDashboardParams(await searchParams);
  const [d, vehicles] = await Promise.all([loadDashboard(prisma, prm), prisma.vehicle.findMany({ orderBy: { name: "asc" } })]);
  const { r, c, series, byVehicle, compare } = d;
  const qs = new URLSearchParams(Object.entries(prm.raw).filter(([, v]) => v) as [string, string][]).toString();
  const selectedVehicle = vehicles.find((v) => v.id === prm.filters.vehicleId);
  const mlabel = (m: number) => MONTHS_ES[m - 1].slice(0, 3);
  const funnel = [
    { label: "Solicitudes recibidas", value: c.recibidas },
    { label: "Cotizadas", value: c.cotizadas },
    { label: "Confirmadas", value: c.confirmadas },
  ];
  const expenseDist = [
    { label: "Gastos directos", value: r.gastos.directos },
    { label: "Nómina", value: r.nomina.devengada },
    { label: "Gastos fijos", value: r.gastos.fijos },
    { label: "Depreciación", value: r.depreciacion.monto },
    { label: "Flotilla", value: r.gastos.flotilla },
    ...(r.gastos.extraordinarios ? [{ label: "Extraordinarios", value: r.gastos.extraordinarios }] : []),
    ...(r.otros.intereses ? [{ label: "Intereses", value: r.otros.intereses }] : []),
  ].sort((a, b) => b.value - a.value);
  const anyMonthly = series.some((s) => s.ventas || s.costos || s.servicios);

  return (
    <>
      <PageHeader
        title="Resultados"
        description={`${d.label}${selectedVehicle ? ` · ${selectedVehicle.name}` : ""}${prm.filters.serviceType ? ` · ${SERVICE_TYPE[prm.filters.serviceType]}` : ""}. Fórmulas y criterios en docs/FORMULAS.md.`}
        actions={
          <>
            {can(user, "exportar") && <a href={`/api/exportar/resultados?${qs}`} className={buttonClass("outline")}><Download className="h-4 w-4" /> Excel</a>}
            <Link href={`/imprimir/resultados?${qs}`} target="_blank" className={buttonClass("outline")}><Printer className="h-4 w-4" /> Reporte PDF</Link>
          </>
        }
      />

      {/* Filtros: una sola fila sobre las gráficas */}
      <Card className="mb-6">
        <form className="flex flex-wrap items-center gap-2 px-5 py-3">
          <Select name="vista" defaultValue={prm.vista} className="w-28" aria-label="Periodo"><option value="mes">Mes</option><option value="anio">Año</option></Select>
          {prm.vista === "mes" ? (
            <Input type="month" name="mes" defaultValue={prm.raw.mes ?? `${prm.year}-${String(prm.month).padStart(2, "0")}`} className="w-44" aria-label="Mes" />
          ) : (
            <Input type="number" name="anio" min={2020} max={2100} defaultValue={prm.year} className="w-28" aria-label="Año" />
          )}
          <Select name="unidad" defaultValue={prm.filters.vehicleId ?? ""} className="w-52" aria-label="Unidad"><option value="">Todas las unidades</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
          <Select name="tipo" defaultValue={prm.filters.serviceType ?? ""} className="w-44" aria-label="Tipo de servicio"><option value="">Todos los tipos</option>{Object.entries(SERVICE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Button type="submit" variant="secondary">Aplicar</Button>
          {(prm.filters.vehicleId || prm.filters.serviceType) && <Link href={`/resultados?vista=${prm.vista}${prm.vista === "mes" ? `&mes=${prm.year}-${String(prm.month).padStart(2, "0")}` : `&anio=${prm.year}`}`} className="text-sm text-neutral-600 hover:text-neutral-900">Quitar filtros</Link>}
        </form>
      </Card>

      {/* Indicadores */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Comercial y operación</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Solicitudes recibidas" value={c.recibidas} />
        <Stat label="Cotizaciones enviadas" value={c.cotizadas} />
        <Stat label="Servicios confirmados" value={c.serviciosConfirmados} />
        <Stat label="Servicios realizados" value={c.serviciosRealizados} tone="good" />
        <Stat label="Servicios cancelados" value={c.serviciosCancelados} tone={c.serviciosCancelados ? "warn" : "neutral"} />
        <Stat label="Conversión comercial" value={pct(c.conversion)} hint={`Cierre de cotizaciones ${pct(c.cierreCotizaciones)}`} tone="brand" />
      </div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Financieros</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ventas pactadas" value={formatMXN(r.ventas.pactadas)} hint={`Netas sin IVA ${formatMXN(r.ventas.netas)}`} tone="brand" />
        <Stat label="Ingresos cobrados" value={formatMXN(r.cobranza.neto)} hint="No es utilidad ni venta" tone="good" />
        <Stat label="Cuentas por cobrar" value={formatMXN(r.cobranza.cuentasPorCobrar)} hint="Al cierre del periodo" tone={r.cobranza.cuentasPorCobrar ? "warn" : "neutral"} />
        <Stat label="Gastos directos" value={formatMXN(r.gastos.directos)} hint={`Flotilla ${formatMXN(r.gastos.flotilla)}`} />
        <Stat label="Gastos fijos" value={formatMXN(r.gastos.fijos)} />
        <Stat label="Nómina" value={formatMXN(r.nomina.devengada)} hint={`Entregada ${formatMXN(r.nomina.pagada)}`} />
        <Stat label="Depreciación" value={formatMXN(r.depreciacion.monto)} hint={r.depreciacion.estimada ? "Estimada" : "Registrada"} />
        <Stat label="Resultado operativo" value={formatMXN(r.resultadoOperativo)} tone={r.resultadoOperativo >= 0 ? "good" : "bad"} />
        <Stat label="Utilidad estimada" value={formatMXN(r.utilidad)} tone={r.utilidad >= 0 ? "good" : "bad"} />
        <Stat label="Margen de utilidad" value={pct(r.margen)} />
        <Stat label="Flujo de efectivo" value={formatMXN(r.flujo.neto)} hint={`Entradas ${formatMXN(r.flujo.entradas)} · salidas ${formatMXN(r.flujo.salidas)}`} tone={r.flujo.neto >= 0 ? "good" : "bad"} />
        <Stat label="Ticket promedio" value={r.ventas.servicios ? formatMXN(r.ventas.netas / r.ventas.servicios) : "—"} hint={`${r.ventas.servicios} servicio(s) vendidos`} />
      </div>

      {/* Gráficas */}
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <ChartCard
          title={`Ventas y costos por mes · ${prm.year}`}
          description="Ventas netas sin IVA y costos operativos (directos, flotilla, fijos, nómina y depreciación)."
          empty={!anyMonthly}
          table={{ headers: ["Mes", "Ventas netas", "Costos", "Utilidad"], rows: series.map((s) => [mlabel(s.m), formatMXN(s.ventas), formatMXN(s.costos), formatMXN(s.utilidad)]) }}
        >
          <ColumnChart data={series.map((s) => ({ label: mlabel(s.m), ventas: s.ventas, costos: s.costos }))} series={[{ key: "ventas", name: "Ventas netas" }, { key: "costos", name: "Costos" }]} />
        </ChartCard>
        <ChartCard title={`Utilidad mensual · ${prm.year}`} description="Utilidad estimada de cada mes (negativa por debajo de la línea cero)." empty={!anyMonthly}
          table={{ headers: ["Mes", "Utilidad", "Cobrado"], rows: series.map((s) => [mlabel(s.m), formatMXN(s.utilidad), formatMXN(s.cobrado)]) }}>
          <ColumnChart data={series.map((s) => ({ label: mlabel(s.m), utilidad: s.utilidad }))} series={[{ key: "utilidad", name: "Utilidad" }]} />
        </ChartCard>
        <ChartCard title={`Servicios realizados por mes · ${prm.year}`} empty={!series.some((x) => x.servicios)}
          table={{ headers: ["Mes", "Solicitudes", "Confirmadas", "Realizados"], rows: series.map((s) => [mlabel(s.m), s.solicitudes, s.confirmadas, s.servicios]) }}>
          <ColumnChart fmt="int" data={series.map((s) => ({ label: mlabel(s.m), servicios: s.servicios }))} series={[{ key: "servicios", name: "Servicios realizados" }]} />
        </ChartCard>
        <ChartCard title="Conversión comercial" description={`Solicitudes registradas en el periodo · conversión ${pct(c.conversion)} · ${c.noConcretadas} no concretada(s), ${c.enSeguimiento} en seguimiento`} empty={c.recibidas === 0}
          table={{ headers: ["Etapa", "Solicitudes"], rows: funnel.map((f) => [f.label, f.value]) }}>
          <BarList fmt="int" ordinal data={funnel} series={[{ key: "value", name: "Solicitudes" }]} />
        </ChartCard>
        <ChartCard title="Ingresos y rentabilidad por unidad" description={`Utilidad después de costos compartidos asignados ${CRITERIO[byVehicle.criterio]}.`} empty={!byVehicle.rows.some((x) => x.ingresos || x.utilidad)}
          table={{ headers: ["Unidad", "Ingresos", "Utilidad"], rows: byVehicle.rows.map((x) => [x.name, formatMXN(x.ingresos), formatMXN(x.utilidad)]) }}>
          <BarList data={byVehicle.rows.map((x) => ({ label: x.name, ingresos: x.ingresos, utilidad: x.utilidad }))} series={[{ key: "ingresos", name: "Ingresos" }, { key: "utilidad", name: "Utilidad estimada" }]} />
        </ChartCard>
        <ChartCard title="Distribución de gastos" description="Sin IVA, del periodo." empty={!expenseDist.some((e) => e.value)}
          table={{ headers: ["Concepto", "Importe"], rows: expenseDist.map((e) => [e.label, formatMXN(e.value)]) }}>
          <BarList data={expenseDist} series={[{ key: "value", name: "Importe" }]} />
        </ChartCard>
      </div>

      {/* Resultados por vehículo */}
      <Card className="mb-6">
        <CardHeader
          title="Resultados por unidad"
          description={`Costos compartidos (gastos fijos + nómina no ligada a servicios): ${formatMXN(byVehicle.shared)}, asignados ${CRITERIO[byVehicle.criterio]} (configurable en Configuración → Parámetros financieros).${byVehicle.unassigned ? ` Sin asignar por falta de base: ${formatMXN(byVehicle.unassigned)}.` : ""}`}
        />
        <Table>
          <thead><tr><Th>Unidad</Th><Th className="text-center">Servicios</Th><Th className="text-right">Km</Th><Th className="text-right">Ingresos</Th><Th className="text-right">Gastos directos</Th><Th className="text-right">Costos de operación</Th><Th className="text-right">Depreciación</Th><Th className="text-right">Compartidos</Th><Th className="text-right">Utilidad</Th><Th className="text-right">Margen</Th></tr></thead>
          <tbody>
            {byVehicle.rows.map((x) => (
              <Tr key={x.id}>
                <Td><Link href={`/resultados?${new URLSearchParams({ ...Object.fromEntries(Object.entries(prm.raw).filter(([, v]) => v)) as Record<string, string>, unidad: x.id })}`} className="font-medium hover:text-brand-600">{x.name}</Link>{!x.active && <Badge className="ml-2">Baja</Badge>}</Td>
                <Td className="text-center tabular-nums">{x.servicios}</Td>
                <Td className="text-right tabular-nums">{formatNumber(x.km)}</Td>
                <Td className="text-right tabular-nums">{formatMXN(x.ingresos)}</Td>
                <Td className="text-right tabular-nums">{formatMXN(x.gastosDirectos)}</Td>
                <Td className="text-right tabular-nums" title="Directos + flotilla + nómina de sus servicios">{formatMXN(x.costosOperacion)}</Td>
                <Td className="text-right tabular-nums">{formatMXN(x.depreciacion)}</Td>
                <Td className="text-right tabular-nums">{formatMXN(x.compartidos)}</Td>
                <Td className={`text-right font-semibold tabular-nums ${x.utilidad < 0 ? "text-red-700" : ""}`}>{formatMXN(x.utilidad)}</Td>
                <Td className="text-right tabular-nums">{pct(x.margen)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Comparativo */}
      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Comparativo" description={compare.labels.join(" vs. ")} />
          <Table>
            <thead><tr><Th>Indicador</Th>{compare.labels.map((l) => <Th key={l} className="text-right">{l}</Th>)}<Th className="text-right">Cambio</Th></tr></thead>
            <tbody>
              {compare.rows.map((row) => (
                <Tr key={row.label}>
                  <Td className="text-sm">{row.label}</Td>
                  {row.values.map((v, i) => <Td key={i} className="whitespace-nowrap text-right tabular-nums">{row.money ? formatMXN(v) : formatNumber(v)}</Td>)}
                  <Td className="whitespace-nowrap text-right text-xs">{delta(row.values[0], row.values[1])}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card><CardHeader title="Estado de resultados" /><CardBody><IncomeStatement r={r} /></CardBody></Card>
        <Card><CardHeader title="Flujo de efectivo" /><CardBody><CashFlow r={r} /></CardBody></Card>
      </div>
    </>
  );
}
