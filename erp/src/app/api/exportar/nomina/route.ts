import { NextResponse, type NextRequest } from "next/server";
import type { PeriodType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { PERIOD, ENTRY_KIND } from "@/lib/domain/payroll";
import { payrollSummary } from "@/lib/queries/payroll";
import { buildWorkbook, xlsxResponse } from "@/lib/export/excel";
import { audit } from "@/lib/audit";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("nomina.ver") || !user.permissions.has("exportar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const tipo = (req.nextUrl.searchParams.get("tipo") ?? "SEMANAL") as PeriodType;
  const fecha = req.nextUrl.searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);
  if (!(tipo in PERIOD) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NextResponse.json({ error: "Parámetros no válidos" }, { status: 400 });
  const { period, rows } = await payrollSummary(prisma, tipo, fecha);
  const resumen = await buildWorkbook(`Nómina ${period.startIso} a ${period.lastIso}`, [
    { header: "Código", key: "code", width: 12 }, { header: "Colaborador", key: "name", width: 30 }, { header: "Servicios", key: "n", type: "number", width: 10 },
    { header: "Por servicio", key: "ps", type: "money", width: 14 }, { header: "Sueldo/bonos/extras", key: "ot", type: "money", width: 18 },
    { header: "Deducciones", key: "de", type: "money", width: 13 }, { header: "Devengado", key: "dv", type: "money", width: 13 },
    { header: "Pagado", key: "pg", type: "money", width: 13 }, { header: "Saldo pendiente", key: "sa", type: "money", width: 15 },
  ], rows.map((r) => ({ code: r.w.code, name: r.w.fullName, n: r.servicios, ps: r.porServicio, ot: r.otros, de: r.deducciones, dv: r.devengado, pg: r.pagado, sa: r.saldo })));
  // Hoja de detalle por concepto
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(resumen as unknown as ArrayBuffer);
  const det = wb.addWorksheet("Detalle");
  det.addRow(["Fecha", "Colaborador", "Servicio", "Concepto", "Tipo", "Importe", "Estado"]).font = { bold: true };
  const entries = await prisma.payrollEntry.findMany({ where: { date: { gte: period.start, lt: period.end } }, include: { worker: true, service: true }, orderBy: [{ date: "asc" }] });
  for (const e of entries) det.addRow([e.date.toISOString().slice(0, 10), e.worker.fullName, e.service?.folio ?? "", e.concept, ENTRY_KIND[e.kind], Number(e.amount), e.status]);
  det.getColumn(6).numFmt = '"$"#,##0.00';
  [12, 28, 16, 40, 16, 12, 12].forEach((w, i) => (det.getColumn(i + 1).width = w));
  await audit(prisma, { userId: user.id, action: "EXPORTAR", entity: "Nomina", summary: period.label });
  return xlsxResponse(Buffer.from(await wb.xlsx.writeBuffer()), `nomina-${period.startIso}.xlsx`);
}
