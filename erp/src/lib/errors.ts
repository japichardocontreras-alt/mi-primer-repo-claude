export class PermissionError extends Error {
  constructor(public perm: string) {
    super(perm === "sesion" ? "Su sesión expiró. Inicie sesión de nuevo." : "No tiene permiso para realizar esta operación.");
  }
}

/** Error de regla de negocio: su mensaje se muestra tal cual al usuario. */
export class BusinessError extends Error {}
