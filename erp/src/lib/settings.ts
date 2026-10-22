import { z } from "zod";
import type { Db } from "./db";

/** Parámetros configurables del sistema, con valores por defecto y validación. */
export const SETTINGS = {
  empresa: z.object({
    nombre: z.string().min(1).default("Mudanzas Metepec"),
    razonSocial: z.string().optional().default(""),
    rfc: z.string().optional().default(""),
    telefono: z.string().optional().default(""),
    correo: z.string().optional().default(""),
    direccion: z.string().optional().default(""),
  }),
  operacion: z.object({
    /** Minutos de preparación antes de cada servicio. */
    minutosPreparacion: z.coerce.number().int().min(0).max(600).default(30),
    /** Minutos de regreso a base después de cada servicio. */
    minutosRegreso: z.coerce.number().int().min(0).max(1440).default(60),
    /** Duración estimada por defecto de un servicio (horas). */
    duracionDefaultHoras: z.coerce.number().min(0.5).max(96).default(4),
    /** Días de vigencia por defecto de una cotización. */
    vigenciaCotizacionDias: z.coerce.number().int().min(1).max(180).default(15),
  }),
  alertas: z.object({
    diasAvisoDocumentos: z.coerce.number().int().min(1).max(180).default(30),
    kmAvisoMantenimiento: z.coerce.number().int().min(0).max(20000).default(1000),
    diasAvisoMantenimiento: z.coerce.number().int().min(1).max(180).default(15),
  }),
  finanzas: z.object({
    tasaIva: z.coerce.number().min(0).max(1).default(0.16),
    /** Criterio para repartir gastos fijos entre unidades en "resultados por vehículo". */
    criterioAsignacionFijos: z.enum(["KILOMETROS", "SERVICIOS", "INGRESOS", "PARTES_IGUALES"]).default("INGRESOS"),
    /** Método de depreciación que se usa en el estado de resultados. */
    metodoDepreciacion: z.enum(["LINEAL_TIEMPO", "POR_KILOMETRO"]).default("LINEAL_TIEMPO"),
  }),
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]>;

export async function getSetting<K extends SettingKey>(db: Db, key: K): Promise<SettingValue<K>> {
  const row = await db.setting.findUnique({ where: { key } });
  const parsed = SETTINGS[key].safeParse(row?.value ?? {});
  return (parsed.success ? parsed.data : SETTINGS[key].parse({})) as SettingValue<K>;
}

export async function saveSetting<K extends SettingKey>(db: Db, key: K, value: unknown, userId?: string) {
  const data = SETTINGS[key].parse(value) as object;
  await db.setting.upsert({
    where: { key },
    create: { key, value: data, updatedBy: userId },
    update: { value: data, updatedBy: userId },
  });
  return data as SettingValue<K>;
}
