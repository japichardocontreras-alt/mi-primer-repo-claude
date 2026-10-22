import Link from "next/link";
import { Download } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { monthParam } from "@/lib/queries/period";
import { PAYMENT_METHOD } from "@/lib/domain/expenses";
import { MONTHS_ES, formatDateOnly, formatMXN, mexicoParts } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { DuplicateExpenseConfirm } from "@/components/forms/duplicate-expense-confirm";
import { cancelExpenseFinAction, createExpenseAction, markPaidAction } from "../actions";

export const metadata = { title: "Gastos" };
const GROUP = { DIRECTO: "Directos", FIJO: "Fijos", FLOTILLA: "Flotilla", EXTRAORDINARIO: "Extraordinarios" } as const;

export default async function Gastos({ searchParams }: { searchParams: Promise<{ mes?: string; grupo?: string; categoria?: string; estado?: string; cancelados?: string }> }) {
  const user = await requirePermission("finanzas.ver");
  const sp = await searchParams;
  const mp = monthParam(sp.mes);
  const where: Prisma.ExpenseWhereInput = {
    date: { gte: new Date(Date.UTC(mp.y, mp.m - 1, 1)), lt: new Date(Date.UTC(mp.y, mp.m, 1)) },
    ...(sp.cancelados ? {} : { cancelledAt: null }),
    ...(sp.grupo && sp.grupo in GROUP ? { category: { group: sp.grupo as keyof typeof GROUP } } : {}),
    ...(sp.categoria ? { category: { key: sp.categoria } } : {}),
    ...(sp.estado === "por_pagar" ? { paidAt: null } : sp.estado === "pagados" ? { paidAt: { not: null } } : {}),
  };
  const [expenses, categories, vehicles, pending] = await Promise.all([
    prisma.expense.findMany({ where, include: { category: true, service: { select: { id: true, folio: true } }, vehicle: { select: { id: true, name: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.expenseCategory.findMany({ where: { active: true }, orderBy: [{ group: "asc" }, { name: "asc" }] }),
    prisma.vehicle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.expense.aggregate({ where: { cancelledAt: null, paidAt: null }, _sum: { total: true }, _count: true }),
  ]);
  const live = expenses.filter((e) => !e.cancelledAt);
  const sum = (k: "subtotal" | "vatAmount" | "total") => live.reduce((a, e) => a + Number(e[k]), 0);
  const p = mexicoParts();
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const manage = can(user, "finanzas.gastos");
  const qs = new URLSearchParams(Object.entries({ mes: mp.key, grupo: sp.grupo, categoria: sp.categoria, estado: sp.estado }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-w-0">
        <CardHeader
          title={`Gastos de ${MONTHS_ES[mp.m - 1]} ${mp.y}`}
          description={`${live.length} gasto(s) · subtotal ${formatMXN(sum("subtotal"))} · IVA ${formatMXN(sum("vatAmount"))} · total ${formatMXN(sum("total"))} · Por pagar (todas las fechas): ${pending._count} por ${formatMXN(pending._sum.total)}`}
          actions={can(user, "exportar") ? <a href={`/api/exportar/gastos?${qs}`} className={buttonClass("outline", "sm")}><Download className="h-4 w-4" /> Excel</a> : undefined}
        />
        <form className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-5 py-3">
          <Input type="month" name="mes" defaultValue={mp.key} className="w-40" aria-label="Mes" />
          <Select name="grupo" defaultValue={sp.grupo ?? ""} className="w-40" aria-label="Grupo"><option value="">Todos los grupos</option>{Object.entries(GROUP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select name="categoria" defaultValue={sp.categoria ?? ""} className="w-52" aria-label="Categoría"><option value="">Todas las categorías</option>{categories.map((c) => <option key={c.id} value={c.key}>{c.name}</option>)}</Select>
          <Select name="estado" defaultValue={sp.estado ?? ""} className="w-36" aria-label="Estado de pago"><option value="">Pagados y por pagar</option><option value="por_pagar">Por pagar</option><option value="pagados">Pagados</option></Select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="cancelados" value="1" defaultChecked={!!sp.cancelados} className="h-4 w-4 accent-brand-600" /> Cancelados</label>
          <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
        </form>
        {expenses.length === 0 ? <EmptyState title="Sin gastos con estos filtros" /> : (
          <Table>
            <thead><tr><Th>Folio / fecha</Th><Th>Categoría</Th><Th>Descripción</Th><Th>Ligado a</Th><Th className="text-right">Subtotal</Th><Th className="text-right">IVA</Th><Th className="text-right">Total</Th><Th>Pago</Th><Th /></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <Tr key={e.id} className={e.cancelledAt ? "opacity-60" : ""}>
                  <Td className="whitespace-nowrap text-xs">{e.folio}<span className="block text-neutral-500">{formatDateOnly(e.date)}</span></Td>
                  <Td className="text-sm">{e.category.name}<span className="block text-xs text-neutral-500">{GROUP[e.category.group]}</span></Td>
                  <Td className="max-w-[240px] text-sm">{e.description}<span className="block text-xs text-neutral-500">{e.supplier}{e.cancelledAt ? ` · Cancelado: ${e.cancelReason}` : ""}</span></Td>
                  <Td className="whitespace-nowrap text-xs">{e.service ? <Link href={`/agenda/${e.service.id}`} className="hover:text-brand-600">{e.service.folio}</Link> : null}{e.vehicle ? <Link href={`/flotilla/${e.vehicle.id}`} className="block hover:text-brand-600">{e.vehicle.name}</Link> : null}{!e.service && !e.vehicle && "—"}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(e.subtotal)}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{formatMXN(e.vatAmount)}</Td>
                  <Td className={`whitespace-nowrap text-right font-medium tabular-nums ${e.cancelledAt ? "line-through" : ""}`}>{formatMXN(e.total)}</Td>
                  <Td className="whitespace-nowrap text-xs">
                    {e.paidAt ? <Badge tone="green">Pagado {formatDateOnly(e.paidAt)}</Badge> : e.cancelledAt ? null : (
                      manage ? (
                        <details>
                          <summary className="cursor-pointer"><Badge tone="amber">Por pagar</Badge></summary>
                          <ActionForm action={markPaidAction.bind(null, e.id)} className="mt-1 space-y-1">
                            <Input name="paidAt" type="date" defaultValue={today} className="h-8 w-36 text-xs" aria-label="Fecha de pago" />
                            <Select name="method" defaultValue="TRANSFERENCIA" className="h-8 w-36 text-xs" aria-label="Método">{Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                            <SubmitButton size="sm">Marcar pagado</SubmitButton>
                          </ActionForm>
                        </details>
                      ) : <Badge tone="amber">Por pagar</Badge>
                    )}
                  </Td>
                  <Td>{manage && !e.cancelledAt && (
                    <details>
                      <summary className="cursor-pointer text-xs text-neutral-500 hover:text-red-700">Cancelar</summary>
                      <ActionForm action={cancelExpenseFinAction.bind(null, e.id)} className="mt-1 space-y-1">
                        <Input name="reason" placeholder="Motivo" aria-label="Motivo" className="h-8 w-36 text-xs" />
                        <SubmitButton size="sm" variant="danger" confirmText={`¿Cancelar el gasto ${e.folio}?`}>Cancelar</SubmitButton>
                      </ActionForm>
                    </details>
                  )}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {manage && (
        <Card>
          <CardHeader title="Registrar gasto" description="Para gastos de un servicio indique su folio (MM-…). Mantenimiento y documentos se capturan en Flotilla." />
          <CardBody>
            <ActionForm action={createExpenseAction} resetOnSuccess className="space-y-3">
              <FormField name="categoryKey" label="Categoría" required>
                <Select id="categoryKey" name="categoryKey" defaultValue="">
                  <option value="">Seleccione…</option>
                  {Object.entries(GROUP).map(([g, gl]) => (
                    <optgroup key={g} label={gl}>{categories.filter((c) => c.group === g).map((c) => <option key={c.id} value={c.key}>{c.name}</option>)}</optgroup>
                  ))}
                </Select>
              </FormField>
              <FormField name="description" label="Descripción" required><Input id="description" name="description" /></FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField name="total" label="Total ($)" required><Input id="total" name="total" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="vatAmount" label="IVA incluido ($)"><Input id="vatAmount" name="vatAmount" inputMode="decimal" className="text-right" /></FormField>
                <FormField name="date" label="Fecha contable" required><Input id="date" name="date" type="date" defaultValue={today} /></FormField>
                <FormField name="method" label="Método"><Select id="method" name="method" defaultValue="TRANSFERENCIA">{Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FormField>
                <FormField name="supplier" label="Proveedor"><Input id="supplier" name="supplier" /></FormField>
                <FormField name="reference" label="Referencia / factura"><Input id="reference" name="reference" /></FormField>
                <FormField name="serviceFolio" label="Folio de servicio"><Input id="serviceFolio" name="serviceFolio" placeholder="MM-2026-000001" /></FormField>
                <FormField name="vehicleId" label="Unidad"><Select id="vehicleId" name="vehicleId" defaultValue=""><option value="">—</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></FormField>
              </div>
              <Checkbox name="paid" defaultChecked label="Ya está pagado (si no, queda «por pagar»)" />
              <p className="text-xs text-neutral-500">«Sueldos fijos» es solo para sueldos que NO se manejan en el módulo de nómina (para no contarlos dos veces).</p>
              <DuplicateExpenseConfirm />
              <SubmitButton>Registrar gasto</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
