import type { Db } from "../db";
import { MONTHS_ES, mexicoParts } from "../format";
import { periodResults, monthPeriod, yearPeriod, type Period, type ResultFilters } from "./results";
import { commercialStats, monthlySeries, vehicleResults } from "./dashboard";

export type DashboardParams = {
  vista: "mes" | "anio";
  year: number;
  month: number;
  filters: ResultFilters;
  raw: Record<string, string | undefined>;
};

const TYPES = ["LOCAL", "FORANEO", "FLETE", "OTRO"] as const;

export function parseDashboardParams(sp: Record<string, string | undefined>): DashboardParams {
  const now = mexicoParts();
  const vista = sp.vista === "anio" ? "anio" : "mes";
  let year = now.year, month = now.month;
  if (vista === "mes" && sp.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes)) [year, month] = sp.mes.split("-").map(Number);
  if (vista === "anio" && sp.anio && /^\d{4}$/.test(sp.anio)) { year = Number(sp.anio); month = year === now.year ? now.month : 12; }
  const filters: ResultFilters = {
    ...(sp.unidad && /^[0-9a-f-]{36}$/i.test(sp.unidad) ? { vehicleId: sp.unidad } : {}),
    ...(sp.tipo && (TYPES as readonly string[]).includes(sp.tipo) ? { serviceType: sp.tipo as (typeof TYPES)[number] } : {}),
  };
  return { vista, year, month, filters, raw: { vista, mes: vista === "mes" ? `${year}-${String(month).padStart(2, "0")}` : undefined, anio: vista === "anio" ? String(year) : undefined, unidad: filters.vehicleId, tipo: filters.serviceType } };
}

export async function loadDashboard(db: Db, prm: DashboardParams) {
  const now = mexicoParts();
  const period: Period = prm.vista === "mes" ? monthPeriod(prm.year, prm.month) : yearPeriod(prm.year);
  const label = prm.vista === "mes" ? `${MONTHS_ES[prm.month - 1]} ${prm.year}` : `Año ${prm.year}`;
  const lastMonth = prm.year < now.year ? 12 : prm.year === now.year ? Math.max(now.month, prm.vista === "mes" ? prm.month : 1) : prm.vista === "mes" ? prm.month : 12;

  const comparePeriods: { label: string; p: Period }[] =
    prm.vista === "mes"
      ? [
          { label: `${MONTHS_ES[prm.month - 1].slice(0, 3)} ${prm.year}`, p: period },
          { label: prm.month === 1 ? `Dic ${prm.year - 1}` : `${MONTHS_ES[prm.month - 2].slice(0, 3)} ${prm.year}`, p: prm.month === 1 ? monthPeriod(prm.year - 1, 12) : monthPeriod(prm.year, prm.month - 1) },
          { label: `${MONTHS_ES[prm.month - 1].slice(0, 3)} ${prm.year - 1}`, p: monthPeriod(prm.year - 1, prm.month) },
        ]
      : [
          { label: String(prm.year), p: period },
          { label: String(prm.year - 1), p: yearPeriod(prm.year - 1) },
        ];

  const [r, c, series] = await Promise.all([periodResults(db, period, prm.filters), commercialStats(db, period, prm.filters), monthlySeries(db, prm.year, lastMonth, prm.filters)]);
  const byVehicle = await vehicleResults(db, period, prm.filters.vehicleId || prm.filters.serviceType ? await periodResults(db, period) : r);
  if (prm.filters.vehicleId) byVehicle.rows = byVehicle.rows.filter((x) => x.id === prm.filters.vehicleId);

  const cmp = await Promise.all(comparePeriods.map(async (x, i) => (i === 0 ? { r, c } : { r: await periodResults(db, x.p, prm.filters), c: await commercialStats(db, x.p, prm.filters) })));
  const rows = [
    { label: "Ventas netas", money: true, values: cmp.map((x) => x.r.ventas.netas) },
    { label: "Ingresos cobrados", money: true, values: cmp.map((x) => x.r.cobranza.neto) },
    { label: "Gastos directos", money: true, values: cmp.map((x) => x.r.gastos.directos) },
    { label: "Gastos fijos", money: true, values: cmp.map((x) => x.r.gastos.fijos) },
    { label: "Nómina", money: true, values: cmp.map((x) => x.r.nomina.devengada) },
    { label: "Utilidad estimada", money: true, values: cmp.map((x) => x.r.utilidad) },
    { label: "Solicitudes", money: false, values: cmp.map((x) => x.c.recibidas) },
    { label: "Servicios realizados", money: false, values: cmp.map((x) => x.c.serviciosRealizados) },
  ];
  return { label, period, r, c, series, byVehicle, compare: { labels: comparePeriods.map((x) => x.label), rows } };
}
