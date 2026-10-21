// Completa el servidor autónomo de Next.js (output: "standalone"): copia los archivos estáticos y públicos.
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".next", "standalone");
if (!existsSync(path.join(out, "server.js"))) throw new Error("No se encontró .next/standalone/server.js: ejecute primero `next build`.");
cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
console.log("✔ Servidor autónomo listo en .next/standalone");
