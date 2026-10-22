import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { periodResults, monthPeriod } from "@/lib/finance/results";
import { monthParam } from "@/lib/queries/period";
import { MONTHS_ES, formatMXN, formatPercent } from "@/lib/format";
import { Card, CardBody, CardHeader, Stat } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthPicker } from "@/components/month-picker";
import { IncomeStatement, CashFlow } from "@/components/finance/statement";

export const metadata = { title: "Finanzas" };

export default async function FinanzasResumen({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requirePermission("finanzas.ver");
  const { mes } = await searchParams;
  const mp = monthParam(mes);
  const r = await periodResults(prisma, monthPeriod(mp.y, mp.m));
  const totalGastos = r.gastos.directos + r.gastos.flotilla + r.gastos.fijos;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{MONTHS_ES[mp.m - 1]} {mp.y}</h2>
        <MonthPicker value={mp.key} />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ventas pactadas" value={formatMXN(r.ventas.pactadas)} hint={`Netas sin IVA ${formatMXN(r.ventas.netas)}`} tone="brand" />
        <Stat label="Ingresos cobrados" value={formatMXN(r.cobranza.neto)} hint="Efectivamente recibidos en el mes" tone="good" />
        <Stat label="Cuentas por cobrar" value={formatMXN(r.cobranza.cuentasPorCobrar)} hint="Al cierre del mes" tone={r.cobranza.cuentasPorCobrar > 0 ? "warn" : "neutral"} />
        <Stat label="Utilidad estimada" value={formatMXN(r.utilidad)} hint={r.margen === null ? "Sin ventas en el periodo" : `Margen ${formatPercent(r.margen)}`} tone={r.utilidad >= 0 ? "good" : "bad"} />
        <Stat label="Gastos operativos" value={formatMXN(totalGastos)} hint={`Directos ${formatMXN(r.gastos.directos)} · flotilla ${formatMXN(r.gastos.flotilla)} · fijos ${formatMXN(r.gastos.fijos)}`} />
        <Stat label="Nómina" value={formatMXN(r.nomina.devengada)} hint={`Entregada ${formatMXN(r.nomina.pagada)}`} />
        <Stat label="Depreciación" value={formatMXN(r.depreciacion.monto)} hint={r.depreciacion.estimada ? "Estimada (aún no registrada en Flotilla)" : "Registrada"} />
        <Stat label="Flujo de efectivo" value={formatMXN(r.flujo.neto)} hint={`Entradas ${formatMXN(r.flujo.entradas)} · salidas ${formatMXN(r.flujo.salidas)}`} tone={r.flujo.neto >= 0 ? "good" : "bad"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Estado de resultados" description="Importes sin IVA. Ventas reconocidas por fecha del servicio." />
          <CardBody><IncomeStatement r={r} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Flujo de efectivo" description="Dinero que entró y salió en el mes (con IVA)." />
          <CardBody><CashFlow r={r} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Gastos por categoría" description="Sin IVA, por fecha contable." />
          {r.gastos.porCategoria.length === 0 ? <EmptyState title="Sin gastos en el mes" /> : (
            <Table>
              <thead><tr><Th>Categoría</Th><Th>Grupo</Th><Th className="text-right">Importe</Th></tr></thead>
              <tbody>{r.gastos.porCategoria.map((c) => <Tr key={c.name}><Td>{c.name}</Td><Td className="text-xs capitalize text-neutral-500">{c.group}</Td><Td className="text-right tabular-nums">{formatMXN(c.amount)}</Td></Tr>)}</tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="IVA (informativo)" description="Referencia para su contador; el sistema no calcula obligaciones fiscales." />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-neutral-500">IVA en cobros de servicios con IVA</dt><dd className="font-semibold tabular-nums">{formatMXN(r.iva.trasladado)}</dd></div>
              <div><dt className="text-xs text-neutral-500">IVA en gastos pagados</dt><dd className="font-semibold tabular-nums">{formatMXN(r.iva.acreditable)}</dd></div>
              <p className="col-span-2 text-xs text-neutral-500">Tasa configurada: {formatPercent(r.iva.tasa)}. Solo se considera el IVA capturado en cada gasto y los servicios pactados con IVA.</p>
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
