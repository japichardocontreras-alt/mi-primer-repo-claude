import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { SERVICE_TYPE } from "@/lib/domain/labels";
import { STAFF_ROLE } from "@/lib/domain/services";
import { currentRates } from "@/lib/domain/payroll";
import { formatDateOnly, formatMXN, mexicoParts } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonalTabs } from "../tabs";
import { setPayRateAction } from "../nomina-actions";

export const metadata = { title: "Tarifas por servicio" };

export default async function Tarifas() {
  const user = await requirePermission("nomina.gestionar");
  const [rates, history] = await Promise.all([currentRates(prisma), prisma.payRate.findMany({ orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }], take: 100 })]);
  const p = mexicoParts();
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return (
    <>
      <PageHeader title="Personal y nómina" />
      <PersonalTabs active="tarifas" showPayroll={can(user, "nomina.ver")} showRates />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Tarifas vigentes" description="Pago por servicio que se propone al asignar personal. Siempre puede ajustarse en cada servicio." />
          <Table>
            <thead><tr><Th>Tipo de servicio</Th>{Object.values(STAFF_ROLE).map((r) => <Th key={r} className="text-right">{r}</Th>)}</tr></thead>
            <tbody>
              {Object.entries(SERVICE_TYPE).map(([st, label]) => (
                <Tr key={st}>
                  <Td className="font-medium">{label}</Td>
                  {(["CHOFER", "AYUDANTE", "OTRO"] as const).map((role) => {
                    const r = rates.get(`${st}:${role}` as `LOCAL:CHOFER`);
                    return <Td key={role} className="text-right tabular-nums">{r ? <>{formatMXN(r.amount)}<span className="block text-[11px] text-neutral-400">desde {formatDateOnly(r.effectiveFrom)}</span></> : <span className="text-neutral-400">Sin tarifa</span>}</Td>;
                  })}
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Registrar tarifa" description="Un cambio no altera servicios ya asignados ni pagos generados." />
          <CardBody>
            <ActionForm action={setPayRateAction} className="space-y-3">
              <FormField name="serviceType" label="Tipo de servicio"><Select id="serviceType" name="serviceType">{Object.entries(SERVICE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FormField>
              <FormField name="role" label="Rol"><Select id="role" name="role">{Object.entries(STAFF_ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FormField>
              <FormField name="amount" label="Pago por servicio (MXN)"><Input id="amount" name="amount" inputMode="decimal" className="text-right" /></FormField>
              <FormField name="effectiveFrom" label="Vigente desde"><Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={today} /></FormField>
              <SubmitButton>Guardar tarifa</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader title="Historial de tarifas" />
          {history.length === 0 ? <EmptyState title="Sin tarifas registradas" description="Registre los importes que paga por servicio a choferes y ayudantes." /> : (
            <Table>
              <thead><tr><Th>Vigente desde</Th><Th>Tipo</Th><Th>Rol</Th><Th className="text-right">Importe</Th><Th>Registrada</Th></tr></thead>
              <tbody>{history.map((r) => <Tr key={r.id}><Td>{formatDateOnly(r.effectiveFrom)}</Td><Td>{SERVICE_TYPE[r.serviceType]}</Td><Td>{STAFF_ROLE[r.role]}</Td><Td className="text-right tabular-nums">{formatMXN(r.amount)}</Td><Td className="text-xs text-neutral-500">{formatDateOnly(r.createdAt)}</Td></Tr>)}</tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
