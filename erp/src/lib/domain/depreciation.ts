/**
 * DEPRECIACIÓN (análisis económico; no es salida de efectivo y se reporta aparte de los gastos pagados).
 *
 * Lineal por tiempo:
 *   base depreciable = precio de adquisición − valor residual
 *   anual = base / vida útil (años) · mensual = anual / 12
 *   inicia el mes siguiente al de adquisición y se detiene al agotar la vida útil
 *   acumulada = mensual × meses transcurridos (tope: base) · valor contable = precio − acumulada
 *
 * Por kilómetro:
 *   por km = base / vida útil (km)
 *   acumulada = por km × km recorridos desde la adquisición (tope: base)
 */
export type DepParams = {
  acquisitionPrice: number | null;
  residualValue: number | null;
  usefulLifeYears: number | null;
  usefulLifeKm: number | null;
  acquisitionDate: Date | null; // fecha pura (medianoche UTC)
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function depreciableBase(p: DepParams) {
  if (!p.acquisitionPrice) return 0;
  return Math.max(0, p.acquisitionPrice - (p.residualValue ?? 0));
}

/** Meses completos de depreciación transcurridos al cierre del mes (y, m), iniciando el mes siguiente a la adquisición. */
export function monthsElapsed(acq: Date, y: number, m: number) {
  const startIdx = acq.getUTCFullYear() * 12 + acq.getUTCMonth() + 1; // mes siguiente
  const idx = y * 12 + (m - 1);
  return Math.max(0, idx - startIdx + 1);
}

export function straightLine(p: DepParams, y: number, m: number) {
  const base = depreciableBase(p);
  if (!base || !p.usefulLifeYears || !p.acquisitionDate) return null;
  const annual = base / p.usefulLifeYears;
  const monthly = annual / 12;
  const lifeMonths = p.usefulLifeYears * 12;
  const elapsed = Math.min(monthsElapsed(p.acquisitionDate, y, m), lifeMonths);
  const prevElapsed = Math.min(monthsElapsed(p.acquisitionDate, m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1), lifeMonths);
  const accumulated = Math.min(base, monthly * elapsed);
  const thisMonth = Math.min(base, monthly * elapsed) - Math.min(base, monthly * prevElapsed);
  return { annual: r2(annual), monthly: r2(monthly), thisMonth: r2(thisMonth), accumulated: r2(accumulated), bookValue: r2((p.acquisitionPrice ?? 0) - accumulated), monthsElapsed: elapsed, lifeMonths };
}

export function perKilometer(p: DepParams, kmTraveled: number, kmThisPeriod = 0) {
  const base = depreciableBase(p);
  if (!base || !p.usefulLifeKm) return null;
  const rate = base / p.usefulLifeKm;
  const accumulated = Math.min(base, rate * Math.max(0, kmTraveled));
  const before = Math.min(base, rate * Math.max(0, kmTraveled - kmThisPeriod));
  return { perKm: Math.round(rate * 10000) / 10000, accumulated: r2(accumulated), thisPeriod: r2(accumulated - before), bookValue: r2((p.acquisitionPrice ?? 0) - accumulated), kmTraveled };
}
