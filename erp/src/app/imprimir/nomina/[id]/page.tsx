import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { ENTRY_KIND, PERIOD } from "@/lib/domain/payroll";
import { formatDateOnly, formatDateTime, formatMXN } from "@/lib/format";
import { BrandMark } from "@/components/brand-logo";
import { PrintButton } from "../../print-button";

export const metadata = { title: "Recibo de nómina" };
const METHOD: Record<string, string> = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta", DEPOSITO: "Depósito", CHEQUE: "Cheque", OTRO: "Otro" };

export default async function Recibo({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("nomina.ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await prisma.payrollPayment.findUnique({ where: { id }, include: { worker: true, entries: { include: { service: true }, orderBy: { date: "asc" } }, advances: { where: { cancelledAt: null } } } });
  if (!p) notFound();
  const empresa = await getSetting(prisma, "empresa");
  return (
    <div className="min-h-dvh bg-neutral-200 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden"><PrintButton /></div>
      <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] text-neutral-800 shadow-lg print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-4 border-brand-600 pb-4">
          <div className="flex items-center gap-3"><BrandMark className="h-12 w-12" /><div><p className="text-lg font-bold">{empresa.nombre.toUpperCase()}</p><p className="text-xs text-neutral-500">Control interno de pagos al personal</p></div></div>
          <div className="text-right"><p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{p.kind === "ANTICIPO" ? "Recibo de anticipo" : "Recibo de pago"}</p><p className="text-lg font-semibold">{p.folio}</p><p className="text-xs text-neutral-500">{formatDateTime(p.paidAt)}</p></div>
        </header>
        {p.cancelledAt && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">CANCELADO: {p.cancelReason}</p>}
        <section className="mt-5 grid grid-cols-2 gap-4">
          <div><p className="text-xs font-semibold uppercase text-neutral-500">Colaborador</p><p className="font-medium">{p.worker.fullName}</p><p className="text-xs text-neutral-500">{p.worker.code}</p></div>
          <div><p className="text-xs font-semibold uppercase text-neutral-500">Periodo / método</p><p>{p.periodType ? `${PERIOD[p.periodType]} ${formatDateOnly(p.periodStart)} – ${formatDateOnly(p.periodEnd)}` : "—"}</p><p>{METHOD[p.method]}{p.reference ? ` · ${p.reference}` : ""}</p></div>
        </section>
        {p.kind === "PAGO" && (
          <table className="mt-6 w-full text-sm">
            <thead><tr className="border-b border-neutral-300 text-left text-xs uppercase text-neutral-500"><th className="py-2">Fecha</th><th>Concepto</th><th>Tipo</th><th className="text-right">Importe</th></tr></thead>
            <tbody>
              {p.entries.map((e) => <tr key={e.id} className="border-b border-neutral-100"><td className="py-1.5">{formatDateOnly(e.date)}</td><td>{e.concept}</td><td>{ENTRY_KIND[e.kind]}</td><td className="text-right tabular-nums">{formatMXN(e.amount)}</td></tr>)}
              <tr><td colSpan={3} className="pt-3 text-right">Total devengado</td><td className="pt-3 text-right font-semibold tabular-nums">{formatMXN(p.grossAmount)}</td></tr>
              {p.advances.map((a) => <tr key={a.id}><td colSpan={3} className="text-right">Anticipo {a.folio} ({formatDateOnly(a.paidAt)})</td><td className="text-right tabular-nums">− {formatMXN(a.amount)}</td></tr>)}
            </tbody>
          </table>
        )}
        <p className="mt-6 text-right text-xl font-bold">Neto pagado: {formatMXN(p.amount)} <span className="text-xs font-normal text-neutral-500">MXN</span></p>
        {p.notes && <p className="mt-4 text-sm">{p.notes}</p>}
        <div className="mt-20 grid grid-cols-2 gap-16 text-center text-xs text-neutral-600">
          <div className="border-t border-neutral-400 pt-2">Entregó</div>
          <div className="border-t border-neutral-400 pt-2">Recibí conforme · {p.worker.fullName}</div>
        </div>
        <p className="mt-8 text-center text-[10px] text-neutral-400">Documento de control administrativo interno; no es un comprobante fiscal (CFDI).</p>
      </article>
    </div>
  );
}
