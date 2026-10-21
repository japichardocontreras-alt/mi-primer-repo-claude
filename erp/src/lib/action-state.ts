/** Tipos compartidos cliente/servidor para las server actions (sin dependencias del servidor). */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Marca de tiempo para que el cliente detecte respuestas nuevas. */
  at?: number;
};

export const initialState: ActionState = { ok: false };
