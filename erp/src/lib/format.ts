/** Formatos para México: moneda MXN, fechas es-MX, zona horaria America/Mexico_City. */
export const TIME_ZONE = "America/Mexico_City";
export const LOCALE = "es-MX";

const mxn = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
const num = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

type Numeric = number | string | { toString(): string } | null | undefined;

export function toNumber(v: Numeric): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v.toString());
  return Number.isFinite(n) ? n : 0;
}

export function formatMXN(v: Numeric): string {
  return mxn.format(toNumber(v));
}

export function formatNumber(v: Numeric): string {
  return num.format(toNumber(v));
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0 %";
  return `${num.format(Math.round(ratio * 1000) / 10)} %`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

/** Para columnas DATE (sin hora) que Prisma entrega como medianoche UTC. */
export function formatDateOnly(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(d));
}

/** Partes de fecha en la zona horaria de México. */
export function mexicoParts(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute"), second: get("second") };
}

/** Diferencia (minutos) entre UTC y la hora de México en un instante dado. */
function mexicoOffsetMinutes(d: Date): number {
  const p = mexicoParts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** Convierte una fecha/hora local de México (año, mes 1-12, día, hora, min) a instante UTC. */
export function mexicoLocalToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = mexicoOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60000);
}

/** Inicio y fin (exclusivo) de un mes calendario en hora de México, como instantes UTC. */
export function mexicoMonthRange(year: number, month: number) {
  const start = mexicoLocalToUtc(year, month, 1);
  const end = month === 12 ? mexicoLocalToUtc(year + 1, 1, 1) : mexicoLocalToUtc(year, month + 1, 1);
  return { start, end };
}

/** Rango de un mes para columnas DATE (medianoche UTC). */
export function dateOnlyMonthRange(year: number, month: number) {
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

export const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
