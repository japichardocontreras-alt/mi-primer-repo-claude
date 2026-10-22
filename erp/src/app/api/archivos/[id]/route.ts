import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { readStoredFile } from "@/lib/storage";
import type { PermissionKey } from "@/lib/auth/permissions";
import { safeRoute } from "@/lib/api";

export const runtime = "nodejs";

/** Sirve un archivo privado solo si el usuario puede ver el registro al que pertenece. */
async function handleGet(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const a = await prisma.attachment.findUnique({ where: { id } });
  if (!a || a.deletedAt) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const needed: PermissionKey[][] = [];
  if (a.requestId) needed.push(["solicitudes.ver"]);
  if (a.serviceId) needed.push(["agenda.ver", "servicios.ver"]);
  if (a.vehicleId || a.maintenanceId || a.documentId) needed.push(["flotilla.ver"]);
  if (a.expenseId || a.paymentId) needed.push(["finanzas.ver", "finanzas.cobros"]);
  if (a.workerId) needed.push(["personal.ver"]);
  const allowed = needed.length > 0 && needed.some((alts) => alts.some((p) => user.permissions.has(p)));
  if (!allowed) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  let data: Buffer;
  try {
    data = await readStoredFile(a.storageKey);
  } catch {
    return NextResponse.json({ error: "El archivo no se encuentra en el almacenamiento." }, { status: 410 });
  }
  const inline = a.mimeType.startsWith("image/") || a.mimeType.startsWith("video/") || a.mimeType === "application/pdf";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(a.fileName)}`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
    },
  });
}

export const GET = safeRoute(handleGet);
