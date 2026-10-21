/**
 * Datos del dashboard de Resultados. Reutiliza el motor único (results.ts).
 *
 * EMBUDO COMERCIAL (solicitudes registradas en el periodo):
 *   recibidas → cotizadas (con al menos una versión de precio) → confirmadas (convertidas en servicio)
 *   conversión comercial = confirmadas ÷ recibidas · cierre de cotizaciones = confirmadas ÷ cotizadas
 *
 * RESULTADOS POR UNIDAD:
 *   ingresos, gastos directos, flotilla, nómina del servicio y depreciación de la unidad = motor con filtro de unidad
 *   (servicios con varias unidades se reparten en partes iguales).
 *   Costos compartidos = gastos fijos + nómina no ligada a servicios (sueldo base, bonos, etc.).
 *   Se asignan con el criterio configurado: INGRESOS | KILOMETROS | SERVICIOS | PARTES_IGUALES.
 *   Si la base del criterio es cero (p. ej. sin km), quedan «sin asignar» y se muestran aparte.
 *   Utilidad estimada de la unidad = resultado operativo de la unidad − costos compartidos asignados.
 */
import type { Db } from "../db";
import { getSetting } from "../settings";
import { kmBetween } from "../domain/fleet";
import { periodResults, monthPeriod, type Period, type ResultFilters, type PeriodResults } from "./results";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function commercialStats(db: Db, p: Period, f: ResultFilters = {}) {
  const typeFilter = f.serviceType ? { serviceType: f.serviceType } : {};
  const reqs = await db.request.findMany({
    where: { registeredAt: { gte: p.start, lt: p.end }, ...typeFilter },
    select: { status: true, currentQuoteId: true },
  });
  const recibidas = reqs.length;
  const cotizadas = reqs.filter((r) => r.currentQuoteId).length;
  const confirmadas = reqs.filter((r) => r.status === "CONFIRMADA").length;
  const noConcretadas = reqs.filter((r) => r.status === "NO_CONCRETADA").length;
  const canceladas = reqs.filter((r) => r.status === "CANCELADA").length;
  const enSeguimiento = recibidas - confirmadas - noConcretadas - canceladas;
  const vf = f.vehicleId ? { vehicles: { some: { vehicleId: f.vehicleId } } } : {};
  const [serviciosConfirmados, serviciosRealizados, serviciosCancelados] = await Promise.all([
    db.service.count({ where: { createdAt: { gte: p.start, lt: p.end }, ...typeFilter, ...vf } }),
    db.service.count({ where: { status: "FINALIZADO", actualStart: { gte: p.start, lt: p.end }, ...typeFilter, ...vf } }),
    db.service.count({ where: { status: "CANCELADO", cancelledAt: { gte: p.start, lt: p.end }, ...typeFilter, ...vf } }),
  ]);
  return {
    recibidas, cotizadas, confirmadas, noConcretadas, canceladas, enSeguimiento,
    conversion: recibidas ? confirmadas / recibidas : null,
    cierreCotizaciones: cotizadas ? confirmadas / cotizadas : null,
    serviciosConfirmados, serviciosRealizados, serviciosCancelados,
  };
}
export type CommercialStats = Awaited<ReturnType<typeof commercialStats>>;

/** Serie mensual de un año (hasta el mes indicado). */
export async function monthlySeries(db: Db, year: number, lastMonth: number, f: ResultFilters = {}) {
  const out = [];
  for (let m = 1; m <= lastMonth; m++) {
    const p = monthPeriod(year, m);
    const [r, c] = await Promise.all([periodResults(db, p, f), commercialStats(db, p, f)]);
    const costos = r.gastos.directos + r.gastos.flotilla + r.gastos.fijos + r.nomina.devengada + r.depreciacion.monto;
    out.push({
      m, ventas: r.ventas.netas, cobrado: r.cobranza.neto, costos: r2(costos), utilidad: r.utilidad,
      gastosDirectos: r.gastos.directos, servicios: c.serviciosRealizados, solicitudes: c.recibidas, confirmadas: c.confirmadas,
    });
  }
  return out;
}

export async function vehicleResults(db: Db, p: Period, global: PeriodResults) {
  const { criterioAsignacionFijos } = await getSetting(db, "finanzas");
  const vehicles = await db.vehicle.findMany({ orderBy: { name: "asc" } });
  const rows: { v: (typeof vehicles)[number]; r: PeriodResults; km: number; servicios: number }[] = [];
  for (const v of vehicles) {
    const [r, km, servicios] = await Promise.all([
      periodResults(db, p, { vehicleId: v.id }),
      kmBetween(db, v.id, v.initialOdometer, p.start, p.end),
      db.service.count({ where: { status: "FINALIZADO", actualStart: { gte: p.start, lt: p.end }, vehicles: { some: { vehicleId: v.id } } } }),
    ]);
    const hasActivity = r.ventas.netas || r.gastos.directos || r.gastos.flotilla || r.depreciacion.monto || km || servicios;
    if (!v.active && !hasActivity) continue;
    rows.push({ v, r, km, servicios });
  }
  const shared = r2(global.gastos.fijos + (global.nomina.devengada - global.nomina.servicios));
  const weight = (x: (typeof rows)[number]) =>
    criterioAsignacionFijos === "INGRESOS" ? x.r.ventas.netas
    : criterioAsignacionFijos === "KILOMETROS" ? x.km
    : criterioAsignacionFijos === "SERVICIOS" ? x.servicios
    : x.v.active ? 1 : 0;
  const totalW = rows.reduce((a, x) => a + weight(x), 0);
  const result = rows.map((x) => {
    const asignado = totalW > 0 ? r2((shared * weight(x)) / totalW) : 0;
    const costosOperacion = r2(x.r.gastos.directos + x.r.gastos.flotilla + x.r.nomina.devengada);
    return {
      id: x.v.id, name: x.v.name, active: x.v.active, servicios: x.servicios, km: x.km,
      ingresos: x.r.ventas.netas, gastosDirectos: x.r.gastos.directos, flotilla: x.r.gastos.flotilla, nomina: x.r.nomina.devengada,
      costosOperacion, depreciacion: x.r.depreciacion.monto, compartidos: asignado,
      utilidad: r2(x.r.resultadoOperativo - asignado),
      margen: x.r.ventas.netas > 0 ? (x.r.resultadoOperativo - asignado) / x.r.ventas.netas : null,
    };
  });
  return { rows: result, shared, unassigned: totalW > 0 ? 0 : shared, criterio: criterioAsignacionFijos };
}
