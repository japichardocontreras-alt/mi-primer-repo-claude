import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { MOVEMENT_TYPE } from "@/lib/domain/finance";
import { monthParam } from "@/lib/queries/period";
import { formatDateOnly, formatMXN, mexicoParts } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { MonthPicker } from "@/components/month-picker";
import { cancelMovementAction, createMovementAction } from "../actions";

export const metadata = { title: "Otros movimientos" };

export default async function Movimientos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requirePermission("finanzas.ver");
  const { mes } = await searchParams;
  const mp = monthParam(mes);
  const [movs, vehicles] = await Promise.all([
    prisma.financialMovement.findMany({ where: { date: { gte: new Date(Date.UTC(mp.y, mp.m - 1, 1)), lt: new Date(Date.UTC(mp.y, mp.m, 1)) } }, include: { vehicle: true }, orderBy: { date: "desc" } }),
    prisma.vehicle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const p = mexicoParts();
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const manage = can(user, "finanzas.gastos");
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-w-0">
        <CardHeader title="Movimientos no operativos" description="No son ventas ni gastos ordinarios; afectan el flujo de efectivo (los intereses sí son gasto)." actions={<MonthPicker value={mp.key} />} />
        {movs.length === 0 ? <EmptyState title="Sin movimientos en el mes" /> : (
          <Table>
            <thead><tr><Th>Folio / fecha</Th><Th>Tipo</Th><Th>Descripción</Th><Th className="text-right">Importe</Th><Th /></tr></thead>
            <tbody>
              {movs.map((m) => {
                const t = MOVEMENT_TYPE[m.type];
                return (
                  <Tr key={m.id} className={m.cancelledAt ? "opacity-60" : ""}>
                    <Td className="whitespace-nowrap text-xs">{m.folio}<span className="block text-neutral-500">{formatDateOnly(m.date)}</span></Td>
                    <Td><Badge tone={t.direction === "ENTRADA" ? "green" : "amber"}>{t.label}</Badge>{m.cancelledAt && <span className="block text-xs text-red-700">Cancelado</span>}</Td>
                    <Td className="text-sm">{m.description}<span className="block text-xs text-neutral-500">{[m.reference, m.vehicle?.name, m.interestPortion ? `intereses ${formatMXN(m.interestPortion)}` : null].filter(Boolean).join(" · ")}</span></Td>
                    <Td className={`whitespace-nowrap text-right tabular-nums ${m.cancelledAt ? "line-through" : ""}`}>{t.direction === "SALIDA" ? "− " : ""}{formatMXN(m.amount)}</Td>
                    <Td>{manage && !m.cancelledAt && (
                      <details>
                        <summary className="cursor-pointer text-xs text-neutral-500 hover:text-red-700">Cancelar</summary>
                        <ActionForm action={cancelMovementAction.bind(null, m.id)} className="mt-1 space-y-1">
                          <Input name="reason" placeholder="Motivo" aria-label="Motivo" className="h-8 w-36 text-xs" />
                          <SubmitButton size="sm" variant="danger" confirmText={`¿Cancelar ${m.folio}?`}>Cancelar</SubmitButton>
                        </ActionForm>
                      </details>
                    )}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      {manage && (
        <Card>
          <CardHeader title="Registrar movimiento" />
          <CardBody>
            <ActionForm action={createMovementAction} resetOnSuccess className="space-y-3">
              <FormField name="type" label="Tipo" required>
                <Select id="type" name="type" defaultValue="">
                  <option value="">Seleccione…</option>
                  {Object.entries(MOVEMENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </FormField>
              <ul className="space-y-0.5 text-[11px] text-neutral-500">{Object.values(MOVEMENT_TYPE).map((v) => <li key={v.label}><b>{v.label}:</b> {v.hint}</li>)}</ul>
              <FormField name="description" label="Descripción" required><Input id="m_desc" name="description" /></FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField name="amount" label="Importe ($)" required><Input id="m_amount" name="amount" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="date" label="Fecha" required><Input id="m_date" name="date" type="date" defaultValue={today} /></FormField>
                <FormField name="interestPortion" label="De ello, intereses ($)" hint="Solo pagos de financiamiento"><Input id="interestPortion" name="interestPortion" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="reference" label="Referencia"><Input id="m_ref" name="reference" /></FormField>
                <FormField name="vehicleId" label="Unidad (si aplica)" className="col-span-2"><Select id="m_vehicle" name="vehicleId" defaultValue=""><option value="">—</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></FormField>
              </div>
              <SubmitButton>Registrar movimiento</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
