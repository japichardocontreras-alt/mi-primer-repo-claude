import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { monthParam } from "@/lib/queries/period";
import { MONTHS_ES, formatDateTime, formatMXN, mexicoMonthRange } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { MonthPicker } from "@/components/month-picker";

export const metadata = { title: "Cobros" };
const KIND = { ANTICIPO: "Anticipo", PARCIAL: "Pago parcial", PAGO_FINAL: "Pago final", REEMBOLSO: "Reembolso" } as const;
const METHOD = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta", DEPOSITO: "Depósito", CHEQUE: "Cheque", OTRO: "Otro" } as const;

export default async function Cobros({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requirePermission("finanzas.ver");
  const { mes } = await searchParams;
  const mp = monthParam(mes);
  const range = mexicoMonthRange(mp.y, mp.m);
  const [payments, open] = await Promise.all([
    prisma.payment.findMany({ where: { receivedAt: { gte: range.start, lt: range.end } }, include: { service: { include: { client: true } } }, orderBy: { receivedAt: "desc" } }),
    prisma.service.findMany({ where: { status: { not: "CANCELADO" }, collectionStatus: { not: "LIQUIDADO" } }, include: { client: true, payments: { where: { cancelledAt: null } } }, orderBy: [{ actualStart: { sort: "asc", nulls: "last" } }, { scheduledStart: "asc" }] }),
  ]);
  const live = payments.filter((p) => !p.cancelledAt);
  const total = live.reduce((a, p) => a + (p.kind === "REEMBOLSO" ? -1 : 1) * Number(p.amount), 0);
  const byMethod = Object.entries(live.reduce<Record<string, number>>((acc, p) => ((acc[p.method] = (acc[p.method] ?? 0) + (p.kind === "REEMBOLSO" ? -1 : 1) * Number(p.amount)), acc), {}));
  const now = new Date();
  const receivables = open
    .map((s) => {
      const paid = s.payments.reduce((a, p) => a + (p.kind === "REEMBOLSO" ? -1 : 1) * Number(p.amount), 0);
      const date = s.actualStart ?? s.scheduledStart;
      const days = date ? Math.floor((now.getTime() - date.getTime()) / 86400_000) : null;
      return { s, paid, saldo: Number(s.contractedPrice) - paid, date, days };
    })
    .filter((x) => x.saldo > 0.005);
  const totalCxC = receivables.reduce((a, x) => a + x.saldo, 0);
  const vencido = receivables.filter((x) => x.days !== null && x.days > 0).reduce((a, x) => a + x.saldo, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={`Cobros de ${MONTHS_ES[mp.m - 1]} ${mp.y}`}
          description={`${live.length} cobro(s) · ${formatMXN(total)}${byMethod.length ? " · " + byMethod.map(([k, v]) => `${METHOD[k as keyof typeof METHOD]} ${formatMXN(v)}`).join(" · ") : ""}`}
          actions={<>{can(user, "exportar") && <a href={`/api/exportar/cobros?mes=${mp.key}`} className={buttonClass("outline", "sm")}><Download className="h-4 w-4" /> Excel</a>}<MonthPicker value={mp.key} /></>}
        />
        {payments.length === 0 ? <EmptyState title="Sin cobros en el mes" description="Los cobros se registran desde la ficha de cada servicio." /> : (
          <Table>
            <thead><tr><Th>Folio</Th><Th>Fecha</Th><Th>Servicio</Th><Th>Cliente</Th><Th>Tipo</Th><Th>Método / referencia</Th><Th className="text-right">Importe</Th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <Tr key={p.id} className={p.cancelledAt ? "opacity-60" : ""}>
                  <Td className="whitespace-nowrap text-xs">{p.folio}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(p.receivedAt)}</Td>
                  <Td className="whitespace-nowrap font-medium"><Link href={`/agenda/${p.serviceId}`} className="hover:text-brand-600">{p.service.folio}</Link></Td>
                  <Td>{p.service.client.name}</Td>
                  <Td>{KIND[p.kind]}{p.cancelledAt && <span className="block text-xs text-red-700">Cancelado: {p.cancelReason}</span>}</Td>
                  <Td className="text-sm">{METHOD[p.method]}<span className="block text-xs text-neutral-500">{p.reference}</span></Td>
                  <Td className={`whitespace-nowrap text-right tabular-nums ${p.cancelledAt ? "line-through" : ""}`}>{p.kind === "REEMBOLSO" ? "− " : ""}{formatMXN(p.amount)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader title="Cuentas por cobrar" description={`${receivables.length} servicio(s) con saldo · ${formatMXN(totalCxC)} · de servicios ya realizados o con fecha pasada: ${formatMXN(vencido)}`} />
        {receivables.length === 0 ? <EmptyState title="Sin saldos pendientes" /> : (
          <Table>
            <thead><tr><Th>Servicio</Th><Th>Cliente</Th><Th>Fecha del servicio</Th><Th className="text-right">Precio</Th><Th className="text-right">Cobrado</Th><Th className="text-right">Saldo</Th><Th>Antigüedad</Th></tr></thead>
            <tbody>
              {receivables.map((x) => (
                <Tr key={x.s.id}>
                  <Td className="whitespace-nowrap font-medium"><Link href={`/agenda/${x.s.id}`} className="hover:text-brand-600">{x.s.folio}</Link></Td>
                  <Td>{x.s.client.name}<span className="block text-xs text-neutral-500">{x.s.client.phone}</span></Td>
                  <Td className="whitespace-nowrap text-xs">{x.date ? formatDateTime(x.date) : "Por programar"}</Td>
                  <Td className="text-right tabular-nums">{formatMXN(x.s.contractedPrice)}</Td>
                  <Td className="text-right tabular-nums">{formatMXN(x.paid)}</Td>
                  <Td className="text-right font-semibold tabular-nums text-brand-700">{formatMXN(x.saldo)}</Td>
                  <Td>{x.days === null ? <Badge>Sin fecha</Badge> : x.days < 0 ? <Badge tone="blue">Servicio próximo</Badge> : x.days <= 15 ? <Badge tone="amber">{x.days} día(s)</Badge> : <Badge tone="red">{x.days} días</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
