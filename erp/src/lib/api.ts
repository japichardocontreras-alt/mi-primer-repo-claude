import "server-only";
import { NextResponse } from "next/server";
import { isConnectionError } from "./actions";

/**
 * Envuelve un manejador de API: un error no controlado (p. ej. base de datos caída)
 * responde con un mensaje claro en español en lugar de una página 500 genérica.
 */
export function safeRoute<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (isConnectionError(e)) {
        console.error("[ERP] API sin conexión con la base de datos:", (e as Error).message);
        return NextResponse.json({ error: "No hay conexión con la base de datos. Intente de nuevo en unos momentos." }, { status: 503 });
      }
      console.error("[ERP] Error no controlado en API:", e);
      return NextResponse.json({ error: "Ocurrió un error inesperado al generar la respuesta." }, { status: 500 });
    }
  };
}
