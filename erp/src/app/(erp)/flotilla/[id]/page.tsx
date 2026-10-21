import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { DOCUMENT_TYPE, MAINTENANCE_TYPE, VEHICLE_STATUS, depParams, fleetAlerts, kmBetween } from "@/lib/domain/fleet";
import { straightLine, perKilometer, depreciableBase } from "@/lib/domain/depreciation";
import { vehicleOverview } from "@/lib/queries/fleet";
import { addressLine } from "@/lib/domain/labels";
import { PAYMENT_METHOD } from "@/lib/domain/expenses";
import { MONTHS_ES, formatDateOnly, formatDateTime, formatMXN, formatNumber, mexicoParts, mexicoMonthRange } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, Stat } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { VehicleFields } from "@/components/forms/vehicle-fields";
import { CodeConfirm } from "@/components/forms/code-confirm";
import { cn } from "@/lib/utils";
import {
  cancelDocumentAction, cancelMaintenanceAction, documentAction, fuelAction, maintenanceAction, odometerAction, updateVehicleAction,
} from "../actions";

export const metadata = { title: "Unidad" };

const SOURCE = { SERVICIO_INICIO: "Inicio de servicio", SERVICIO_FIN: "Fin de servicio", MANTENIMIENTO: "Mantenimiento", COMBUSTIBLE: "Carga de combustible", MANUAL: "Lectura manual" } as const;

function CancelInline({ action, confirm }: { action: Parameters<typeof ActionForm>[0]["action"]; confirm: string }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs text-neutral-500 hover:text-red-700">Cancelar</summary>
      <ActionForm action={action} className="mt-1 space-y-1">
        <Input name="reason" placeholder="Motivo" aria-label="Motivo" className="h-8 w-40 text-xs" />
        <SubmitButton size="sm" variant="danger" confirmText={confirm}>Cancelar</SubmitButton>
      </ActionForm>
    </details>
  );
}

export default async function UnidadDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requirePermission("flotilla.ver");
  const { id } = await params;
  const { tab = "servicios" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      maintenances: { orderBy: { date: "desc" }, include: { expense: true } },
      documents: { orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }] },
      depreciation: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 48 },
    },
  });
  if (!v) notFound();
  const money = can(user, "finanzas.ver") || can(user, "costos.editar");
  const edit = can(user, "flotilla.editar");
  const [ov, alerts, readingsCount] = await Promise.all([vehicleOverview(prisma, id), fleetAlerts(prisma), prisma.odometerReading.count({ where: { vehicleId: id } })]);
  const myAlerts = alerts.filter((a) => a.vehicleId === id);
  const p = mexicoParts();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  const nowLocal = `${today}T${pad(p.hour)}:${pad(p.minute)}`;
  const params0 = depParams(v);
  const lin = straightLine(params0, p.year, p.month);
  const month = mexicoMonthRange(p.year, p.month);
  const kmTotal = await kmBetween(prisma, id, v.initialOdometer, null, new Date());
  const kmMonth = await kmBetween(prisma, id, v.initialOdometer, month.start, month.end);
  const perKm = perKilometer(params0, kmTotal, kmMonth);
  const latestDoc = (t: keyof typeof DOCUMENT_TYPE) => v.documents.find((d) => d.type === t && !d.cancelledAt);

  const tabs = [
    ["servicios", "Servicios"], ["kilometraje", "Kilometraje"], ["mantenimiento", "Mantenimiento"], ["documentos", "Documentos"],
    ["combustible", "Combustible"], ...(money ? [["depreciacion", "Depreciación"]] : []), ["datos", "Datos de la unidad"],
  ] as [string, string][];

  return (
    <>
      <Link href="/flotilla" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Flotilla</Link>
      <PageHeader
        eyebrow={`${v.code}${v.plates ? ` · ${v.plates}` : ""}`}
        title={v.name}
        description={<span className="inline-flex flex-wrap items-center gap-2"><Badge tone={VEHICLE_STATUS[v.status].tone}>{VEHICLE_STATUS[v.status].label}</Badge>{[v.brand, v.model, v.year, v.capacity].filter(Boolean).join(" · ")}</span>}
      />
      {myAlerts.length > 0 && (
        <div className="mb-4 space-y-1 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {myAlerts.map((a) => <p key={a.refId + a.level} className={a.level === "VENCIDO" ? "font-semibold text-red-800" : ""}><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{a.title} — {a.detail}</p>)}
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Kilometraje actual" value={formatNumber(v.currentOdometer)} hint={`${formatNumber(kmTotal)} km desde el alta · ${formatNumber(kmMonth)} km este mes`} />
        <Stat label="Servicios realizados" value={ov.totals.services} hint={`${formatNumber(ov.totals.km)} km en servicios`} />
        {money && <Stat label="Ingresos generados" value={formatMXN(ov.totals.income)} hint={`Gastos de servicios ${formatMXN(ov.totals.serviceCosts)}`} />}
        {money && <Stat label="Valor contable estimado" value={lin ? formatMXN(lin.bookValue) : "—"} hint={lin ? `Depreciación acumulada ${formatMXN(lin.accumulated)}` : "Capture los datos de adquisición"} />}
        {!money && <Stat label="Rendimiento real" value={ov.totals.kmPerLiter ? `${formatNumber(ov.totals.kmPerLiter)} km/L` : "—"} hint={v.estimatedKmPerLiter ? `Estimado ${formatNumber(v.estimatedKmPerLiter)} km/L` : undefined} />}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        {(["SEGURO", "VERIFICACION", "TENENCIA", "TARJETA_CIRCULACION"] as const).map((t) => {
          const d = latestDoc(t);
          return <Card key={t} className="px-4 py-3"><p className="text-xs text-neutral-500">{DOCUMENT_TYPE[t]}</p><p className="font-medium">{d?.expiresAt ? `vence ${formatDateOnly(d.expiresAt)}` : d ? "registrado" : <span className="text-neutral-400">sin registro</span>}</p></Card>;
        })}
        <Card className="px-4 py-3"><p className="text-xs text-neutral-500">GPS</p><p className="truncate font-medium">{v.gps ?? <span className="text-neutral-400">sin registro</span>}</p></Card>
      </div>

      <div className="mb-4 overflow-x-auto border-b border-neutral-200">
        <nav className="-mb-px flex min-w-max gap-5">
          {tabs.map(([k, l]) => <Link key={k} href={`/flotilla/${id}?tab=${k}`} className={cn("border-b-2 px-1 pb-3 text-sm font-medium", tab === k ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800")}>{l}</Link>)}
        </nav>
      </div>

      {tab === "servicios" && (
        <Card>
          <CardHeader title="Historial de servicios" description="Se alimenta automáticamente con cada cierre operativo. Ingreso atribuido = precio ÷ número de unidades del servicio." />
          {ov.history.length === 0 ? <EmptyState title="Sin servicios realizados" /> : (
            <Table>
              <thead><tr><Th>Fecha</Th><Th>Folio</Th><Th>Origen</Th><Th>Destino</Th><Th className="text-right">Km</Th>{money && <><Th className="text-right">Ingreso</Th><Th className="text-right">Gastos asociados</Th></>}</tr></thead>
              <tbody>
                {ov.history.map((h) => (
                  <Tr key={h.s.id}>
                    <Td className="whitespace-nowrap text-xs">{formatDateTime(h.s.actualStart)}</Td>
                    <Td className="font-medium"><Link href={`/agenda/${h.s.id}`} className="hover:text-brand-600">{h.s.folio}</Link></Td>
                    <Td>{addressLine(h.s.originAddress)}</Td>
                    <Td>{addressLine(h.s.destinationAddress)}</Td>
                    <Td className="text-right tabular-nums">{formatNumber(h.km)}</Td>
                    {money && <><Td className="text-right tabular-nums">{formatMXN(h.income)}</Td><Td className="text-right tabular-nums">{formatMXN(h.costs)}</Td></>}
                  </Tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-neutral-50 font-semibold"><Td colSpan={4}>Totales</Td><Td className="text-right tabular-nums">{formatNumber(ov.totals.km)}</Td>{money && <><Td className="text-right tabular-nums">{formatMXN(ov.totals.income)}</Td><Td className="text-right tabular-nums">{formatMXN(ov.totals.serviceCosts)}</Td></>}</tr></tfoot>
            </Table>
          )}
        </Card>
      )}

      {tab === "kilometraje" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Lecturas de odómetro" description="Historial inmutable: una lectura errónea se corrige con otra lectura, nunca se sobrescribe." />
            {ov.issues.length > 0 && (
              <div className="border-b border-neutral-100 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                <p className="font-semibold">Revisión de inconsistencias</p>
                {ov.issues.map((i, k) => <p key={k}>{formatDateTime(i.at)}{i.folio ? ` (${i.folio})` : ""}: {i.type === "RETROCESO" ? "el kilometraje retrocede" : "hay km sin registrar"} — de {formatNumber(i.previous)} a {formatNumber(i.current)} km</p>)}
              </div>
            )}
            {ov.readings.length === 0 ? <EmptyState title="Sin lecturas" description={`Kilometraje inicial: ${formatNumber(v.initialOdometer)}`} /> : (
              <Table>
                <thead><tr><Th>Fecha</Th><Th className="text-right">Odómetro</Th><Th>Origen</Th><Th>Notas</Th></tr></thead>
                <tbody>{ov.readings.map((r) => <Tr key={r.id}><Td className="whitespace-nowrap text-xs">{formatDateTime(r.readingAt)}</Td><Td className="text-right tabular-nums">{formatNumber(r.odometer)}</Td><Td>{SOURCE[r.source]}{r.service && <> · <Link href={`/agenda/${r.service.id}`} className="hover:text-brand-600">{r.service.folio}</Link></>}</Td><Td className="text-xs text-neutral-500">{r.notes}</Td></Tr>)}</tbody>
              </Table>
            )}
          </Card>
          {edit && (
            <Card>
              <CardHeader title="Registrar lectura" />
              <CardBody>
                <ActionForm action={odometerAction.bind(null, id)} resetOnSuccess className="space-y-3">
                  <FormField name="readingAt" label="Fecha y hora"><Input id="readingAt" name="readingAt" type="datetime-local" defaultValue={nowLocal} /></FormField>
                  <FormField name="odometer" label="Odómetro (km)"><Input id="odometer" name="odometer" inputMode="numeric" /></FormField>
                  <FormField name="notes" label="Notas"><Input id="notes" name="notes" placeholder="Ej. revisión semanal" /></FormField>
                  <CodeConfirm code="ODOMETER_CHECK" label="Confirmo que la lectura es correcta." />
                  <SubmitButton size="sm">Registrar lectura</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === "mantenimiento" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Mantenimientos" description="El costo se registra una sola vez como gasto de flotilla ligado a la unidad." />
            {v.maintenances.length === 0 ? <EmptyState title="Sin mantenimientos registrados" /> : (
              <Table>
                <thead><tr><Th>Fecha</Th><Th>Tipo</Th><Th className="text-right">Km</Th><Th>Descripción / proveedor</Th>{money && <Th className="text-right">Costo</Th>}<Th>Próximo</Th><Th /></tr></thead>
                <tbody>
                  {v.maintenances.map((m) => (
                    <Tr key={m.id} className={m.cancelledAt ? "opacity-60" : ""}>
                      <Td className="whitespace-nowrap text-xs">{formatDateOnly(m.date)}</Td>
                      <Td>{MAINTENANCE_TYPE[m.type]}</Td>
                      <Td className="text-right tabular-nums">{m.odometer !== null ? formatNumber(m.odometer) : "—"}</Td>
                      <Td className="text-sm">{m.description}<span className="block text-xs text-neutral-500">{m.provider}{m.cancelledAt ? ` · Cancelado: ${m.cancelReason}` : ""}</span></Td>
                      {money && <Td className={`text-right tabular-nums ${m.cancelledAt ? "line-through" : ""}`}>{formatMXN(m.cost)}</Td>}
                      <Td className="text-xs">{[m.nextDate ? formatDateOnly(m.nextDate) : null, m.nextOdometer !== null ? `${formatNumber(m.nextOdometer)} km` : null].filter(Boolean).join(" · ") || "—"}</Td>
                      <Td>{edit && !m.cancelledAt && <CancelInline action={cancelMaintenanceAction.bind(null, m.id, id)} confirm="¿Cancelar este mantenimiento? También se cancela su gasto." />}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          {edit && (
            <Card>
              <CardHeader title="Registrar mantenimiento" />
              <CardBody>
                <ActionForm action={maintenanceAction.bind(null, id)} resetOnSuccess className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField name="type" label="Tipo" className="col-span-2"><Select id="type" name="type">{Object.entries(MAINTENANCE_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
                    <FormField name="date" label="Fecha"><Input id="date" name="date" type="date" defaultValue={today} /></FormField>
                    <FormField name="odometer" htmlFor="m_odometer" label="Kilometraje"><Input id="m_odometer" name="odometer" inputMode="numeric" defaultValue={v.currentOdometer || ""} /></FormField>
                    <FormField name="description" label="Descripción" className="col-span-2"><Input id="description" name="description" /></FormField>
                    <FormField name="provider" label="Proveedor / taller" className="col-span-2"><Input id="provider" name="provider" /></FormField>
                    <FormField name="cost" label="Costo total ($)"><Input id="cost" name="cost" inputMode="decimal" className="text-right" /></FormField>
                    <FormField name="vatAmount" label="IVA incluido ($)"><Input id="vatAmount" name="vatAmount" inputMode="decimal" className="text-right" /></FormField>
                    <FormField name="method" label="Pagado con"><Select id="method" name="method" defaultValue="EFECTIVO">{Object.entries(PAYMENT_METHOD).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
                    <div className="flex items-end pb-2"><Checkbox name="paid" defaultChecked label="Pagado" /></div>
                    <FormField name="nextDate" label="Próximo (fecha)"><Input id="nextDate" name="nextDate" type="date" /></FormField>
                    <FormField name="nextOdometer" label="Próximo (km)"><Input id="nextOdometer" name="nextOdometer" inputMode="numeric" /></FormField>
                  </div>
                  <CodeConfirm code="ODOMETER_CHECK" label="Confirmo que el kilometraje es correcto." />
                  <SubmitButton size="sm">Registrar mantenimiento</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === "documentos" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Documentación" description="Seguro, verificación, tenencia, tarjeta de circulación y otros. Las alertas usan los días configurados." />
            {v.documents.length === 0 ? <EmptyState title="Sin documentos registrados" /> : (
              <Table>
                <thead><tr><Th>Documento</Th><Th>Número / proveedor</Th><Th>Emisión</Th><Th>Vencimiento</Th>{money && <Th className="text-right">Importe</Th>}<Th /></tr></thead>
                <tbody>
                  {v.documents.map((d) => {
                    const expired = d.expiresAt && d.expiresAt < new Date(`${today}T00:00:00Z`);
                    return (
                      <Tr key={d.id} className={d.cancelledAt ? "opacity-60" : ""}>
                        <Td>{DOCUMENT_TYPE[d.type]}{d.description && <span className="block text-xs text-neutral-500">{d.description}</span>}{d.cancelledAt && <span className="block text-xs text-red-700">Cancelado: {d.cancelReason}</span>}</Td>
                        <Td className="text-sm">{d.number ?? "—"}<span className="block text-xs text-neutral-500">{d.provider}</span></Td>
                        <Td className="text-xs">{formatDateOnly(d.issuedAt)}</Td>
                        <Td className={`text-xs ${expired && !d.cancelledAt ? "font-semibold text-red-700" : ""}`}>{formatDateOnly(d.expiresAt)}</Td>
                        {money && <Td className="text-right tabular-nums">{d.amount ? formatMXN(d.amount) : "—"}</Td>}
                        <Td>{edit && !d.cancelledAt && <CancelInline action={cancelDocumentAction.bind(null, d.id, id)} confirm="¿Cancelar este documento? Si tiene pago registrado, también se cancela el gasto." />}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
          {edit && (
            <Card>
              <CardHeader title="Registrar documento o pago" />
              <CardBody>
                <ActionForm action={documentAction.bind(null, id)} resetOnSuccess className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField name="type" htmlFor="d_type" label="Tipo" className="col-span-2"><Select id="d_type" name="type">{Object.entries(DOCUMENT_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
                    <FormField name="number" label="Número / póliza"><Input id="number" name="number" /></FormField>
                    <FormField name="provider" htmlFor="d_provider" label="Proveedor"><Input id="d_provider" name="provider" /></FormField>
                    <FormField name="issuedAt" label="Emisión"><Input id="issuedAt" name="issuedAt" type="date" /></FormField>
                    <FormField name="expiresAt" label="Vencimiento"><Input id="expiresAt" name="expiresAt" type="date" /></FormField>
                    <FormField name="amount" htmlFor="d_amount" label="Importe pagado ($)"><Input id="d_amount" name="amount" inputMode="decimal" className="text-right" /></FormField>
                    <FormField name="paidAt" label="Fecha de pago"><Input id="paidAt" name="paidAt" type="date" /></FormField>
                    <FormField name="description" htmlFor="d_description" label="Notas" className="col-span-2"><Input id="d_description" name="description" /></FormField>
                  </div>
                  <SubmitButton size="sm">Registrar documento</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === "combustible" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Cargas de combustible" description={`${formatNumber(ov.totals.liters)} L registrados · rendimiento real ${ov.totals.kmPerLiter ? `${formatNumber(ov.totals.kmPerLiter)} km/L` : "sin datos suficientes"}${v.estimatedKmPerLiter ? ` (estimado ${formatNumber(v.estimatedKmPerLiter)} km/L)` : ""}`} />
            {ov.fuel.length === 0 ? <EmptyState title="Sin cargas registradas" /> : (
              <Table>
                <thead><tr><Th>Fecha</Th><Th className="text-right">Litros</Th><Th className="text-right">Odómetro</Th>{money && <Th className="text-right">Importe</Th>}<Th>Servicio / estación</Th></tr></thead>
                <tbody>{ov.fuel.map((f) => <Tr key={f.id}><Td className="whitespace-nowrap text-xs">{formatDateTime(f.date)}</Td><Td className="text-right tabular-nums">{formatNumber(f.liters)}</Td><Td className="text-right tabular-nums">{f.odometer !== null ? formatNumber(f.odometer) : "—"}</Td>{money && <Td className="text-right tabular-nums">{f.expense ? formatMXN(f.expense.total) : "—"}</Td>}<Td className="text-sm">{f.service ? <Link href={`/agenda/${f.service.id}`} className="hover:text-brand-600">{f.service.folio}</Link> : f.station ?? "—"}</Td></Tr>)}</tbody>
              </Table>
            )}
          </Card>
          {edit && (
            <Card>
              <CardHeader title="Carga fuera de servicio" description="Las cargas durante un servicio se registran en su cierre operativo." />
              <CardBody>
                <ActionForm action={fuelAction.bind(null, id)} resetOnSuccess className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField name="date" htmlFor="f_date" label="Fecha y hora" className="col-span-2"><Input id="f_date" name="date" type="datetime-local" defaultValue={nowLocal} /></FormField>
                    <FormField name="liters" label="Litros"><Input id="liters" name="liters" inputMode="decimal" /></FormField>
                    <FormField name="amount" htmlFor="f_amount" label="Importe ($)"><Input id="f_amount" name="amount" inputMode="decimal" className="text-right" /></FormField>
                    <FormField name="odometer" htmlFor="f_odometer" label="Odómetro"><Input id="f_odometer" name="odometer" inputMode="numeric" /></FormField>
                    <FormField name="station" label="Estación"><Input id="station" name="station" /></FormField>
                  </div>
                  <CodeConfirm code="ODOMETER_CHECK" label="Confirmo que el kilometraje es correcto." />
                  <SubmitButton size="sm">Registrar carga</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === "depreciacion" && money && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Depreciación lineal por tiempo" description="(Precio − valor residual) ÷ vida útil en años; inicia el mes siguiente a la adquisición." />
            <CardBody>
              {lin ? (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-xs text-neutral-500">Base depreciable</dt><dd className="font-semibold tabular-nums">{formatMXN(depreciableBase(params0))}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Depreciación anual</dt><dd className="font-semibold tabular-nums">{formatMXN(lin.annual)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Depreciación mensual</dt><dd className="font-semibold tabular-nums">{formatMXN(lin.monthly)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Meses transcurridos</dt><dd className="font-semibold tabular-nums">{lin.monthsElapsed} de {lin.lifeMonths}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Acumulada</dt><dd className="font-semibold tabular-nums">{formatMXN(lin.accumulated)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Valor contable estimado</dt><dd className="font-semibold tabular-nums">{formatMXN(lin.bookValue)}</dd></div>
                </dl>
              ) : <p className="text-sm text-neutral-500">Capture precio de adquisición, valor residual, vida útil en años y fecha de adquisición en «Datos de la unidad».</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Depreciación económica por kilómetro" description="(Precio − valor residual) ÷ vida útil en km × km recorridos." />
            <CardBody>
              {perKm ? (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-xs text-neutral-500">Por kilómetro</dt><dd className="font-semibold tabular-nums">{formatMXN(perKm.perKm)} <span className="text-xs font-normal text-neutral-500">({perKm.perKm.toFixed(4)})</span></dd></div>
                  <div><dt className="text-xs text-neutral-500">Km recorridos desde el alta</dt><dd className="font-semibold tabular-nums">{formatNumber(kmTotal)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Este mes ({formatNumber(kmMonth)} km)</dt><dd className="font-semibold tabular-nums">{formatMXN(perKm.thisPeriod)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Acumulada</dt><dd className="font-semibold tabular-nums">{formatMXN(perKm.accumulated)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Valor contable estimado</dt><dd className="font-semibold tabular-nums">{formatMXN(perKm.bookValue)}</dd></div>
                </dl>
              ) : <p className="text-sm text-neutral-500">Capture precio de adquisición, valor residual y vida útil en km.</p>}
            </CardBody>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader title="Depreciación registrada por mes" description="Registros usados en Resultados. No son salidas de efectivo; se reportan aparte de los gastos pagados." />
            {v.depreciation.length === 0 ? <EmptyState title="Sin registros" description="Se generan desde Flotilla → «Depreciación mensual»." /> : (
              <Table>
                <thead><tr><Th>Mes</Th><Th>Método</Th><Th className="text-right">Importe</Th></tr></thead>
                <tbody>{v.depreciation.map((d) => <Tr key={d.id}><Td>{MONTHS_ES[d.month - 1]} {d.year}</Td><Td>{d.method === "LINEAL_TIEMPO" ? "Lineal por tiempo" : "Por kilómetro"}</Td><Td className="text-right tabular-nums">{formatMXN(d.amount)}</Td></Tr>)}</tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === "datos" && (
        <Card>
          {edit ? (
            <ActionForm action={updateVehicleAction.bind(null, id)} messagePosition="top">
              <input type="hidden" name="version" value={v.version} />
              <VehicleFields v={v} showMoney={money} lockInitial={readingsCount > 0} />
              <div className="px-5 pb-5 sm:px-6"><SubmitButton>Guardar cambios</SubmitButton></div>
            </ActionForm>
          ) : (
            <CardBody className="text-sm text-neutral-600">Sin permiso para editar la unidad.</CardBody>
          )}
        </Card>
      )}
    </>
  );
}
