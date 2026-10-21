import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Printer, MessageCircle, Paperclip, FileText, Film, Image as ImageIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { CHANNEL, EVENT_TYPE, PACKAGE, REQUEST_STATUS, SERVICE_TYPE, fullAddress, type RequestStatusKey } from "@/lib/domain/labels";
import { formatDateOnly, formatDateTime, formatMXN, formatNumber, mexicoParts } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { RequestStatusBadge } from "@/components/status-badges";
import { QuoteFields } from "@/components/forms/quote-fields";
import { FollowUpForm } from "@/components/forms/follow-up-form";
import { addFollowUpAction, addQuoteAction, removeAttachmentAction, uploadRequestFilesAction } from "../actions";

export const metadata = { title: "Solicitud" };

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-neutral-900">{children || <span className="text-neutral-400">—</span>}</dd>
    </div>
  );
}

function AddressBlock({ title, a }: { title: string; a: Awaited<ReturnType<typeof load>>["originAddress"] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{title}</p>
      {a ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Item label="Dirección">{fullAddress(a)}</Item></div>
          <Item label="Referencias">{a.references}</Item>
          <Item label="Piso / elevador">{a.floor !== null ? `Piso ${a.floor}` : ""}{a.hasElevator !== null ? `${a.floor !== null ? " · " : ""}${a.hasElevator ? "Con elevador" : "Sin elevador"}` : ""}</Item>
          <div className="sm:col-span-2"><Item label="Condiciones de acceso">{a.accessConditions}</Item></div>
        </dl>
      ) : <p className="text-sm text-neutral-400">Sin capturar.</p>}
    </div>
  );
}

async function load(id: string) {
  const r = await prisma.request.findUnique({
    where: { id },
    include: {
      client: true, originAddress: true, destinationAddress: true, suggestedVehicle: true, currentQuote: true,
      quotes: { orderBy: { versionNumber: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!r) notFound();
  return r;
}

export default async function SolicitudDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creada?: string }> }) {
  const user = await requirePermission("solicitudes.ver");
  const { id } = await params;
  const { creada } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await load(id);
  const userIds = [...new Set([...r.events.map((e) => e.createdById), ...r.quotes.map((q) => q.createdById)].filter(Boolean))] as string[];
  const [users, op] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
    getSetting(prisma, "operacion"),
  ]);
  const who = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? "Sistema";
  const p = mexicoParts();
  const pad = (n: number) => String(n).padStart(2, "0");
  const nowLocal = `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
  const valid = new Date(Date.UTC(p.year, p.month - 1, p.day + op.vigenciaCotizacionDias)).toISOString().slice(0, 10);
  const closed = r.status === "CONFIRMADA" || r.status === "CANCELADA" || r.status === "NO_CONCRETADA";
  const canEdit = can(user, "solicitudes.editar");
  const wa = r.client.phoneNormalized.length === 10 ? `52${r.client.phoneNormalized}` : r.client.phoneNormalized;
  const q = r.currentQuote;
  const expired = q?.validUntil && q.validUntil < new Date(Date.UTC(p.year, p.month - 1, p.day));

  return (
    <>
      <Link href="/solicitudes" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Solicitudes</Link>
      {creada && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Solicitud registrada con el folio <b>{r.folio}</b>.</div>}
      <PageHeader
        eyebrow={`Registrada ${formatDateTime(r.registeredAt)} · ${CHANNEL[r.channel]}`}
        title={r.folio}
        description={<span className="inline-flex flex-wrap items-center gap-2"><RequestStatusBadge status={r.status} /><Link href={`/clientes/${r.clientId}`} className="font-medium text-neutral-800 hover:text-brand-600">{r.client.name}</Link><span>· {r.client.phone}</span></span>}
        actions={
          <>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonClass("outline")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            {q && <Link href={`/imprimir/cotizacion/${r.id}`} target="_blank" className={buttonClass("outline")}><Printer className="h-4 w-4" /> Cotización PDF</Link>}
            {canEdit && r.status !== "CONFIRMADA" && <Link href={`/solicitudes/${r.id}/editar`} className={buttonClass("secondary")}><Pencil className="h-4 w-4" /> Editar</Link>}
          </>
        }
      />

      {(r.lostReason || r.cancelReason) && (
        <div className="mb-4 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
          <b>{r.status === "CANCELADA" ? "Motivo de cancelación" : "Motivo por el que no se concretó"}:</b> {r.cancelReason ?? r.lostReason}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Datos del servicio" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Item label="Tipo de servicio">{SERVICE_TYPE[r.serviceType]}</Item>
                <Item label="Fecha tentativa">{r.tentativeDate ? `${formatDateOnly(r.tentativeDate)}${r.tentativeTime ? ` · ${r.tentativeTime}` : ""}` : ""}</Item>
                <Item label="Paquete">{r.package ? PACKAGE[r.package] : ""}</Item>
                <Item label="Unidad sugerida">{r.suggestedVehicle?.name}</Item>
                <Item label="Embalaje">{r.needsPacking ? "Sí requiere" : "No"}</Item>
                <Item label="Km estimados">{r.estimatedKm ? formatNumber(r.estimatedKm) : ""}</Item>
                <Item label="Volumen (m³)">{r.estimatedVolumeM3 ? formatNumber(r.estimatedVolumeM3) : ""}</Item>
                <Item label="Personal / gastos est.">{[r.requiredStaff !== null ? `${r.requiredStaff} persona(s)` : "", r.estimatedExpenses ? formatMXN(r.estimatedExpenses) : ""].filter(Boolean).join(" · ")}</Item>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Carga y descarga" />
            <CardBody className="grid gap-6 lg:grid-cols-2">
              <AddressBlock title="Carga (origen)" a={r.originAddress} />
              <AddressBlock title="Descarga (destino)" a={r.destinationAddress} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Inventario y observaciones" />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Inventario general">{r.inventorySummary}</Item>
                <Item label="Descripción de artículos">{r.itemsDescription}</Item>
                <Item label="Maniobras especiales">{r.specialManeuvers}</Item>
                <Item label="Observaciones">{r.observations}</Item>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Historial" description="Contactos, cambios de estado, precios y ediciones. No se puede modificar." />
            <ol className="divide-y divide-neutral-100">
              {r.events.map((e) => {
                const d = (e.data ?? {}) as Record<string, unknown>;
                return (
                  <li key={e.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-neutral-900">{EVENT_TYPE[e.type]}</span>
                      {e.type === "CAMBIO_ESTADO" && e.fromStatus && e.toStatus && (
                        <span className="text-neutral-600">{REQUEST_STATUS[e.fromStatus].label} → <b>{REQUEST_STATUS[e.toStatus].label}</b></span>
                      )}
                      {e.type === "COTIZACION" && (
                        <span className="text-neutral-600">v{String(d.version)}: <b>{formatMXN(d.precio as number)}</b>{d.precioAnterior !== null && d.precioAnterior !== undefined ? ` (antes ${formatMXN(d.precioAnterior as number)})` : ""}</span>
                      )}
                      {"canal" in d && <Badge>{CHANNEL[d.canal as keyof typeof CHANNEL]}</Badge>}
                      <span className="ml-auto text-xs text-neutral-500">{formatDateTime(e.contactAt ?? e.createdAt)} · {who(e.createdById)}</span>
                    </div>
                    {e.notes && <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{e.notes}</p>}
                    {e.nextContactAt && <p className="mt-1 text-xs text-neutral-500">Próximo contacto: {formatDateTime(e.nextContactAt)}</p>}
                    {e.type === "EDICION" && (
                      <p className="mt-1 text-xs text-neutral-500">Campos: {Object.keys(d).join(", ")}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Precio cotizado" description={q ? `Versión ${q.versionNumber} · ${formatDateTime(q.quotedAt)}` : "Sin cotización"} />
            <CardBody className="space-y-4">
              {q ? (
                <div>
                  <p className="text-3xl font-semibold tabular-nums text-neutral-900">{formatMXN(q.finalPrice)}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {q.includesVat ? "IVA incluido" : "Sin IVA desglosado"} · Vigencia: {q.validUntil ? formatDateOnly(q.validUntil) : "sin definir"}
                    {expired && <span className="ml-1 font-medium text-red-600">(vencida)</span>}
                  </p>
                  {q.notes && <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{q.notes}</p>}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Capture el precio cuando lo tenga definido.</p>
              )}
              {can(user, "solicitudes.cotizar") && !closed && (
                <details className="rounded-md border border-neutral-200 p-3" open={!q}>
                  <summary className="cursor-pointer text-sm font-medium text-brand-700">{q ? "Modificar precio (nueva versión)" : "Capturar precio"}</summary>
                  <div className="mt-3">
                    <ActionForm action={addQuoteAction.bind(null, r.id)} resetOnSuccess>
                      <QuoteFields defaultValidUntil={valid} />
                      <div className="mt-3"><SubmitButton size="sm">Guardar cotización</SubmitButton></div>
                    </ActionForm>
                  </div>
                </details>
              )}
              {closed && r.status !== "CONFIRMADA" && <p className="text-xs text-neutral-500">Para modificar el precio, reabra la solicitud cambiando su estado.</p>}
            </CardBody>
            {r.quotes.length > 1 && (
              <Table>
                <thead><tr><Th>Versión</Th><Th>Fecha</Th><Th className="text-right">Precio</Th></tr></thead>
                <tbody>
                  {r.quotes.map((v) => (
                    <Tr key={v.id}>
                      <Td>v{v.versionNumber}{v.id === r.currentQuoteId && <Badge tone="green" className="ml-2">Vigente</Badge>}</Td>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(v.quotedAt)}<span className="block text-neutral-500">{who(v.createdById)}</span></Td>
                      <Td className="text-right tabular-nums">{formatMXN(v.finalPrice)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Seguimiento comercial" description={`Último contacto: ${formatDateTime(r.lastContactAt)}${r.nextContactAt ? ` · Próximo: ${formatDateTime(r.nextContactAt)}` : ""}`} />
            <CardBody>
              {canEdit && r.status !== "CONFIRMADA" ? (
                <FollowUpForm action={addFollowUpAction.bind(null, r.id)} current={r.status as RequestStatusKey} nowLocal={nowLocal} />
              ) : (
                <p className="text-sm text-neutral-500">{r.status === "CONFIRMADA" ? "Solicitud confirmada." : "Sin permiso para registrar seguimiento."}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Archivos adjuntos" description={`${r.attachments.length} archivo(s)`} />
            {r.attachments.length > 0 && (
              <ul className="divide-y divide-neutral-100">
                {r.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    {a.category === "FOTO" ? <ImageIcon className="h-4 w-4 text-neutral-400" /> : a.category === "VIDEO" ? <Film className="h-4 w-4 text-neutral-400" /> : <FileText className="h-4 w-4 text-neutral-400" />}
                    <a href={`/api/archivos/${a.id}`} target="_blank" className="min-w-0 flex-1 truncate text-sm text-neutral-800 hover:text-brand-600">{a.fileName}</a>
                    <span className="text-xs text-neutral-400">{(a.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                    {canEdit && (
                      <ActionForm action={removeAttachmentAction.bind(null, a.id)} messagePosition="top">
                        <SubmitButton variant="ghost" size="sm" confirmText={`¿Retirar «${a.fileName}» de la solicitud?`} pendingText="…">Retirar</SubmitButton>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
              <CardBody className="border-t border-neutral-100">
                <ActionForm action={uploadRequestFilesAction.bind(null, r.id)} resetOnSuccess>
                  <FormField name="files" label="Agregar archivos">
                    <Input id="files" name="files" type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" className="h-auto py-1.5" />
                  </FormField>
                  <div className="mt-3"><SubmitButton size="sm" variant="outline" pendingText="Subiendo…"><Paperclip className="h-4 w-4" /> Adjuntar</SubmitButton></div>
                </ActionForm>
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
