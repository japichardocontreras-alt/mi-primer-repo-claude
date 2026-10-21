import { z } from "zod";
import { mexicoLocalToUtc } from "./format";

/** Texto opcional: vacío → undefined; recorta espacios. */
export const optText = (max = 2000) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v), z.string().max(max, `Máximo ${max} caracteres.`).optional());

export const reqText = (label: string, max = 200) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string({ required_error: `Indique ${label}.` }).min(1, `Indique ${label}.`).max(max, `Máximo ${max} caracteres.`));

/** Importe en pesos: acepta "$4,500.00", "4500", 4500. Máximo 2 decimales. */
function moneyBase(label: string, min: number) {
  return z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === "number") return v;
      const s = String(v).replace(/[$,\s]/g, "");
      return s === "" ? undefined : Number(s);
    },
    z
      .number({ required_error: `Indique ${label}.`, invalid_type_error: "Importe no válido." })
      .finite("Importe no válido.")
      .min(min, `El importe no puede ser menor a ${min}.`)
      .max(99_999_999, "Importe demasiado grande.")
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Máximo dos decimales."),
  );
}
export const moneyReq = (label = "el importe", min = 0) => moneyBase(label, min);
export const money = (label = "el importe", min = 0) => moneyBase(label, min).optional();

export const optNumber = (opts: { int?: boolean; min?: number; max?: number } = {}) =>
  z.preprocess(
    (v) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? undefined : Number(String(v).replace(/,/g, ""))),
    (opts.int ? z.number({ invalid_type_error: "Número no válido." }).int("Debe ser entero.") : z.number({ invalid_type_error: "Número no válido." }))
      .min(opts.min ?? 0, `Mínimo ${opts.min ?? 0}.`)
      .max(opts.max ?? 1_000_000, `Máximo ${opts.max ?? 1_000_000}.`)
      .optional(),
  );

/** "AAAA-MM-DD" → Date a medianoche UTC (columnas DATE). */
export const optDateOnly = () =>
  z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? undefined : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.")
      .transform((s) => new Date(`${s}T00:00:00.000Z`))
      .refine((d) => !Number.isNaN(d.getTime()), "Fecha no válida.")
      .optional(),
  );

/** "AAAA-MM-DDTHH:mm" en hora de México → instante UTC. */
export const optLocalDateTime = () =>
  z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? undefined : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Fecha y hora no válidas.")
      .transform((s) => {
        const [d, t] = s.split("T");
        const [y, m, day] = d.split("-").map(Number);
        const [h, min] = t.split(":").map(Number);
        return mexicoLocalToUtc(y, m, day, h, min);
      })
      .optional(),
  );

export const optTime = () =>
  z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida (HH:mm).").optional());

export const checkbox = () => z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean());

export const optBoolSelect = () =>
  z.preprocess((v) => (v === "si" ? true : v === "no" ? false : undefined), z.boolean().optional());

export const uuidOpt = () => z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid("Selección no válida.").optional());

export const phoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z
    .string({ required_error: "Indique el teléfono." })
    .min(1, "Indique el teléfono.")
    .max(30)
    .refine((s) => s.replace(/\D/g, "").length >= 8, "El teléfono debe tener al menos 8 dígitos."),
);

export const emailOpt = () =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email("Correo no válido.").max(150).optional());
