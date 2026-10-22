import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { normalizePhone } from "@/lib/format";
import { safeRoute } from "@/lib/api";

/** Búsqueda global por folio, cliente o teléfono. Respeta los permisos de cada módulo. */
async function handleGet(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const digits = normalizePhone(q);
  const phone = digits.length >= 4 ? digits : null;
  const results: { type: string; id: string; title: string; subtitle: string; href: string }[] = [];

  if (user.permissions.has("clientes.ver")) {
    const clients = await prisma.client.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, ...(phone ? [{ phoneNormalized: { contains: phone } }] : [])] },
      take: 6, orderBy: { name: "asc" },
    });
    results.push(...clients.map((c) => ({ type: "Cliente", id: c.id, title: c.name, subtitle: `${c.code} · ${c.phone}`, href: `/clientes/${c.id}` })));
  }
  if (user.permissions.has("solicitudes.ver")) {
    const reqs = await prisma.request.findMany({
      where: { OR: [{ folio: { contains: q, mode: "insensitive" } }, { client: { name: { contains: q, mode: "insensitive" } } }, ...(phone ? [{ client: { phoneNormalized: { contains: phone } } }] : [])] },
      include: { client: true }, take: 6, orderBy: { registeredAt: "desc" },
    });
    results.push(...reqs.map((r) => ({ type: "Solicitud", id: r.id, title: r.folio, subtitle: `${r.client.name} · ${r.client.phone}`, href: `/solicitudes/${r.id}` })));
  }
  if (user.permissions.has("agenda.ver")) {
    const svcs = await prisma.service.findMany({
      where: { OR: [{ folio: { contains: q, mode: "insensitive" } }, { client: { name: { contains: q, mode: "insensitive" } } }, ...(phone ? [{ client: { phoneNormalized: { contains: phone } } }] : [])] },
      include: { client: true }, take: 6, orderBy: { createdAt: "desc" },
    });
    results.push(...svcs.map((s) => ({ type: "Servicio", id: s.id, title: s.folio, subtitle: `${s.client.name} · ${s.client.phone}`, href: `/agenda/${s.id}` })));
  }
  return NextResponse.json({ results });
}

export const GET = safeRoute(handleGet);
