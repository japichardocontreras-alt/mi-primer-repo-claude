import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { formatDateOnly, formatMXN, mexicoParts } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { generateRecurringAction, saveRecurringAction } from "../actions";

export const metadata = { title: "Gastos recurrentes" };

export default async function Recurrentes() {
  const user = await requirePermission("finanzas.ver");
  const [items, categories] = await Promise.all([
    prisma.recurringExpense.findMany({ include: { category: true, expenses: { orderBy: { recurringPeriod: "desc" }, take: 1 } }, orderBy: [{ active: "desc" }, { description: "asc" }] }),
    prisma.expenseCategory.findMany({ where: { active: true, group: { in: ["FIJO", "FLOTILLA", "EXTRAORDINARIO"] } }, orderBy: { name: "asc" } }),
  ]);
  const p = mexicoParts();
  const ym = `${p.year}-${String(p.month).padStart(2, "0")}`;
  const manage = can(user, "finanzas.gastos");
  const monthly = items.filter((i) => i.active).reduce((a, i) => a + Number(i.amount), 0);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        {manage && (
          <Card>
            <CardHeader title="Generar gastos del mes" description="Crea los gastos fijos del mes como «por pagar». Si ya se generaron, no se duplican." />
            <CardBody>
              <ActionForm action={generateRecurringAction} className="flex flex-wrap items-end gap-2">
                <Input type="month" name="period" defaultValue={ym} className="w-44" aria-label="Mes" />
                <SubmitButton variant="secondary" size="sm">Generar</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="Plantillas de gastos recurrentes" description={`Activos: ${formatMXN(monthly)} al mes`} />
          {items.length === 0 ? <EmptyState title="Sin gastos recurrentes" description="Registre renta, internet, telefonía, GPS, software, etc." /> : (
            <Table>
              <thead><tr><Th>Descripción</Th><Th>Categoría</Th><Th className="text-right">Importe</Th><Th>Día</Th><Th>Vigencia</Th><Th>Último generado</Th><Th>Estado</Th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <Tr key={i.id}>
                    <Td>{manage ? (
                      <details>
                        <summary className="cursor-pointer font-medium hover:text-brand-600">{i.description}</summary>
                        <ActionForm action={saveRecurringAction.bind(null, i.id)} className="mt-2 grid w-80 grid-cols-2 gap-2">
                          <input type="hidden" name="categoryKey" value={i.category.key} />
                          <Input name="description" defaultValue={i.description} className="col-span-2 h-8 text-xs" aria-label="Descripción" />
                          <Input name="amount" defaultValue={Number(i.amount).toFixed(2)} className="h-8 text-right text-xs" aria-label="Importe" />
                          <Input name="dayOfMonth" type="number" min={1} max={28} defaultValue={i.dayOfMonth} className="h-8 text-xs" aria-label="Día" />
                          <Input name="startDate" type="date" defaultValue={i.startDate.toISOString().slice(0, 10)} className="h-8 text-xs" aria-label="Desde" />
                          <Input name="endDate" type="date" defaultValue={i.endDate?.toISOString().slice(0, 10) ?? ""} className="h-8 text-xs" aria-label="Hasta" />
                          <Checkbox name="includesVat" defaultChecked={i.includesVat} label="Incluye IVA" className="text-xs" />
                          <Checkbox name="active" defaultChecked={i.active} label="Activo" className="text-xs" />
                          <div className="col-span-2"><SubmitButton size="sm">Guardar</SubmitButton></div>
                        </ActionForm>
                      </details>
                    ) : i.description}</Td>
                    <Td className="text-sm">{i.category.name}</Td>
                    <Td className="text-right tabular-nums">{formatMXN(i.amount)}{i.includesVat && <span className="block text-[11px] text-neutral-500">IVA incluido</span>}</Td>
                    <Td className="tabular-nums">{i.dayOfMonth}</Td>
                    <Td className="whitespace-nowrap text-xs">{formatDateOnly(i.startDate)} – {i.endDate ? formatDateOnly(i.endDate) : "indefinido"}</Td>
                    <Td className="text-xs">{i.expenses[0]?.recurringPeriod ?? "—"}</Td>
                    <Td>{i.active ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
      {manage && (
        <Card>
          <CardHeader title="Nuevo gasto recurrente" />
          <CardBody>
            <ActionForm action={saveRecurringAction.bind(null, null)} resetOnSuccess className="space-y-3">
              <FormField name="categoryKey" label="Categoría" required><Select id="r_cat" name="categoryKey" defaultValue=""><option value="">Seleccione…</option>{categories.map((c) => <option key={c.id} value={c.key}>{c.name}</option>)}</Select></FormField>
              <FormField name="description" label="Descripción" required><Input id="r_desc" name="description" /></FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField name="amount" label="Importe mensual ($)" required><Input id="r_amount" name="amount" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="dayOfMonth" label="Día del mes (1-28)" required><Input id="r_day" name="dayOfMonth" type="number" min={1} max={28} defaultValue={1} /></FormField>
                <FormField name="startDate" label="Desde" required><Input id="r_start" name="startDate" type="date" defaultValue={`${ym}-01`} /></FormField>
                <FormField name="endDate" label="Hasta (opcional)"><Input id="r_end" name="endDate" type="date" /></FormField>
              </div>
              <Checkbox name="includesVat" label="El importe incluye IVA" />
              <input type="hidden" name="active" value="on" />
              <SubmitButton>Guardar</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
