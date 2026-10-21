import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { PermissionError, BusinessError } from "./errors";
import type { ActionState } from "./action-state";
import { isConnectionError } from "./db-errors";

export type { ActionState } from "./action-state";
export { BusinessError } from "./errors";
export { isConnectionError };


const DB_DOWN = "No hay conexión con la base de datos. No se guardaron cambios; intente de nuevo en unos momentos.";
/** Traduce cualquier error a un mensaje claro para el usuario (sin filtrar detalles internos). */
export function toActionError(e: unknown): ActionState {
  const at = Date.now();
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) {
      const k = issue.path.join(".");
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, message: "Revise los campos marcados.", fieldErrors, at };
  }
  if (e instanceof PermissionError) return { ok: false, message: e.message, at };
  if (e instanceof BusinessError) return { ok: false, message: e.message, code: e.code, at };
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, message: "Ya existe un registro con ese valor único.", at };
    if (e.code === "P2003") return { ok: false, message: "No se puede completar: el registro está relacionado con otros datos.", at };
    if (e.code === "P2025") return { ok: false, message: "El registro no existe o fue modificado por otro usuario. Recargue la página.", at };
  }
  if (isConnectionError(e)) {
    console.error("[ERP] Sin conexión con la base de datos:", (e as Error).message);
    return { ok: false, message: DB_DOWN, code: "DB_UNAVAILABLE", at };
  }
  console.error("[ERP] Error no controlado:", e);
  return { ok: false, message: "Ocurrió un error inesperado. No se guardaron cambios.", at };
}

/** Lee un FormData a objeto plano (los campos vacíos se vuelven undefined). */
export function formToObject(fd: FormData): Record<string, string | undefined> {
  const o: Record<string, string | undefined> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    o[k] = t === "" ? undefined : t;
  }
  return o;
}
