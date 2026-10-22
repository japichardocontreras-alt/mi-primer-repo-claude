import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, List } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { SERVICE_STATUS, serviceInclude, type ServiceStatusKey } from "@/lib/domain/services";
import { addressLine } from "@/lib/domain/labels";
import { MONTHS_ES, formatDateTime, formatMXN, mexicoLocalToUtc } from "@/lib/format";
import {
  addDays, dayStartUtc, mondayOf, monthGrid, parseYmd, servicesInRange, servicesOnDay, todayMx, vehicleColor, ymdKey,
  type AgendaService, type Ymd,
} from "@/lib/queries/agenda";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

export const metadata = { title: "Agenda de servicios" };

type SP = { vista?: string; fecha?: string; unidad?: string; estado?: string; canceladas?: string; q?: string; desde?: string; hasta?: string; p?: string };
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hm = (d: Date) => new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

function StatusBadge({ s }: { s: string }) {
  const st = SERVICE_STATUS[s as ServiceStatusKey];
  return <Badge tone={st.tone}>{st.label}</Badge>;
}

function EventChip({ s, colors, compact, day }: { s: AgendaService; colors: string[]; compact?: boolean; day?: Ymd }) {
  const cls = vehicleColor(s.vehicles.map((v) => v.vehicleId), colors);
  const startsToday = !day || s.scheduledStart! >= dayStartUtc(day);
  return (
    <Link href={`/agenda/${s.id}`} className={cn("block rounded border-l-4 px-1.5 py-1 text-[11px] leading-tight hover:brightness-95", cls, s.status === "CANCELADO" && "line-through opacity-60")}>
      <span className="font-semibold">{startsToday ? hm(s.scheduledStart!) : "cont."}</span> {s.folio.replace(/^MM-\d{4}-0*/, "MM-")}
      {!compact && <span className="block truncate">{s.client.name}</span>}
      {!compact && <span className="block truncate opacity-75">{s.vehicles.map((v) => v.vehicle.name).join(", ") || "Sin unidad"}</span>}
    </Link>
  );
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("agenda.ver");
  const sp = await searchParams;
  const vista = sp.vista === "semana" || sp.vista === "lista" ? sp.vista : "mes";
  const base = parseYmd(sp.fecha) ?? todayMx();
  const today = todayMx();
  const filters = { unidad: sp.unidad || undefined, estado: sp.estado || undefined, canceladas: sp.canceladas === "1" };
  const [vehicles, unscheduled] = await Promise.all([
    prisma.vehicle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { status: "POR_PROGRAMAR" }, include: { client: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const colors = vehicles.map((v) => v.id);
  const qs = (over: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const all = { vista, fecha: ymdKey(base), unidad: sp.unidad, estado: sp.estado, canceladas: sp.canceladas, ...over };
    for (const [k, v] of Object.entries(all)) if (v) u.set(k, v);
    return `/agenda?${u}`;
  };

  let content: React.ReactNode;
  let title = "";
  let prev = "", next = "";

  if (vista === "mes") {
    const grid = monthGrid(base.y, base.m);
    const list = await servicesInRange(prisma, dayStartUtc(grid[0][0]), dayStartUtc(addDays(grid[5][6], 1)), filters);
    title = `${MONTHS_ES[base.m - 1]} ${base.y}`;
    prev = qs({ fecha: ymdKey({ y: base.m === 1 ? base.y - 1 : base.y, m: base.m === 1 ? 12 : base.m - 1, d: 1 }) });
    next = qs({ fecha: ymdKey({ y: base.m === 12 ? base.y + 1 : base.y, m: base.m === 12 ? 1 : base.m + 1, d: 1 }) });
    content = (
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 border-l border-t border-neutral-200">
          {DOW.map((d) => <div key={d} className="border-b border-r border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs font-semibold uppercase text-neutral-600">{d}</div>)}
          {grid.flat().map((day) => {
            const items = servicesOnDay(list, day);
            const isToday = ymdKey(day) === ymdKey(today);
            return (
              <div key={ymdKey(day)} className={cn("min-h-[112px] border-b border-r border-neutral-200 p-1", day.m !== base.m && "bg-neutral-50/70")}>
                <Link href={qs({ vista: "semana", fecha: ymdKey(day) })}
                  className={cn("mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday ? "bg-brand-600 font-semibold text-white" : day.m !== base.m ? "text-neutral-400" : "text-neutral-700 hover:bg-neutral-100")}>
                  {day.d}
                </Link>
                <div className="space-y-1">
                  {items.slice(0, 3).map((s) => <EventChip key={s.id} s={s} colors={colors} compact day={day} />)}
                  {items.length > 3 && <Link href={qs({ vista: "semana", fecha: ymdKey(day) })} className="block text-[11px] font-medium text-brand-700">+{items.length - 3} más</Link>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (vista === "semana") {
    const mon = mondayOf(base);
    const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    const list = await servicesInRange(prisma, dayStartUtc(mon), dayStartUtc(addDays(mon, 7)), filters);
    const sun = days[6];
    title = `Semana del ${mon.d} ${MONTHS_ES[mon.m - 1].slice(0, 3).toLowerCase()} al ${sun.d} ${MONTHS_ES[sun.m - 1].slice(0, 3).toLowerCase()} ${sun.y}`;
    prev = qs({ fecha: ymdKey(addDays(mon, -7)) });
    next = qs({ fecha: ymdKey(addDays(mon, 7)) });
    content = (
      <div className="overflow-x-auto">
        <div className="grid min-w-[700px] grid-cols-7 divide-x divide-neutral-200 border-t border-neutral-200">
          {days.map((day, i) => {
            const items = servicesOnDay(list, day);
            const isToday = ymdKey(day) === ymdKey(today);
            return (
              <div key={ymdKey(day)} className="min-h-[360px]">
                <div className={cn("border-b border-neutral-200 px-2 py-2 text-center", isToday ? "bg-brand-50" : "bg-neutral-50")}>
                  <p className="text-xs font-semibold uppercase text-neutral-500">{DOW[i]}</p>
                  <p className={cn("text-lg font-semibold", isToday ? "text-brand-700" : "text-neutral-900")}>{day.d}</p>
                </div>
                <div className="space-y-1.5 p-1.5">
                  {items.length === 0 && <p className="py-4 text-center text-xs text-neutral-400">Libre</p>}
                  {items.map((s) => (
                    <div key={s.id}>
                      <EventChip s={s} colors={colors} day={day} />
                      <p className="px-1 pt-0.5 text-[10px] text-neutral-500">{hm(s.scheduledStart!)}–{hm(s.estimatedEnd!)} · {s.staff.length} pers.</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else {
    const PAGE = 30;
    const page = Math.max(1, Number(sp.p) || 1);
    const from = parseYmd(sp.desde);
    const to = parseYmd(sp.hasta);
    const q = sp.q?.trim();
    const where: Prisma.ServiceWhereInput = {
      AND: [
        filters.estado ? { status: filters.estado as ServiceStatusKey } : filters.canceladas ? {} : { status: { not: "CANCELADO" } },
        filters.unidad ? { vehicles: { some: { vehicleId: filters.unidad } } } : {},
        from ? { scheduledStart: { gte: mexicoLocalToUtc(from.y, from.m, from.d) } } : {},
        to ? { scheduledStart: { lt: mexicoLocalToUtc(to.y, to.m, to.d + 1) } } : {},
        q ? { OR: [{ folio: { contains: q, mode: "insensitive" } }, { client: { name: { contains: q, mode: "insensitive" } } }, { request: { folio: { contains: q, mode: "insensitive" } } }] } : {},
      ],
    };
    const [rows, total] = await Promise.all([
      prisma.service.findMany({ where, include: { ...serviceInclude, payments: { where: { cancelledAt: null } } }, orderBy: [{ scheduledStart: { sort: "asc", nulls: "first" } }], skip: (page - 1) * PAGE, take: PAGE }),
      prisma.service.count({ where }),
    ]);
    title = "Lista general de servicios";
    content = (
      <>
        <form className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-5 py-3">
          <input type="hidden" name="vista" value="lista" />
          {sp.unidad && <input type="hidden" name="unidad" value={sp.unidad} />}
          {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
          <Input name="q" defaultValue={q ?? ""} placeholder="Folio MM / SOL o cliente" className="w-full sm:w-64" aria-label="Buscar" />
          <Input type="date" name="desde" defaultValue={sp.desde ?? ""} className="w-40" aria-label="Desde" title="Desde" />
          <Input type="date" name="hasta" defaultValue={sp.hasta ?? ""} className="w-40" aria-label="Hasta" title="Hasta" />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="Sin servicios" description="Los servicios aparecen aquí al confirmar solicitudes." />
        ) : (
          <Table>
            <thead><tr><Th>Folio</Th><Th>Fecha</Th><Th>Cliente</Th><Th>Ruta</Th><Th>Unidad</Th><Th>Personal</Th><Th className="text-right">Precio</Th><Th className="text-right">Saldo</Th><Th>Estado</Th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const paid = s.payments.reduce((a, p) => a + (p.kind === "REEMBOLSO" ? -1 : 1) * Number(p.amount), 0);
                return (
                  <Tr key={s.id}>
                    <Td className="whitespace-nowrap font-medium"><Link href={`/agenda/${s.id}`} className="hover:text-brand-600">{s.folio}</Link></Td>
                    <Td className="whitespace-nowrap text-xs">{s.scheduledStart ? `${formatDateTime(s.scheduledStart)}` : <span className="text-neutral-400">Por programar</span>}</Td>
                    <Td className="min-w-[140px]">{s.client.name}<span className="block text-xs text-neutral-500">{s.client.phone}</span></Td>
                    <Td className="whitespace-nowrap text-xs">{addressLine(s.originAddress)} → {addressLine(s.destinationAddress)}</Td>
                    <Td className="whitespace-nowrap">{s.vehicles.map((v) => v.vehicle.name).join(", ") || "—"}</Td>
                    <Td className="text-xs">{s.staff.map((x) => x.worker.fullName.split(" ")[0]).join(", ") || "—"}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(s.contractedPrice)}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(Number(s.contractedPrice) - paid)}</Td>
                    <Td><StatusBadge s={s.status} /></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE} params={{ vista: "lista", q, desde: sp.desde, hasta: sp.hasta, unidad: sp.unidad, estado: sp.estado, canceladas: sp.canceladas }} />
      </>
    );
  }

  const views = [
    { key: "mes", label: "Mes", icon: CalendarDays },
    { key: "semana", label: "Semana", icon: CalendarRange },
    { key: "lista", label: "Lista", icon: List },
  ];

  return (
    <>
      <PageHeader title="Agenda de servicios" description="Solo servicios confirmados. Las solicitudes en seguimiento no aparecen aquí." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
          {views.map((v) => (
            <Link key={v.key} href={qs({ vista: v.key, p: undefined })} className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium", vista === v.key ? "bg-ink text-white" : "text-neutral-600 hover:text-neutral-900")}>
              <v.icon className="h-4 w-4" /> {v.label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="fecha" value={ymdKey(base)} />
          <Select name="unidad" defaultValue={sp.unidad ?? ""} className="w-48" aria-label="Unidad">
            <option value="">Todas las unidades</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <Select name="estado" defaultValue={sp.estado ?? ""} className="w-44" aria-label="Estado">
            <option value="">Estados activos</option>
            {Object.entries(SERVICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <label className="flex items-center gap-1.5 text-sm text-neutral-700"><input type="checkbox" name="canceladas" value="1" defaultChecked={sp.canceladas === "1"} className="h-4 w-4 accent-brand-600" /> Incluir cancelados</label>
          <Button type="submit" variant="outline" size="sm">Aplicar</Button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
            {vista !== "lista" && (
              <div className="flex items-center gap-1">
                <Link href={prev} className={buttonClass("ghost", "icon")} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Link>
                <Link href={qs({ fecha: ymdKey(today) })} className={buttonClass("outline", "sm")}>Hoy</Link>
                <Link href={next} className={buttonClass("ghost", "icon")} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
          {content}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Por programar" description="Confirmados sin fecha asignada" />
            {unscheduled.length === 0 ? (
              <p className="px-5 py-4 text-sm text-neutral-500">Ninguno.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {unscheduled.map((s) => (
                  <li key={s.id}><Link href={`/agenda/${s.id}`} className="block px-5 py-2.5 text-sm hover:bg-neutral-50"><span className="font-medium">{s.folio}</span><span className="block text-xs text-neutral-500">{s.client.name}</span></Link></li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Unidades" />
            <ul className="space-y-1.5 px-5 py-4 text-sm">
              {vehicles.map((v) => (
                <li key={v.id} className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-sm border-l-4", vehicleColor([v.id], colors))} />
                  <span className="flex-1">{v.name}</span>
                  {v.status !== "ACTIVA" && <Badge tone="amber">{v.status.replace(/_/g, " ").toLowerCase()}</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
