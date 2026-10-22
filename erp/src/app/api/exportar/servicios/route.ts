import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { completedServices, type CompletedFilters } from "@/lib/queries/completed";
import { SERVICE_TYPE, fullAddress } from "@/lib/domain/labels";
import { buildWorkbook, excelLocal, xlsxResponse } from "@/lib/export/excel";
import { audit } from "@/lib/audit";
import { safeRoute } from "@/lib/api";

export const runtime = "nodejs";

async function handleGet(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.permissions.has("servicios.ver") || !user.permissions.has("exportar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const money = user.permissions.has("finanzas.ver") || user.permissions.has("finanzas.cobros");
  const f = Object.fromEntries(req.nextUrl.searchParams) as CompletedFilters;
  const rows = await completedServices(prisma, f);
  const cols = [
    { header: "Folio", key: "folio", width: 16 }, { header: "Solicitud", key: "sol", width: 16 }, { header: "Inicio real", key: "ini", type: "datetime" as const, width: 17 },
    { header: "Fin real", key: "fin", type: "datetime" as const, width: 17 }, { header: "Cliente", key: "cliente", width: 26 }, { header: "Tipo", key: "tipo", width: 10 },
    { header: "Origen", key: "origen", width: 36 }, { header: "Destino", key: "destino", width: 36 }, { header: "Unidad", key: "unidad", width: 18 },
    { header: "Km", key: "km", type: "number" as const, width: 8 },
    ...(money ? [
      { header: "Precio", key: "precio", type: "money" as const, width: 13 }, { header: "Cobrado", key: "cobrado", type: "money" as const, width: 13 },
      { header: "Saldo", key: "saldo", type: "money" as const, width: 13 }, { header: "Gastos directos", key: "directos", type: "money" as const, width: 14 },
      { header: "Pago personal", key: "nomina", type: "money" as const, width: 13 }, { header: "Margen directo", key: "margen", type: "money" as const, width: 14 },
    ] : []),
    { header: "Estado de cobro", key: "cobro", width: 14 }, { header: "Incidencias", key: "inc", width: 30 },
  ];
  const buf = await buildWorkbook("Servicios realizados", cols, rows.map((r) => ({
    folio: r.s.folio, sol: r.s.request?.folio ?? null, ini: excelLocal(r.s.actualStart), fin: excelLocal(r.s.actualEnd), cliente: r.s.client.name, tipo: SERVICE_TYPE[r.s.serviceType],
    origen: fullAddress(r.s.originAddress), destino: fullAddress(r.s.destinationAddress), unidad: r.s.vehicles.map((v) => v.vehicle.name).join(", "), km: r.km,
    precio: r.precio, cobrado: r.cobrado, saldo: r.saldo, directos: r.directos, nomina: r.nomina, margen: r.margen, cobro: r.s.collectionStatus, inc: r.s.incidents,
  })));
  await audit(prisma, { userId: user.id, action: "EXPORTAR", entity: "Servicio", summary: `${rows.length} servicios realizados`, after: f });
  return xlsxResponse(buf, "servicios-realizados.xlsx");
}

export const GET = safeRoute(handleGet);
