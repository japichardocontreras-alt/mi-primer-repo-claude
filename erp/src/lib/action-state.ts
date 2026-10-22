/** Tipos compartidos cliente/servidor para las server actions (sin dependencias del servidor). */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Marca de tiempo para que el cliente detecte respuestas nuevas. */
  at?: number;
  /** Código de situación especial (p.ej. DUPLICATE_PHONE) para que el formulario reaccione. */
  code?: string;
};

export const initialState: ActionState = { ok: false };
