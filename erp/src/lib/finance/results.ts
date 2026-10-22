/**
 * MOTOR DE RESULTADOS — criterios y fórmulas (fuente única para Finanzas y Resultados).
 *
 * Periodo: instantes en hora de México [inicio, fin). Fechas puras (gastos, nómina) por fecha calendario.
 *
 * VENTAS
 *   Ventas pactadas = Σ precio contratado de servicios NO cancelados cuya fecha de servicio
 *                     (inicio real; si no hay, inicio programado) cae en el periodo. Incluye IVA cuando se pactó con IVA.
 *   Ventas netas    = ventas pactadas sin IVA (precio ÷ (1 + tasa) si el servicio incluye IVA).
 *   Servicios por programar (sin fecha) aún no son venta de ningún periodo.
 * COBRANZA
 *   Ingresos cobrados = Σ cobros vigentes con fecha en el periodo − reembolsos. (No es utilidad ni venta.)
 *   Cuentas por cobrar (al cierre) = Σ (precio − cobrado hasta el cierre) de servicios no cancelados con fecha anterior al cierre.
 * GASTOS (sin IVA: se usa el subtotal; el IVA pagado se informa aparte)
 *   Directos  = gastos ligados a un servicio.
 *   Flotilla  = gastos de categorías de flotilla, o ligados a una unidad sin servicio (mantenimiento, documentos, combustible).
 *   Fijos     = resto de categorías del grupo FIJO.
 *   Extraordinarios = gastos de categoría extraordinaria + movimientos «gasto extraordinario».
 *   El costo de mantenimiento, documentos y combustible SOLO existe en gastos (sus bitácoras no tienen importe propio).
 * NÓMINA = Σ devengos vigentes del periodo (servicio, sueldo base, bonos, horas extra, otros − deducciones).
 *   Lo pagado/anticipado es flujo de efectivo, no se vuelve a sumar como gasto.
 * DEPRECIACIÓN = registros mensuales del método configurado; si un mes no se ha registrado, se calcula con los
 *   mismos parámetros y se marca como «estimada». No es salida de efectivo.
 * RESULTADO OPERATIVO = ventas netas − directos − flotilla − fijos − nómina − depreciación.
 * ANTICIPOS RETENIDOS = de los servicios cancelados en el periodo, lo cobrado y no reembolsado (sin IVA si se pactó con IVA).
 *   Es ingreso (no venta): el efectivo ya contó en cobranza el día que se recibió. Un reembolso registrado
 *   después recalcula el mes de la cancelación.
 * UTILIDAD ESTIMADA   = resultado operativo + anticipos retenidos + ingresos extraordinarios − gastos extraordinarios − intereses.
 * MARGEN              = utilidad estimada ÷ ventas netas.
 * FLUJO DE EFECTIVO   = (cobros − reembolsos + préstamos + aportaciones + ingresos extraordinarios)
 *                     − (gastos pagados en el periodo, con IVA + nómina entregada + compras de activo
 *                        + pagos de financiamiento + gastos extraordinarios + retiros de socios).
 *   Préstamos y aportaciones no son ventas; compras de activo y abonos a capital no son gasto operativo.
 */
import type { Db } from "../db";
import { getSetting } from "../settings";
import { mexicoLocalToUtc, mexicoMonthRange } from "../format";
import { computeMonthlyDepreciation } from "../domain/fleet";

export type Period = { start: Date; end: Date; dateStart: Date; dateEnd: Date; months: { y: number; m: number }[] };
export type ResultFilters = { vehicleId?: string; serviceType?: "LOCAL" | "FORANEO" | "FLETE" | "OTRO" };

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v ?? 0);

/** Fecha de servicio para reconocer la venta. */
const serviceDate = (s: { actualStart: Date | null; scheduledStart: Date | null }) => s.actualStart ?? s.scheduledStart;

export async function periodResults(db: Db, p: Period, f: ResultFilters = {}) {
  const { tasaIva, metodoDepreciacion } = await getSetting(db, "finanzas");
  const svcWhere = {
    status: { not: "CANCELADO" as const },
    ...(f.serviceType ? { serviceType: f.serviceType } : {}),
    ...(f.vehicleId ? { vehicles: { some: { vehicleId: f.vehicleId } } } : {}),
  };
  const share = (s: { vehicles: { vehicleId: string }[] }) => (f.vehicleId ? 1 / Math.max(1, s.vehicles.length) : 1);

  // ---------------- Ventas
  const sold = await db.service.findMany({
    where: { ...svcWhere, OR: [{ actualStart: { gte: p.start, lt: p.end } }, { actualStart: null, scheduledStart: { gte: p.start, lt: p.end } }] },
    include: { vehicles: true },
  });
  let ventasPactadas = 0, ventasNetas = 0;
  for (const s of sold) {
    const price = num(s.contractedPrice) * share(s);
    ventasPactadas += price;
    ventasNetas += s.includesVat ? price / (1 + tasaIva) : price;
  }

  // ---------------- Cobranza
  const payments = await db.payment.findMany({
    where: { cancelledAt: null, receivedAt: { gte: p.start, lt: p.end }, service: f.vehicleId || f.serviceType ? { ...(f.serviceType ? { serviceType: f.serviceType } : {}), ...(f.vehicleId ? { vehicles: { some: { vehicleId: f.vehicleId } } } : {}) } : undefined },
    include: { service: { include: { vehicles: true } } },
  });
  let cobrado = 0, reembolsos = 0, ivaTrasladado = 0;
  for (const x of payments) {
    const a = num(x.amount) * share(x.service);
    if (x.kind === "REEMBOLSO") reembolsos += a; else cobrado += a;
    if (x.service.includesVat) ivaTrasladado += (x.kind === "REEMBOLSO" ? -a : a) * (tasaIva / (1 + tasaIva));
  }
  const openSvcs = await db.service.findMany({
    where: { ...svcWhere, OR: [{ actualStart: { lt: p.end } }, { actualStart: null, scheduledStart: { lt: p.end } }] },
    include: { vehicles: true, payments: { where: { cancelledAt: null, receivedAt: { lt: p.end } } } },
  });
  let cuentasPorCobrar = 0;
  for (const s of openSvcs) {
    const paid = s.payments.reduce((a, x) => a + (x.kind === "REEMBOLSO" ? -1 : 1) * num(x.amount), 0);
    cuentasPorCobrar += Math.max(0, num(s.contractedPrice) - paid) * share(s);
  }

  const cancelled = await db.service.findMany({
    where: { status: "CANCELADO", cancelledAt: { gte: p.start, lt: p.end }, ...(f.serviceType ? { serviceType: f.serviceType } : {}), ...(f.vehicleId ? { vehicles: { some: { vehicleId: f.vehicleId } } } : {}) },
    include: { vehicles: true, payments: { where: { cancelledAt: null } } },
  });
  let anticiposRetenidos = 0;
  for (const s of cancelled) {
    const kept = Math.max(0, s.payments.reduce((a, x) => a + (x.kind === "REEMBOLSO" ? -1 : 1) * num(x.amount), 0)) * share(s);
    anticiposRetenidos += s.includesVat ? kept / (1 + tasaIva) : kept;
  }

  // ---------------- Gastos (devengo por fecha contable; sin IVA)
  const expenses = await db.expense.findMany({
    where: {
      cancelledAt: null, date: { gte: p.dateStart, lt: p.dateEnd },
      ...(f.vehicleId ? { OR: [{ vehicleId: f.vehicleId }, { service: { vehicles: { some: { vehicleId: f.vehicleId } } }, vehicleId: null }] } : {}),
      ...(f.serviceType ? { service: { serviceType: f.serviceType } } : {}),
    },
    include: { category: true },
  });
  const gastos = { directos: 0, flotilla: 0, fijos: 0, extraordinarios: 0 };
  const porCategoria = new Map<string, { name: string; group: string; amount: number }>();
  for (const e of expenses) {
    const a = num(e.subtotal);
    const g = e.serviceId ? "directos" : e.category.group === "FLOTILLA" || (e.vehicleId && e.category.group !== "EXTRAORDINARIO") ? "flotilla" : e.category.group === "EXTRAORDINARIO" ? "extraordinarios" : "fijos";
    gastos[g] += a;
    const c = porCategoria.get(e.category.key) ?? { name: e.category.name, group: g, amount: 0 };
    c.amount += a;
    porCategoria.set(e.category.key, c);
  }
  const paidExpenses = await db.expense.findMany({ where: { cancelledAt: null, paidAt: { gte: p.dateStart, lt: p.dateEnd } } });
  const gastosPagados = paidExpenses.reduce((a, e) => a + num(e.total), 0);
  const ivaAcreditable = paidExpenses.reduce((a, e) => a + num(e.vatAmount), 0);

  // ---------------- Nómina
  const entries = await db.payrollEntry.findMany({
    where: { status: { not: "CANCELADO" }, date: { gte: p.dateStart, lt: p.dateEnd }, ...(f.vehicleId || f.serviceType ? { service: { ...(f.serviceType ? { serviceType: f.serviceType } : {}), ...(f.vehicleId ? { vehicles: { some: { vehicleId: f.vehicleId } } } : {}) } } : {}) },
  });
  const nomina = entries.reduce((a, x) => a + num(x.amount), 0);
  const nominaServicios = entries.filter((x) => x.kind === "SERVICIO").reduce((a, x) => a + num(x.amount), 0);
  const nominaPagada = f.vehicleId || f.serviceType ? 0 : (await db.payrollPayment.findMany({ where: { cancelledAt: null, paidAt: { gte: p.start, lt: p.end } } })).reduce((a, x) => a + num(x.amount), 0);

  // ---------------- Depreciación
  let depreciacion = 0;
  let depreciacionEstimada = false;
  for (const { y, m } of p.months) {
    const reg = await db.depreciationEntry.findMany({ where: { year: y, month: m, method: metodoDepreciacion, ...(f.vehicleId ? { vehicleId: f.vehicleId } : {}) } });
    if (reg.length) depreciacion += reg.reduce((a, d) => a + num(d.amount), 0);
    else {
      const calc = (await computeMonthlyDepreciation(db, y, m)).filter((d) => d.method === metodoDepreciacion && (!f.vehicleId || d.vehicleId === f.vehicleId));
      if (calc.length) depreciacionEstimada = true;
      depreciacion += calc.reduce((a, d) => a + d.amount, 0);
    }
  }

  // ---------------- Otros movimientos (no aplican a filtros por unidad/tipo, salvo compra de activo de la unidad)
  const movs = f.serviceType ? [] : await db.financialMovement.findMany({ where: { cancelledAt: null, date: { gte: p.dateStart, lt: p.dateEnd }, ...(f.vehicleId ? { vehicleId: f.vehicleId } : {}) } });
  const mv = (t: string) => movs.filter((x) => x.type === t).reduce((a, x) => a + num(x.amount), 0);
  const intereses = movs.filter((x) => x.type === "PAGO_FINANCIAMIENTO").reduce((a, x) => a + num(x.interestPortion), 0);
  const ingresosExtra = mv("INGRESO_EXTRAORDINARIO");
  const gastosExtra = gastos.extraordinarios + mv("GASTO_EXTRAORDINARIO");

  const costosOperativos = gastos.directos + gastos.flotilla + gastos.fijos + nomina + depreciacion;
  const resultadoOperativo = ventasNetas - costosOperativos;
  const utilidad = resultadoOperativo + anticiposRetenidos + ingresosExtra - gastosExtra - intereses;

  const entradas = cobrado - reembolsos + mv("PRESTAMO_RECIBIDO") + mv("APORTACION_CAPITAL") + ingresosExtra;
  const salidas = gastosPagados + nominaPagada + mv("COMPRA_ACTIVO") + mv("PAGO_FINANCIAMIENTO") + mv("GASTO_EXTRAORDINARIO") + mv("RETIRO_SOCIOS");

  return {
    ventas: { pactadas: r2(ventasPactadas), netas: r2(ventasNetas), servicios: sold.length },
    cobranza: { cobrado: r2(cobrado), reembolsos: r2(reembolsos), neto: r2(cobrado - reembolsos), cuentasPorCobrar: r2(cuentasPorCobrar) },
    gastos: { directos: r2(gastos.directos), flotilla: r2(gastos.flotilla), fijos: r2(gastos.fijos), extraordinarios: r2(gastosExtra), porCategoria: [...porCategoria.values()].map((c) => ({ ...c, amount: r2(c.amount) })).sort((a, b) => b.amount - a.amount) },
    nomina: { devengada: r2(nomina), servicios: r2(nominaServicios), pagada: r2(nominaPagada) },
    depreciacion: { monto: r2(depreciacion), estimada: depreciacionEstimada, metodo: metodoDepreciacion },
    otros: { prestamos: r2(mv("PRESTAMO_RECIBIDO")), aportaciones: r2(mv("APORTACION_CAPITAL")), comprasActivo: r2(mv("COMPRA_ACTIVO")), pagosFinanciamiento: r2(mv("PAGO_FINANCIAMIENTO")), intereses: r2(intereses), anticiposRetenidos: r2(anticiposRetenidos), ingresosExtra: r2(ingresosExtra), retiros: r2(mv("RETIRO_SOCIOS")) },
    resultadoOperativo: r2(resultadoOperativo),
    utilidad: r2(utilidad),
    margen: ventasNetas > 0 ? utilidad / ventasNetas : null,
    flujo: { entradas: r2(entradas), salidas: r2(salidas), neto: r2(entradas - salidas), gastosPagados: r2(gastosPagados) },
    iva: { tasa: tasaIva, trasladado: r2(ivaTrasladado), acreditable: r2(ivaAcreditable) },
  };
}
export type PeriodResults = Awaited<ReturnType<typeof periodResults>>;

/** Periodo de un mes calendario en hora de México. */
export function monthPeriod(y: number, m: number): Period {
  const r = mexicoMonthRange(y, m);
  return { start: r.start, end: r.end, dateStart: new Date(Date.UTC(y, m - 1, 1)), dateEnd: new Date(Date.UTC(y, m, 1)), months: [{ y, m }] };
}

/** Periodo de un año completo. */
export function yearPeriod(y: number): Period {
  return {
    start: mexicoLocalToUtc(y, 1, 1), end: mexicoLocalToUtc(y + 1, 1, 1), dateStart: new Date(Date.UTC(y, 0, 1)), dateEnd: new Date(Date.UTC(y + 1, 0, 1)),
    months: Array.from({ length: 12 }, (_, i) => ({ y, m: i + 1 })),
  };
}
