import "server-only";
import ExcelJS from "exceljs";
import { formatDateTime, TIME_ZONE } from "../format";

export type Column = { header: string; key: string; width?: number; type?: "text" | "money" | "date" | "datetime" | "number" };

/** Libro de Excel con encabezado corporativo, filtros y formatos MXN / fecha mexicana. */
export async function buildWorkbook(title: string, columns: Column[], rows: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MUDANZAS METEPEC | ERP";
  wb.created = new Date();
  const ws = wb.addWorksheet(title.slice(0, 31), { views: [{ state: "frozen", ySplit: 3 }] });

  ws.mergeCells(1, 1, 1, columns.length);
  ws.getCell(1, 1).value = `MUDANZAS METEPEC · ${title}`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FFCF1F1F" } };
  ws.mergeCells(2, 1, 2, columns.length);
  ws.getCell(2, 1).value = `Generado: ${formatDateTime(new Date())} (${TIME_ZONE}) · ${rows.length} registro(s)`;
  ws.getCell(2, 1).font = { size: 9, color: { argb: "FF6B7280" } };

  const header = ws.getRow(3);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111316" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    ws.getColumn(i + 1).width = c.width ?? 16;
    if (c.type === "money") ws.getColumn(i + 1).numFmt = '"$"#,##0.00';
    if (c.type === "date") ws.getColumn(i + 1).numFmt = "dd/mm/yyyy";
    if (c.type === "datetime") ws.getColumn(i + 1).numFmt = "dd/mm/yyyy hh:mm";
  });
  header.height = 22;

  for (const r of rows) {
    ws.addRow(columns.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined) return null;
      if (c.type === "money" || c.type === "number") return Number(v);
      return v as ExcelJS.CellValue;
    }));
  }
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Excel muestra fechas sin zona: se envía la hora local de México como fecha "flotante". */
export function excelLocal(d: Date | null | undefined): Date | null {
  if (!d) return null;
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const [date, time] = s.split(", ");
  return new Date(`${date}T${time === "24:00" ? "00:00" : time}:00Z`);
}

export function xlsxResponse(buf: Buffer, name: string) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
