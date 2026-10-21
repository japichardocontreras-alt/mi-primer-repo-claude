import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { PACKAGE, SERVICE_TYPE, fullAddress } from "@/lib/domain/labels";
import { formatDateOnly, formatDateTime, formatMXN } from "@/lib/format";
import { BrandMark } from "@/components/brand-logo";
import { PrintButton } from "../../print-button";

export const metadata = { title: "Cotización" };

/** Cotización para el cliente. Se genera en PDF con «Imprimir → Guardar como PDF». */
export default async function CotizacionImprimible({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("solicitudes.ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await prisma.request.findUnique({ where: { id }, include: { client: true, originAddress: true, destinationAddress: true, currentQuote: true } });
  if (!r || !r.currentQuote) notFound();
  const [empresa, fin] = await Promise.all([getSetting(prisma, "empresa"), getSetting(prisma, "finanzas")]);
  const q = r.currentQuote;
  const price = Number(q.finalPrice);
  const subtotal = q.includesVat ? price / (1 + fin.tasaIva) : price;

  return (
    <div className="min-h-dvh bg-neutral-200 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden"><PrintButton /></div>
      <article className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] leading-relaxed text-neutral-800 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-4 border-brand-600 pb-5">
          <div className="flex items-center gap-3">
            <BrandMark className="h-14 w-14" />
            <div>
              <p className="text-lg font-bold tracking-wide text-neutral-900">{empresa.nombre.toUpperCase()}</p>
              {empresa.razonSocial && <p className="text-xs text-neutral-500">{empresa.razonSocial}{empresa.rfc ? ` · RFC ${empresa.rfc}` : ""}</p>}
              <p className="text-xs text-neutral-500">{[empresa.telefono, empresa.correo].filter(Boolean).join(" · ")}</p>
              {empresa.direccion && <p className="text-xs text-neutral-500">{empresa.direccion}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Cotización</p>
            <p className="text-lg font-semibold">{r.folio}</p>
            <p className="text-xs text-neutral-500">Versión {q.versionNumber} · {formatDateTime(q.quotedAt)}</p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">Cliente</p>
            <p className="font-medium text-neutral-900">{r.client.name}</p>
            <p>{r.client.phone}{r.client.email ? ` · ${r.client.email}` : ""}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">Servicio</p>
            <p>{SERVICE_TYPE[r.serviceType]}{r.package ? ` · Paquete ${PACKAGE[r.package]}` : ""}</p>
            <p>Fecha tentativa: {r.tentativeDate ? `${formatDateOnly(r.tentativeDate)}${r.tentativeTime ? ` ${r.tentativeTime} h` : ""}` : "por definir"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">Carga</p>
            <p>{fullAddress(r.originAddress)}</p>
            {r.originAddress?.floor != null && <p className="text-xs text-neutral-500">Piso {r.originAddress.floor}{r.originAddress.hasElevator ? " · con elevador" : r.originAddress.hasElevator === false ? " · sin elevador" : ""}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">Descarga</p>
            <p>{fullAddress(r.destinationAddress)}</p>
            {r.destinationAddress?.floor != null && <p className="text-xs text-neutral-500">Piso {r.destinationAddress.floor}{r.destinationAddress.hasElevator ? " · con elevador" : r.destinationAddress.hasElevator === false ? " · sin elevador" : ""}</p>}
          </div>
        </section>

        {(r.inventorySummary || r.specialManeuvers || r.needsPacking) && (
          <section className="mt-6">
            <p className="text-xs font-semibold uppercase text-neutral-500">Alcance</p>
            {r.inventorySummary && <p className="whitespace-pre-line">{r.inventorySummary}</p>}
            {r.specialManeuvers && <p className="mt-1 whitespace-pre-line">Maniobras: {r.specialManeuvers}</p>}
            {r.needsPacking && <p className="mt-1">Incluye servicio de embalaje.</p>}
          </section>
        )}

        <section className="mt-8 rounded-md border border-neutral-200">
          <table className="w-full">
            <tbody>
              {q.includesVat && (
                <>
                  <tr className="border-b border-neutral-100"><td className="px-4 py-2">Subtotal</td><td className="px-4 py-2 text-right tabular-nums">{formatMXN(subtotal)}</td></tr>
                  <tr className="border-b border-neutral-100"><td className="px-4 py-2">IVA ({Math.round(fin.tasaIva * 100)} %)</td><td className="px-4 py-2 text-right tabular-nums">{formatMXN(price - subtotal)}</td></tr>
                </>
              )}
              <tr className="bg-neutral-50">
                <td className="px-4 py-3 text-base font-semibold">Total</td>
                <td className="px-4 py-3 text-right text-xl font-bold tabular-nums text-brand-700">{formatMXN(price)} <span className="text-xs font-normal text-neutral-500">MXN</span></td>
              </tr>
            </tbody>
          </table>
        </section>
        {!q.includesVat && <p className="mt-2 text-xs text-neutral-500">Precio sin IVA. Si requiere factura, se agregará el IVA correspondiente.</p>}
        <p className="mt-2 text-xs text-neutral-500">Vigencia de la cotización: {q.validUntil ? `hasta el ${formatDateOnly(q.validUntil)}` : "sujeta a disponibilidad"}.</p>
        {q.notes && <section className="mt-6"><p className="text-xs font-semibold uppercase text-neutral-500">Condiciones</p><p className="whitespace-pre-line">{q.notes}</p></section>}

        <footer className="mt-16 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
          {empresa.nombre} · Gracias por su confianza.
        </footer>
      </article>
    </div>
  );
}
