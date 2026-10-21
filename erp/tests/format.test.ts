import { describe, expect, it } from "vitest";
import { formatMXN, formatDateTime, mexicoLocalToUtc, mexicoMonthRange, normalizePhone, mexicoParts } from "@/lib/format";
import { SETTINGS } from "@/lib/settings";

describe("Formatos México", () => {
  it("moneda MXN", () => {
    expect(formatMXN(4500).replace(/\s/g, " ")).toBe("$4,500.00");
    expect(formatMXN(null)).toBe("$0.00");
  });
  it("fecha y hora en America/Mexico_City (UTC−6, sin horario de verano)", () => {
    expect(formatDateTime(new Date("2026-10-22T15:30:00Z"))).toMatch(/22\/10\/2026.*09:30/);
    expect(formatDateTime(new Date("2026-07-01T15:30:00Z"))).toMatch(/09:30/);
  });
  it("convierte hora local de México a UTC", () => {
    expect(mexicoLocalToUtc(2026, 10, 22, 9, 30).toISOString()).toBe("2026-10-22T15:30:00.000Z");
    const r = mexicoMonthRange(2026, 12);
    expect(r.start.toISOString()).toBe("2026-12-01T06:00:00.000Z");
    expect(r.end.toISOString()).toBe("2027-01-01T06:00:00.000Z");
    expect(mexicoParts(new Date("2027-01-01T05:59:00Z")).year).toBe(2026);
  });
  it("normaliza teléfonos", () => expect(normalizePhone("(722) 830-0083")).toBe("7228300083"));
});

describe("Parámetros", () => {
  it("tienen valores por defecto válidos", () => {
    expect(SETTINGS.operacion.parse({}).minutosRegreso).toBe(60);
    expect(SETTINGS.finanzas.parse({}).tasaIva).toBe(0.16);
    expect(() => SETTINGS.operacion.parse({ minutosPreparacion: -5 })).toThrow();
  });
});
