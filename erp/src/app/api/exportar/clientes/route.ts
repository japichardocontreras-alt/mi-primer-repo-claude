import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { clientWhere } from "@/lib/domain/clients";
import { CHANNEL } from "@/lib/domain/labels";
import { buildWorkbook, excelLocal, xlsxResponse } from "@/lib/export/excel";
import { audit } from "@/lib/audit";
import { safeRoute } from "@/lib/api";

export const runtime = "nodejs";

async function handleGet(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("clientes.ver") || !user.permissions.has("exportar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const estado = req.nextUrl.searchParams.get("estado") ?? "todos";
  const rows = await prisma.client.findMany({ where: clientWhere(q, estado), include: { _count: { select: { requests: true, services: true } } }, orderBy: { name: "asc" }, take: 50000 });
  const buf = await buildWorkbook("Clientes", [
    { header: "Código", key: "code", width: 12 }, { header: "Nombre", key: "name", width: 32 }, { header: "Teléfono", key: "phone", width: 15 },
    { header: "Correo", key: "email", width: 28 }, { header: "Canal", key: "channel", width: 14 }, { header: "Solicitudes", key: "req", type: "number", width: 11 },
    { header: "Servicios", key: "svc", type: "number", width: 10 }, { header: "Activo", key: "active", width: 8 }, { header: "Alta", key: "created", type: "datetime", width: 17 },
    { header: "Notas", key: "notes", width: 40 },
  ], rows.map((c) => ({
    code: c.code, name: c.name, phone: c.phone, email: c.email, channel: c.channel ? CHANNEL[c.channel] : null, req: c._count.requests, svc: c._count.services,
    active: c.active ? "Sí" : "No", created: excelLocal(c.createdAt), notes: c.notes,
  })));
  await audit(prisma, { userId: user.id, action: "EXPORTAR", entity: "Cliente", summary: `${rows.length} registros` });
  return xlsxResponse(buf, "clientes.xlsx");
}

export const GET = safeRoute(handleGet);
