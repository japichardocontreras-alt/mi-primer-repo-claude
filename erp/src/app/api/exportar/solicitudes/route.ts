import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { requestWhere, requestListInclude, type RequestFilters } from "@/lib/domain/requests";
import { CHANNEL, PACKAGE, REQUEST_STATUS, SERVICE_TYPE, fullAddress } from "@/lib/domain/labels";
import { buildWorkbook, excelLocal, xlsxResponse } from "@/lib/export/excel";
import { mexicoParts } from "@/lib/format";
import { audit } from "@/lib/audit";
import { safeRoute } from "@/lib/api";

export const runtime = "nodejs";

async function handleGet(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("solicitudes.ver") || !user.permissions.has("exportar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams) as RequestFilters;
  const rows = await prisma.request.findMany({ where: requestWhere(sp), include: requestListInclude, orderBy: { registeredAt: "desc" }, take: 20000 });
  const buf = await buildWorkbook("Solicitudes", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Registro", key: "registro", type: "datetime", width: 17 },
    { header: "Cliente", key: "cliente", width: 28 },
    { header: "Teléfono", key: "telefono", width: 15 },
    { header: "Canal", key: "canal", width: 13 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Fecha solicitada", key: "fecha", type: "date", width: 14 },
    { header: "Hora", key: "hora", width: 8 },
    { header: "Origen", key: "origen", width: 40 },
    { header: "Destino", key: "destino", width: 40 },
    { header: "Paquete", key: "paquete", width: 13 },
    { header: "Precio cotizado", key: "precio", type: "money", width: 15 },
    { header: "Versión", key: "version", type: "number", width: 8 },
    { header: "Estado", key: "estado", width: 22 },
    { header: "Último contacto", key: "ultimo", type: "datetime", width: 17 },
    { header: "Próximo contacto", key: "proximo", type: "datetime", width: 17 },
    { header: "Motivo (no concretada / cancelada)", key: "motivo", width: 35 },
  ], rows.map((r) => ({
    folio: r.folio, registro: excelLocal(r.registeredAt), cliente: r.client.name, telefono: r.client.phone, canal: CHANNEL[r.channel],
    tipo: SERVICE_TYPE[r.serviceType], fecha: r.tentativeDate, hora: r.tentativeTime, origen: fullAddress(r.originAddress), destino: fullAddress(r.destinationAddress),
    paquete: r.package ? PACKAGE[r.package] : null, precio: r.currentQuote?.finalPrice ?? null, version: r.currentQuote?.versionNumber ?? null,
    estado: REQUEST_STATUS[r.status].label, ultimo: excelLocal(r.lastContactAt), proximo: excelLocal(r.nextContactAt), motivo: r.lostReason ?? r.cancelReason,
  })));
  await audit(prisma, { userId: user.id, action: "EXPORTAR", entity: "Solicitud", summary: `${rows.length} registros`, after: sp });
  const p = mexicoParts();
  return xlsxResponse(buf, `solicitudes-${p.year}${String(p.month).padStart(2, "0")}${String(p.day).padStart(2, "0")}.xlsx`);
}

export const GET = safeRoute(handleGet);
