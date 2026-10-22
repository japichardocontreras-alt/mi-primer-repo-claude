/** Reglas de contraseña (sin dependencias del servidor; usable en formularios). */
export const PASSWORD_MIN_LENGTH = 10;

/** Devuelve un mensaje de error o null si la contraseña es aceptable. */
export function passwordProblem(p: string): string | null {
  if (p.length < PASSWORD_MIN_LENGTH) return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(p) || !/\d/.test(p)) return "La contraseña debe combinar letras y números.";
  return null;
}
