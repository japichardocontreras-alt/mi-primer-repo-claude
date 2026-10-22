import type { PermissionKey } from "./auth/permissions";

export type NavItem = {
  key: string;
  href: string;
  label: string;
  permission: PermissionKey;
};

export const NAV: NavItem[] = [
  { key: "inicio", href: "/", label: "Inicio", permission: "inicio.ver" },
  { key: "solicitudes", href: "/solicitudes", label: "Solicitudes", permission: "solicitudes.ver" },
  { key: "agenda", href: "/agenda", label: "Agenda de servicios", permission: "agenda.ver" },
  { key: "servicios", href: "/servicios", label: "Servicios realizados", permission: "servicios.ver" },
  { key: "clientes", href: "/clientes", label: "Clientes", permission: "clientes.ver" },
  { key: "personal", href: "/personal", label: "Personal y nómina", permission: "personal.ver" },
  { key: "flotilla", href: "/flotilla", label: "Flotilla", permission: "flotilla.ver" },
  { key: "finanzas", href: "/finanzas", label: "Finanzas y administración", permission: "finanzas.ver" },
  { key: "resultados", href: "/resultados", label: "Resultados", permission: "resultados.ver" },
  { key: "configuracion", href: "/configuracion", label: "Configuración", permission: "config.ver" },
];
