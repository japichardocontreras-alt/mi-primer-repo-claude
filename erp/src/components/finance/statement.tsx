import type { PeriodResults } from "@/lib/finance/results";
import { formatMXN, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

function Line({ label, value, strong, negative, hint, indent }: { label: string; value: number; strong?: boolean; negative?: boolean; hint?: string; indent?: boolean }) {
  return (
    <tr className={cn("border-b border-neutral-100", strong && "bg-neutral-50")}>
      <td className={cn("py-2 pr-3 text-sm", strong ? "font-semibold" : "text-neutral-700", indent && "pl-5")}>
        {label}{hint && <span className="block text-[11px] font-normal text-neutral-500">{hint}</span>}
      </td>
      <td className={cn("whitespace-nowrap py-2 text-right text-sm tabular-nums", strong && "font-semibold", value < 0 && "text-red-700")}>{negative && value ? `− ${formatMXN(value)}` : formatMXN(value)}</td>
    </tr>
  );
}

/** Estado de resultados del periodo (fórmulas en lib/finance/results.ts). */
export function IncomeStatement({ r }: { r: PeriodResults }) {
  return (
    <table className="w-full">
      <tbody>
        <Line label="Ventas pactadas" value={r.ventas.pactadas} hint={`${r.ventas.servicios} servicio(s) con fecha en el periodo`} />
        <Line label="Ventas netas (sin IVA)" value={r.ventas.netas} strong />
        <Line label="Gastos directos de servicios" value={r.gastos.directos} negative indent />
        <Line label="Gastos de flotilla" value={r.gastos.flotilla} negative indent hint="Mantenimiento, documentos, combustible fuera de servicio" />
        <Line label="Gastos fijos" value={r.gastos.fijos} negative indent />
        <Line label="Nómina devengada" value={r.nomina.devengada} negative indent hint={`Por servicio ${formatMXN(r.nomina.servicios)}`} />
        <Line label={`Depreciación${r.depreciacion.estimada ? " (estimada)" : ""}`} value={r.depreciacion.monto} negative indent hint={r.depreciacion.metodo === "LINEAL_TIEMPO" ? "Lineal por tiempo" : "Por kilómetro"} />
        <Line label="Resultado operativo" value={r.resultadoOperativo} strong />
        <Line label="Ingresos extraordinarios" value={r.otros.ingresosExtra} indent />
        <Line label="Gastos extraordinarios" value={r.gastos.extraordinarios} negative indent />
        <Line label="Intereses de financiamiento" value={r.otros.intereses} negative indent />
        <Line label="Utilidad estimada" value={r.utilidad} strong />
        <tr><td className="py-2 text-sm text-neutral-600">Margen de utilidad</td><td className="py-2 text-right text-sm font-semibold tabular-nums">{r.margen === null ? "—" : formatPercent(r.margen)}</td></tr>
      </tbody>
    </table>
  );
}

export function CashFlow({ r }: { r: PeriodResults }) {
  return (
    <table className="w-full">
      <tbody>
        <Line label="Cobros a clientes" value={r.cobranza.cobrado} indent />
        {r.cobranza.reembolsos > 0 && <Line label="Reembolsos" value={r.cobranza.reembolsos} negative indent />}
        <Line label="Préstamos recibidos" value={r.otros.prestamos} indent hint="No son ventas" />
        <Line label="Aportaciones de capital" value={r.otros.aportaciones} indent />
        <Line label="Ingresos extraordinarios" value={r.otros.ingresosExtra} indent />
        <Line label="Total entradas" value={r.flujo.entradas} strong />
        <Line label="Gastos pagados (con IVA)" value={r.flujo.gastosPagados} negative indent />
        <Line label="Nómina entregada" value={r.nomina.pagada} negative indent hint="Pagos de corte y anticipos" />
        <Line label="Compras de activo" value={r.otros.comprasActivo} negative indent hint="No es gasto operativo" />
        <Line label="Pagos de financiamiento" value={r.otros.pagosFinanciamiento} negative indent hint={`Incluye intereses ${formatMXN(r.otros.intereses)}`} />
        <Line label="Retiros de socios" value={r.otros.retiros} negative indent />
        <Line label="Total salidas" value={r.flujo.salidas} strong />
        <Line label="Flujo neto del periodo" value={r.flujo.neto} strong />
      </tbody>
    </table>
  );
}
