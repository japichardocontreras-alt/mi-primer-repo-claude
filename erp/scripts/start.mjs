// Arranque de producción: carga .env (sin sobrescribir variables ya definidas), fija rutas absolutas
// y ejecuta el servidor autónomo. El servidor cambia su carpeta de trabajo a .next/standalone, por eso
// STORAGE_DIR relativo se resuelve aquí contra la carpeta del proyecto (si no, los adjuntos quedarían
// dentro de .next y se borrarían en la siguiente compilación).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
process.env.STORAGE_DIR = path.resolve(root, process.env.STORAGE_DIR || "storage");

const missing = ["DATABASE_URL"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`✖ Faltan variables de entorno: ${missing.join(", ")}. Vea .env.example.`);
  process.exit(1);
}
const server = path.join(root, ".next", "standalone", "server.js");
if (!existsSync(server)) {
  console.error("✖ No existe la compilación de producción. Ejecute `npm run build`.");
  process.exit(1);
}
console.log(`ERP · puerto ${process.env.PORT || 3000} · archivos en ${process.env.STORAGE_DIR}`);
await import(pathToFileURL(server).href);
