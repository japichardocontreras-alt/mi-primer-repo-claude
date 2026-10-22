/** Etiquetas y colores de catálogos (sin dependencias del servidor; usable en cliente). */
import type { Tone } from "@/components/ui/badge";

export const REQUEST_STATUS = {
  NUEVA: { label: "Nueva solicitud", tone: "blue" },
  INFORMACION_INCOMPLETA: { label: "Información incompleta", tone: "amber" },
  PENDIENTE_COTIZAR: { label: "Pendiente de cotizar", tone: "violet" },
  COTIZACION_ENVIADA: { label: "Cotización enviada", tone: "brand" },
  PENDIENTE_CONFIRMACION: { label: "Pendiente de confirmación", tone: "amber" },
  CONFIRMADA: { label: "Confirmada", tone: "green" },
  NO_CONCRETADA: { label: "No concretada", tone: "neutral" },
  CANCELADA: { label: "Cancelada", tone: "red" },
} as const satisfies Record<string, { label: string; tone: Tone }>;
export type RequestStatusKey = keyof typeof REQUEST_STATUS;

/** Estados de seguimiento comercial abierto. */
export const OPEN_STATUSES: RequestStatusKey[] = ["NUEVA", "INFORMACION_INCOMPLETA", "PENDIENTE_COTIZAR", "COTIZACION_ENVIADA", "PENDIENTE_CONFIRMACION"];
export const CLOSED_STATUSES: RequestStatusKey[] = ["CONFIRMADA", "NO_CONCRETADA", "CANCELADA"];

export const SERVICE_TYPE = { LOCAL: "Local", FORANEO: "Foráneo", FLETE: "Flete", OTRO: "Otro" } as const;
export type ServiceTypeKey = keyof typeof SERVICE_TYPE;

export const PACKAGE = { ESTANDAR: "Estándar", SUPERIOR: "Superior", COMPLETO: "Completo", PERSONALIZADO: "Personalizado" } as const;
export type PackageKey = keyof typeof PACKAGE;

export const CHANNEL = {
  WHATSAPP: "WhatsApp", TELEFONO: "Teléfono", CORREO: "Correo", FACEBOOK: "Facebook", INSTAGRAM: "Instagram",
  SITIO_WEB: "Sitio web", RECOMENDACION: "Recomendación", PRESENCIAL: "Presencial", OTRO: "Otro",
} as const;
export type ChannelKey = keyof typeof CHANNEL;

export const EVENT_TYPE = {
  CREADA: "Solicitud registrada", CAMBIO_ESTADO: "Cambio de estado", CONTACTO: "Contacto con el cliente", NOTA: "Nota",
  COTIZACION: "Cotización", EDICION: "Edición de datos", CONVERSION: "Conversión a servicio",
} as const;

/** Ubicación corta para tablas: municipio y estado. */
export function addressLine(a?: { municipality?: string | null; state?: string | null; neighborhood?: string | null } | null): string {
  if (!a) return "—";
  const parts = [a.municipality ?? a.neighborhood, a.state === "Estado de México" ? "Edo. Méx." : a.state].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export function fullAddress(a?: {
  street?: string | null; extNumber?: string | null; intNumber?: string | null; neighborhood?: string | null;
  municipality?: string | null; state?: string | null; postalCode?: string | null;
} | null): string {
  if (!a) return "—";
  const street = [a.street, a.extNumber ? `#${a.extNumber}` : null, a.intNumber ? `int. ${a.intNumber}` : null].filter(Boolean).join(" ");
  const parts = [street, a.neighborhood ? `Col. ${a.neighborhood}` : null, a.municipality, a.state, a.postalCode ? `C.P. ${a.postalCode}` : null].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
