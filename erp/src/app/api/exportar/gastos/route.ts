import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { monthParam } from "@/lib/queries/period";
import { buildWorkbook, xlsxResponse } from "@/lib/export/excel";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
const GROUP: Record<string, string> = { DIRECTO: "Directo", FIJO: "Fijo", FLOTILLA: "Flotilla", EXTRAORDINARIO: "Extraordinario" };

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("finanzas.ver") || !user.permissions.has("exportar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const mp = monthParam(sp.get("mes") ?? undefined);
  const where: Prisma.ExpenseWhereInput = {
    date: { gte: new Date(Date.UTC(mp.y, mp.m - 1, 1)), lt: new Date(Date.UTC(mp.y, mp.m, 1)) },
    ...(sp.get("grupo") && sp.get("grupo")! in GROUP ? { category: { group: sp.get("grupo") as "FIJO" } } : {}),
    ...(sp.get("categoria") ? { category: { key: sp.get("categoria")! } } : {}),
    ...(sp.get("estado") === "por_pagar" ? { paidAt: null } : sp.get("estado") === "pagados" ? { paidAt: { not: null } } : {}),
  };
  const rows = await prisma.expense.findMany({ where, include: { category: true, service: true, vehicle: true }, orderBy: { date: "asc" } });
  const buf = await buildWorkbook(`Gastos ${mp.key}`, [
    { header: "Folio", key: "folio", width: 16 }, { header: "Fecha", key: "fecha", type: "date", width: 12 }, { header: "Categoría", key: "cat", width: 24 },
    { header: "Grupo", key: "grupo", width: 13 }, { header: "Descripción", key: "desc", width: 36 }, { header: "Proveedor", key: "prov", width: 20 },
    { header: "Servicio", key: "svc", width: 16 }, { header: "Unidad", key: "veh", width: 18 }, { header: "Subtotal", key: "sub", type: "money", width: 13 },
    { header: "IVA", key: "iva", type: "money", width: 11 }, { header: "Total", key: "tot", type: "money", width: 13 }, { header: "Pagado", key: "pag", type: "date", width: 12 },
    { header: "Estado", key: "est", width: 12 },
  ], rows.map((e) => ({
    folio: e.folio, fecha: e.date, cat: e.category.name, grupo: GROUP[e.category.group], desc: e.description, prov: e.supplier, svc: e.service?.folio, veh: e.vehicle?.name,
    sub: e.subtotal, iva: e.vatAmount, tot: e.total, pag: e.paidAt, est: e.cancelledAt ? "Cancelado" : e.paidAt ? "Pagado" : "Por pagar",
  })));
  await audit(prisma, { userId: user.id, action: "EXPORTAR", entity: "Gasto", summary: `${rows.length} gastos ${mp.key}` });
  return xlsxResponse(buf, `gastos-${mp.key}.xlsx`);
}
