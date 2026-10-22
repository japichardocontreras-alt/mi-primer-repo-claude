import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { loadDashboard, parseDashboardParams } from "@/lib/finance/dashboard-page";
import { MONTHS_ES, formatDateTime } from "@/lib/format";
import { xlsxResponse } from "@/lib/export/excel";
import { audit } from "@/lib/audit";
import { safeRoute } from "@/lib/api";

export const runtime = "nodejs";
const MONEY = '"$"#,##0.00';

function sheet(wb: ExcelJS.Workbook, name: string, title: string, headers: string[], rows: (string | number | null)[][], moneyCols: number[]) {
  const ws = wb.addWorksheet(name);
  ws.addRow([`MUDANZAS METEPEC · ${title}`]).font = { bold: true, size: 13, color: { argb: "FFCF1F1F" } };
  ws.addRow([`Generado ${formatDateTime(new Date())}`]).font = { size: 9, color: { argb: "FF6B7280" } };
  const h = ws.addRow(headers);
  h.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111316" } }; });
  rows.forEach((r) => ws.addRow(r));
  headers.forEach((_, i) => (ws.getColumn(i + 1).width = i === 0 ? 34 : 16));
  moneyCols.forEach((c) => (ws.getColumn(c).numFmt = MONEY));
}

async function handleGet(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("resultados.ver") || !user.permissions.has("exportar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const prm = parseDashboardParams(Object.fromEntries(req.nextUrl.searchParams));
  const d = await loadDashboard(prisma, prm);
  const { r, c } = d;
  const wb = new ExcelJS.Workbook();
  sheet(wb, "Resumen", `Resultados · ${d.label}`, ["Indicador", "Valor"], [
    ["Solicitudes recibidas", c.recibidas], ["Cotizaciones enviadas", c.cotizadas], ["Servicios confirmados", c.serviciosConfirmados],
    ["Servicios realizados", c.serviciosRealizados], ["Servicios cancelados", c.serviciosCancelados], ["Conversión comercial (%)", c.conversion === null ? null : Math.round(c.conversion * 1000) / 10],
    ["Ventas pactadas", r.ventas.pactadas], ["Ventas netas (sin IVA)", r.ventas.netas], ["Ingresos cobrados", r.cobranza.neto], ["Cuentas por cobrar", r.cobranza.cuentasPorCobrar],
    ["Gastos directos", r.gastos.directos], ["Gastos de flotilla", r.gastos.flotilla], ["Gastos fijos", r.gastos.fijos], ["Nómina devengada", r.nomina.devengada],
    ["Depreciación", r.depreciacion.monto], ["Resultado operativo", r.resultadoOperativo], ["Anticipos retenidos por cancelación", r.otros.anticiposRetenidos], ["Ingresos extraordinarios", r.otros.ingresosExtra],
    ["Gastos extraordinarios", r.gastos.extraordinarios], ["Intereses", r.otros.intereses], ["Utilidad estimada", r.utilidad],
    ["Margen (%)", r.margen === null ? null : Math.round(r.margen * 1000) / 10], ["Flujo: entradas", r.flujo.entradas], ["Flujo: salidas", r.flujo.salidas], ["Flujo neto", r.flujo.neto],
  ], [2]);
  sheet(wb, "Mensual", `Serie mensual ${prm.year}`, ["Mes", "Ventas netas", "Costos", "Utilidad", "Cobrado", "Solicitudes", "Confirmadas", "Servicios realizados"],
    d.series.map((s) => [MONTHS_ES[s.m - 1], s.ventas, s.costos, s.utilidad, s.cobrado, s.solicitudes, s.confirmadas, s.servicios]), [2, 3, 4, 5]);
  sheet(wb, "Por unidad", `Resultados por unidad · ${d.label}`, ["Unidad", "Servicios", "Km", "Ingresos", "Gastos directos", "Costos de operación", "Depreciación", "Compartidos", "Utilidad"],
    d.byVehicle.rows.map((x) => [x.name, x.servicios, x.km, x.ingresos, x.gastosDirectos, x.costosOperacion, x.depreciacion, x.compartidos, x.utilidad]), [4, 5, 6, 7, 8, 9]);
  sheet(wb, "Gastos por categoría", `Gastos por categoría · ${d.label}`, ["Categoría", "Grupo", "Importe sin IVA"], r.gastos.porCategoria.map((g) => [g.name, g.group, g.amount]), [3]);
  await audit(prisma, { userId: user.id, action: "EXPORTAR", entity: "Resultados", summary: d.label });
  return xlsxResponse(Buffer.from(await wb.xlsx.writeBuffer()), `resultados-${prm.vista === "mes" ? `${prm.year}-${String(prm.month).padStart(2, "0")}` : prm.year}.xlsx`);
}

export const GET = safeRoute(handleGet);
