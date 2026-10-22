import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { BusinessError } from "./errors";
import { categoryFor, fileProblem, saveFile, storageRoot } from "./storage";

export type StoredFile = { storageKey: string; fileName: string; mimeType: string; sizeBytes: number; category: string };

/** Extrae los archivos reales de un FormData (ignora inputs vacíos). */
export function filesFrom(fd: FormData, name = "files"): File[] {
  return fd.getAll(name).filter((f): f is File => typeof f !== "string" && f.size > 0);
}

/** Valida y guarda en disco. Si algo falla, no deja archivos huérfanos. */
export async function storeFiles(files: File[]): Promise<StoredFile[]> {
  if (files.length > 20) throw new BusinessError("Máximo 20 archivos por envío.");
  for (const f of files) {
    const p = fileProblem(f);
    if (p) throw new BusinessError(p);
  }
  const stored: StoredFile[] = [];
  try {
    for (const f of files) {
      stored.push({ storageKey: await saveFile(f), fileName: f.name.slice(0, 200), mimeType: f.type, sizeBytes: f.size, category: categoryFor(f.type) });
    }
  } catch (e) {
    await discardFiles(stored);
    throw e;
  }
  return stored;
}

/** Elimina del disco archivos guardados cuando la transacción de BD no se completó. */
export async function discardFiles(stored: StoredFile[]) {
  await Promise.all(stored.map((s) => unlink(path.join(storageRoot(), s.storageKey)).catch(() => undefined)));
}
