/**
 * Catálogo de permisos del ERP. Las claves se validan SIEMPRE en el servidor.
 * Agregar aquí un permiso nuevo y ejecutar `npm run db:seed` lo registra en la BD.
 */
export const PERMISSIONS = {
  "inicio.ver": { module: "Inicio", description: "Ver el panel de inicio" },

  "solicitudes.ver": { module: "Solicitudes", description: "Ver solicitudes y seguimiento comercial" },
  "solicitudes.crear": { module: "Solicitudes", description: "Registrar solicitudes" },
  "solicitudes.editar": { module: "Solicitudes", description: "Editar solicitudes y registrar seguimiento" },
  "solicitudes.cotizar": { module: "Solicitudes", description: "Capturar y modificar precios cotizados" },
  "solicitudes.confirmar": { module: "Solicitudes", description: "Confirmar solicitudes y convertirlas en servicio" },

  "agenda.ver": { module: "Agenda", description: "Ver la agenda de servicios" },
  "agenda.programar": { module: "Agenda", description: "Programar, reprogramar y asignar unidad / personal" },
  "agenda.autorizar_conflictos": { module: "Agenda", description: "Autorizar excepcionalmente empalmes de horario" },

  "servicios.ver": { module: "Servicios realizados", description: "Ver servicios realizados" },
  "servicios.cerrar": { module: "Servicios realizados", description: "Registrar el cierre operativo" },

  "clientes.ver": { module: "Clientes", description: "Ver clientes" },
  "clientes.editar": { module: "Clientes", description: "Crear y editar clientes" },

  "personal.ver": { module: "Personal y nómina", description: "Ver fichas de personal" },
  "personal.editar": { module: "Personal y nómina", description: "Crear y editar personal" },
  "nomina.ver": { module: "Personal y nómina", description: "Ver nómina e importes" },
  "nomina.gestionar": { module: "Personal y nómina", description: "Registrar devengos, deducciones y pagos de nómina" },

  "flotilla.ver": { module: "Flotilla", description: "Ver unidades, kilometraje y mantenimientos" },
  "flotilla.editar": { module: "Flotilla", description: "Editar unidades, mantenimientos y documentos" },

  "finanzas.ver": { module: "Finanzas", description: "Ver información financiera" },
  "finanzas.cobros": { module: "Finanzas", description: "Registrar cobros de servicios" },
  "finanzas.gastos": { module: "Finanzas", description: "Registrar gastos y otros movimientos" },
  "costos.editar": { module: "Finanzas", description: "Editar costos, tarifas y parámetros financieros" },

  "resultados.ver": { module: "Resultados", description: "Ver resultados financieros" },

  "config.ver": { module: "Configuración", description: "Ver configuración" },
  "config.empresa": { module: "Configuración", description: "Editar datos de la empresa y parámetros" },
  "config.usuarios": { module: "Configuración", description: "Administrar usuarios" },
  "config.permisos": { module: "Configuración", description: "Administrar roles y permisos" },
  "config.respaldos": { module: "Configuración", description: "Descargar respaldos de la base de datos" },
  "auditoria.ver": { module: "Configuración", description: "Consultar el historial de auditoría" },

  "exportar": { module: "General", description: "Exportar información a Excel / PDF" },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

export const ROLE_ADMIN = "ADMINISTRADOR";
export const ROLE_STAFF = "ADMINISTRATIVO";

/** Permisos por defecto del rol ADMINISTRATIVO (el administrador puede modificarlos). */
export const DEFAULT_STAFF_PERMISSIONS: PermissionKey[] = [
  "inicio.ver",
  "solicitudes.ver", "solicitudes.crear", "solicitudes.editar", "solicitudes.cotizar", "solicitudes.confirmar",
  "agenda.ver", "agenda.programar",
  "servicios.ver", "servicios.cerrar",
  "clientes.ver", "clientes.editar",
  "personal.ver",
  "flotilla.ver",
  "finanzas.cobros",
  "exportar",
];

/**
 * Permisos efectivos = permisos del rol + concedidos al usuario − revocados al usuario.
 * El rol ADMINISTRADOR siempre tiene todos los permisos.
 */
export function resolvePermissions(
  roleKey: string,
  rolePermissions: string[],
  userOverrides: { key: string; granted: boolean }[],
): Set<string> {
  if (roleKey === ROLE_ADMIN) return new Set(ALL_PERMISSIONS);
  const set = new Set(rolePermissions);
  for (const o of userOverrides) {
    if (o.granted) set.add(o.key);
    else set.delete(o.key);
  }
  return set;
}
