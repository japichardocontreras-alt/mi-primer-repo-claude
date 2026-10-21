import type { PermissionKey } from "./auth/permissions";

export type NavItem = {
  key: string;
  href: string;
  label: string;
  permission: PermissionKey;
  /** Fase de desarrollo en que el módulo queda operativo. */
  phase: number;
};

export const NAV: NavItem[] = [
  { key: "inicio", href: "/", label: "Inicio", permission: "inicio.ver", phase: 1 },
  { key: "solicitudes", href: "/solicitudes", label: "Solicitudes", permission: "solicitudes.ver", phase: 2 },
  { key: "agenda", href: "/agenda", label: "Agenda de servicios", permission: "agenda.ver", phase: 3 },
  { key: "servicios", href: "/servicios", label: "Servicios realizados", permission: "servicios.ver", phase: 4 },
  { key: "clientes", href: "/clientes", label: "Clientes", permission: "clientes.ver", phase: 2 },
  { key: "personal", href: "/personal", label: "Personal y nómina", permission: "personal.ver", phase: 3 },
  { key: "flotilla", href: "/flotilla", label: "Flotilla", permission: "flotilla.ver", phase: 6 },
  { key: "finanzas", href: "/finanzas", label: "Finanzas y administración", permission: "finanzas.ver", phase: 7 },
  { key: "resultados", href: "/resultados", label: "Resultados", permission: "resultados.ver", phase: 8 },
  { key: "configuracion", href: "/configuracion", label: "Configuración", permission: "config.ver", phase: 1 },
];

/** Fase actualmente implementada (se incrementa con cada entrega). */
export const CURRENT_PHASE = 8;
