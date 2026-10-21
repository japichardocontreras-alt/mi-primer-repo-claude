import type { Db } from "../db";
import { odometerIssues } from "../domain/closing";

/**
 * Historial de servicios de una unidad y sus indicadores.
 * Ingreso atribuido: precio del servicio ÷ número de unidades que participaron (criterio transparente).
 * Gastos asociados: gastos del folio cargados a esta unidad.
 */
export async function vehicleOverview(db: Db, vehicleId: string) {
  const [services, readings, fleetExpenses, fuel] = await Promise.all([
    db.service.findMany({
      where: { status: "FINALIZADO", vehicles: { some: { vehicleId } } },
      include: {
        client: true, originAddress: true, destinationAddress: true, vehicles: true,
        expenses: { where: { cancelledAt: null, vehicleId } },
        odometerReadings: { where: { vehicleId } },
      },
      orderBy: { actualStart: "desc" },
    }),
    db.odometerReading.findMany({ where: { vehicleId }, include: { service: { select: { id: true, folio: true } } }, orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }], take: 200 }),
    db.expense.findMany({ where: { vehicleId, cancelledAt: null }, include: { category: true } }),
    db.fuelLog.findMany({ where: { vehicleId, cancelledAt: null }, include: { service: { select: { folio: true, id: true } }, expense: true }, orderBy: { date: "desc" } }),
  ]);
  const history = services.map((s) => {
    let km = 0;
    for (const r of s.odometerReadings) km += r.source === "SERVICIO_FIN" ? r.odometer : r.source === "SERVICIO_INICIO" ? -r.odometer : 0;
    const income = Number(s.contractedPrice) / Math.max(1, s.vehicles.length);
    const costs = s.expenses.reduce((a, e) => a + Number(e.total), 0);
    return { s, km, income, costs };
  });
  const fleetOnly = fleetExpenses.filter((e) => !e.serviceId);
  const liters = fuel.reduce((a, f) => a + Number(f.liters), 0);
  const kmServices = history.reduce((a, h) => a + h.km, 0);
  const litersInServices = fuel.filter((f) => f.service).reduce((a, f) => a + Number(f.liters), 0);
  const kmWithFuel = history.filter((h) => fuel.some((f) => f.service?.id === h.s.id)).reduce((a, h) => a + h.km, 0);
  return {
    history, readings, fuel,
    issues: await odometerIssues(db, vehicleId),
    totals: {
      services: history.length,
      km: kmServices,
      income: history.reduce((a, h) => a + h.income, 0),
      serviceCosts: history.reduce((a, h) => a + h.costs, 0),
      fleetCosts: fleetOnly.reduce((a, e) => a + Number(e.total), 0),
      byCategory: Object.entries(fleetExpenses.reduce<Record<string, number>>((acc, e) => ((acc[e.category.name] = (acc[e.category.name] ?? 0) + Number(e.total)), acc), {})).sort((a, b) => b[1] - a[1]),
      liters,
      kmPerLiter: litersInServices > 0 && kmWithFuel > 0 ? kmWithFuel / litersInServices : null,
    },
  };
}
