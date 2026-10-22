import Link from "next/link";
import { Plus, Download, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { requestWhere, requestListInclude, type RequestFilters } from "@/lib/domain/requests";
import { REQUEST_STATUS, SERVICE_TYPE, OPEN_STATUSES, addressLine, type RequestStatusKey } from "@/lib/domain/labels";
import { formatDateOnly, formatDateTime, formatMXN } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { RequestStatusBadge } from "@/components/status-badges";
import { cn } from "@/lib/utils";

export const metadata = { title: "Solicitudes" };
const PAGE = 25;

type SP = RequestFilters & { p?: string };

export default async function SolicitudesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission("solicitudes.ver");
  const sp = await searchParams;
  const view = sp.view ?? "seguimiento";
  const filters: RequestFilters = { ...sp, view };
  const page = Math.max(1, Number(sp.p) || 1);
  const where = requestWhere(filters);
  const now = new Date();

  const [rows, total, counts, overdue] = await Promise.all([
    prisma.request.findMany({ where, include: requestListInclude, orderBy: [{ registeredAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE }),
    prisma.request.count({ where }),
    prisma.request.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.request.count({ where: { status: { in: OPEN_STATUSES }, nextContactAt: { lte: now } } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const params = { q: sp.q, status: sp.status, serviceType: sp.serviceType, view, from: sp.from, to: sp.to };
  const exportQs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

  const tabs = [
    { key: "seguimiento", label: "En seguimiento", n: OPEN_STATUSES.reduce((a, s) => a + countOf(s), 0) },
    { key: "vencidas", label: "Contacto vencido", n: overdue },
    { key: "todas", label: "Historial completo", n: counts.reduce((a, c) => a + c._count._all, 0) },
  ];

  return (
    <>
      <PageHeader
        title="Solicitudes"
        description="Seguimiento comercial: de la primera consulta a la confirmación. Las solicitudes no concretadas se conservan en el historial."
        actions={
          <>
            {can(user, "exportar") && <a href={`/api/exportar/solicitudes?${exportQs}`} className={buttonClass("outline")}><Download className="h-4 w-4" /> Excel</a>}
            {can(user, "solicitudes.crear") && <Link href="/solicitudes/nueva" className={buttonClass("primary")}><Plus className="h-4 w-4" /> Nueva solicitud</Link>}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.key} href={`/solicitudes?view=${t.key}`}
            className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium", view === t.key && !sp.status ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300")}>
            {t.key === "vencidas" && t.n > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
            {t.label}<span className={cn("rounded-full px-1.5 text-xs", view === t.key && !sp.status ? "bg-white/20" : "bg-neutral-100")}>{t.n}</span>
          </Link>
        ))}
      </div>

      <Card>
        <form className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-5 py-4">
          <input type="hidden" name="view" value={view} />
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Folio, cliente, teléfono o municipio" className="w-full sm:w-72" aria-label="Buscar" />
          <Select name="status" defaultValue={sp.status ?? ""} aria-label="Estado" className="w-full sm:w-56">
            <option value="">Todos los estados</option>
            {Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label} ({countOf(k)})</option>)}
          </Select>
          <Select name="serviceType" defaultValue={sp.serviceType ?? ""} aria-label="Tipo de servicio" className="w-full sm:w-40">
            <option value="">Todos los tipos</option>
            {Object.entries(SERVICE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Input type="date" name="from" defaultValue={sp.from ?? ""} aria-label="Registrada desde" title="Registrada desde" className="w-40" />
            <Input type="date" name="to" defaultValue={sp.to ?? ""} aria-label="Registrada hasta" title="Registrada hasta" className="w-40" />
            <Button type="submit" variant="secondary">Filtrar</Button>
          </div>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title={total === 0 && !sp.q && !sp.status ? "Aún no hay solicitudes en esta vista" : "Sin resultados"}
            description={total === 0 && !sp.q && !sp.status ? "Registre la primera solicitud cuando un cliente lo contacte por WhatsApp o teléfono." : "Ajuste los filtros de búsqueda."}
            action={can(user, "solicitudes.crear") ? <Link href="/solicitudes/nueva" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Nueva solicitud</Link> : undefined}
          />
        ) : (
          <Table>
            <thead>
              <tr><Th>Folio</Th><Th>Cliente / Teléfono</Th><Th>Fecha solicitada</Th><Th>Origen</Th><Th>Destino</Th><Th className="text-right">Precio</Th><Th>Estado</Th><Th>Último contacto</Th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const late = r.nextContactAt && r.nextContactAt <= now && OPEN_STATUSES.includes(r.status as RequestStatusKey);
                return (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap font-medium"><Link href={`/solicitudes/${r.id}`} className="text-neutral-900 hover:text-brand-600">{r.folio}</Link></Td>
                    <Td className="min-w-[150px]">{r.client.name}<span className="block text-xs text-neutral-500">{r.client.phone}</span></Td>
                    <Td className="whitespace-nowrap">{formatDateOnly(r.tentativeDate)}{r.tentativeTime && <span className="block text-xs text-neutral-500">{r.tentativeTime} h</span>}</Td>
                    <Td className="whitespace-nowrap">{addressLine(r.originAddress)}</Td>
                    <Td className="whitespace-nowrap">{addressLine(r.destinationAddress)}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{r.currentQuote ? formatMXN(r.currentQuote.finalPrice) : <span className="text-neutral-400">Sin cotizar</span>}</Td>
                    <Td><RequestStatusBadge status={r.status} /></Td>
                    <Td className="min-w-[96px] text-xs">
                      {formatDateTime(r.lastContactAt)}
                      {late && <span className="mt-0.5 block text-xs font-medium text-red-600">Contactar: {formatDateTime(r.nextContactAt)}</span>}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE} params={params} />
      </Card>
    </>
  );
}
