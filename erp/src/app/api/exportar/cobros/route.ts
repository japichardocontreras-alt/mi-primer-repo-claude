import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { monthParam } from "@/lib/queries/period";
import { mexicoMonthRange } from "@/lib/format";
import { buildWorkbook, excelLocal, xlsxResponse } from "@/lib/export/excel";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("finanzas.ver") || !user.permissions.has("exportar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const mp = monthParam(req.nextUrl.searchParams.get("mes") ?? undefined);
  const r = mexicoMonthRange(mp.y, mp.m);
  const rows = await prisma.payment.findMany({ where: { receivedAt: { gte: r.start, lt: r.end } }, include: { service: { include: { client: true } } }, orderBy: { receivedAt: "asc" } });
  const buf = await buildWorkbook(`Cobros ${mp.key}`, [
    { header: "Folio", key: "folio", width: 16 }, { header: "Fecha", key: "fecha", type: "datetime", width: 17 }, { header: "Servicio", key: "svc", width: 16 },
    { header: "Cliente", key: "cli", width: 28 }, { header: "Tipo", key: "tipo", width: 12 }, { header: "Método", key: "met", width: 14 },
    { header: "Referencia", key: "ref", width: 18 }, { header: "Importe", key: "imp", type: "money", width: 13 }, { header: "Estado", key: "est", width: 12 },
  ], rows.map((p) => ({
    folio: p.folio, fecha: excelLocal(p.receivedAt), svc: p.service.folio, cli: p.service.client.name, tipo: p.kind, met: p.method, ref: p.reference,
    imp: (p.kind === "REEMBOLSO" ? -1 : 1) * Number(p.amount), est: p.cancelledAt ? "Cancelado" : "Vigente",
  })));
  await audit(prisma, { userId: user.id, action: "EXPORTAR", entity: "Cobro", summary: `${rows.length} cobros ${mp.key}` });
  return xlsxResponse(buf, `cobros-${mp.key}.xlsx`);
}
