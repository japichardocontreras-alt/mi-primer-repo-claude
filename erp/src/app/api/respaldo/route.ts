import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, clientIp } from "@/lib/auth/server";
import { audit } from "@/lib/audit";
import { mexicoParts } from "@/lib/format";
import { safeRoute } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Descarga un respaldo completo con pg_dump (solo usuarios con permiso de respaldos). */
async function handleGet() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("config.respaldos")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });

  // pg_dump no acepta el parámetro ?schema= de Prisma.
  const dbUrl = new URL(url);
  dbUrl.searchParams.delete("schema");
  const child = spawn(process.env.PG_DUMP_PATH || "pg_dump", ["--format=custom", "--no-owner", "--no-privileges", dbUrl.toString()], { stdio: ["ignore", "pipe", "pipe"] });

  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d.toString()));
  const started = await new Promise<boolean>((resolve) => {
    child.once("spawn", () => resolve(true));
    child.once("error", () => resolve(false));
  });
  if (!started) return NextResponse.json({ error: "pg_dump no está disponible en el servidor." }, { status: 500 });

  await audit(prisma, { userId: user.id, action: "RESPALDO", entity: "BaseDeDatos", ip: await clientIp() });
  const p = mexicoParts();
  const stamp = `${p.year}${String(p.month).padStart(2, "0")}${String(p.day).padStart(2, "0")}-${String(p.hour).padStart(2, "0")}${String(p.minute).padStart(2, "0")}`;

  const stream = new ReadableStream({
    start(controller) {
      child.stdout.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      child.on("close", (code) => {
        if (code === 0) controller.close();
        else controller.error(new Error(`pg_dump terminó con código ${code}: ${stderr}`));
      });
    },
    cancel() { child.kill(); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="erp-mudanzas-metepec-${stamp}.dump"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = safeRoute(handleGet);
