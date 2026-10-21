import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Almacenamiento privado de archivos adjuntos en disco (fuera de /public).
 * Los archivos solo se sirven a través de /api/archivos/[id], que valida sesión y permisos.
 * Para crecer a almacenamiento en la nube (S3, R2) basta con reimplementar estas funciones.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "image/gif": "gif",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc", "application/vnd.ms-excel": "xls", "text/plain": "txt",
};

export function storageRoot() {
  return path.resolve(process.env.STORAGE_DIR || "./storage");
}

export function fileProblem(f: File): string | null {
  if (f.size === 0) return `«${f.name}» está vacío.`;
  if (f.size > MAX_FILE_BYTES) return `«${f.name}» supera el límite de ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  if (!ALLOWED[f.type]) return `«${f.name}»: tipo de archivo no permitido (${f.type || "desconocido"}). Se aceptan fotos, videos, PDF y documentos de Office.`;
  return null;
}

export function categoryFor(mime: string) {
  if (mime.startsWith("image/")) return "FOTO";
  if (mime.startsWith("video/")) return "VIDEO";
  return "DOCUMENTO";
}

/** Guarda el archivo y devuelve la clave interna (nunca deriva rutas del nombre original). */
export async function saveFile(f: File): Promise<string> {
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${dir}/${randomUUID()}.${ALLOWED[f.type] ?? "bin"}`;
  await mkdir(path.join(storageRoot(), dir), { recursive: true });
  await writeFile(path.join(storageRoot(), key), Buffer.from(await f.arrayBuffer()), { flag: "wx" });
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const full = path.resolve(storageRoot(), key);
  if (!full.startsWith(storageRoot() + path.sep)) throw new Error("Ruta no válida");
  return readFile(full);
}
