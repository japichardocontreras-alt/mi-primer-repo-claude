import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { loadDashboard, parseDashboardParams } from "@/lib/finance/dashboard-page";
import { MONTHS_ES, formatDateTime, formatMXN, formatNumber, formatPercent } from "@/lib/format";
import { BrandMark } from "@/components/brand-logo";
import { IncomeStatement, CashFlow } from "@/components/finance/statement";
import { PrintButton } from "../print-button";

export const metadata = { title: "Reporte de resultados" };
const pct = (v: number | null) => (v === null ? "—" : formatPercent(v));

export default async function ReporteResultados({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission("resultados.ver");
  const prm = parseDashboardParams(await searchParams);
  const [d, empresa, vehicle] = await Promise.all([
    loadDashboard(prisma, prm), getSetting(prisma, "empresa"),
    prm.filters.vehicleId ? prisma.vehicle.findUnique({ where: { id: prm.filters.vehicleId } }) : null,
  ]);
  const { r, c } = d;
  const kpi = (l: string, v: string) => <div className="rounded border border-neutral-200 p-2"><p className="text-[10px] uppercase text-neutral-500">{l}</p><p className="text-sm font-semibold tabular-nums">{v}</p></div>;
  return (
    <div className="min-h-dvh bg-neutral-200 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden"><PrintButton /></div>
      <article className="mx-auto max-w-[210mm] space-y-5 bg-white p-8 text-[12px] text-neutral-800 shadow-lg print:p-0 print:shadow-none">
        <header className="flex items-center justify-between border-b-4 border-brand-600 pb-3">
          <div className="flex items-center gap-3"><BrandMark className="h-10 w-10" /><div><p className="font-bold">{empresa.nombre.toUpperCase()}</p><p className="text-xs text-neutral-500">Reporte de resultados</p></div></div>
          <div className="text-right"><p className="text-base font-semibold">{d.label}</p><p className="text-xs text-neutral-500">{vehicle ? vehicle.name : "Todas las unidades"}{prm.filters.serviceType ? ` · ${prm.filters.serviceType.toLowerCase()}` : ""} · {formatDateTime(new Date())}</p></div>
        </header>
        <section className="grid grid-cols-4 gap-2">
          {kpi("Solicitudes", String(c.recibidas))}{kpi("Cotizadas", String(c.cotizadas))}{kpi("Servicios realizados", String(c.serviciosRealizados))}{kpi("Conversión", pct(c.conversion))}
          {kpi("Ventas pactadas", formatMXN(r.ventas.pactadas))}{kpi("Cobrado", formatMXN(r.cobranza.neto))}{kpi("Cuentas por cobrar", formatMXN(r.cobranza.cuentasPorCobrar))}{kpi("Flujo neto", formatMXN(r.flujo.neto))}
          {kpi("Resultado operativo", formatMXN(r.resultadoOperativo))}{kpi("Utilidad estimada", formatMXN(r.utilidad))}{kpi("Margen", pct(r.margen))}{kpi("Servicios cancelados", String(c.serviciosCancelados))}
        </section>
        <section className="grid grid-cols-2 gap-6">
          <div><p className="mb-1 font-semibold">Estado de resultados</p><IncomeStatement r={r} /></div>
          <div><p className="mb-1 font-semibold">Flujo de efectivo</p><CashFlow r={r} /></div>
        </section>
        <section className="break-inside-avoid">
          <p className="mb-1 font-semibold">Resultados por unidad</p>
          <table className="w-full">
            <thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase text-neutral-500"><th className="py-1">Unidad</th><th className="text-right">Serv.</th><th className="text-right">Km</th><th className="text-right">Ingresos</th><th className="text-right">Costos op.</th><th className="text-right">Depreciación</th><th className="text-right">Compartidos</th><th className="text-right">Utilidad</th></tr></thead>
            <tbody>{d.byVehicle.rows.map((x) => <tr key={x.id} className="border-b border-neutral-100"><td className="py-1">{x.name}</td><td className="text-right">{x.servicios}</td><td className="text-right tabular-nums">{formatNumber(x.km)}</td><td className="text-right tabular-nums">{formatMXN(x.ingresos)}</td><td className="text-right tabular-nums">{formatMXN(x.costosOperacion)}</td><td className="text-right tabular-nums">{formatMXN(x.depreciacion)}</td><td className="text-right tabular-nums">{formatMXN(x.compartidos)}</td><td className="text-right font-semibold tabular-nums">{formatMXN(x.utilidad)}</td></tr>)}</tbody>
          </table>
        </section>
        <section className="break-inside-avoid">
          <p className="mb-1 font-semibold">Serie mensual {prm.year}</p>
          <table className="w-full">
            <thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase text-neutral-500"><th className="py-1">Mes</th><th className="text-right">Ventas netas</th><th className="text-right">Costos</th><th className="text-right">Utilidad</th><th className="text-right">Cobrado</th><th className="text-right">Servicios</th></tr></thead>
            <tbody>{d.series.map((s) => <tr key={s.m} className="border-b border-neutral-100"><td className="py-1">{MONTHS_ES[s.m - 1]}</td><td className="text-right tabular-nums">{formatMXN(s.ventas)}</td><td className="text-right tabular-nums">{formatMXN(s.costos)}</td><td className="text-right tabular-nums">{formatMXN(s.utilidad)}</td><td className="text-right tabular-nums">{formatMXN(s.cobrado)}</td><td className="text-right">{s.servicios}</td></tr>)}</tbody>
          </table>
        </section>
        <p className="text-[10px] text-neutral-500">Importes sin IVA salvo flujo de efectivo. Ventas reconocidas por fecha del servicio; nómina por devengo; depreciación {r.depreciacion.estimada ? "estimada" : "registrada"}. Costos compartidos asignados a unidades según el criterio configurado. Ver docs/FORMULAS.md.</p>
      </article>
    </div>
  );
}
