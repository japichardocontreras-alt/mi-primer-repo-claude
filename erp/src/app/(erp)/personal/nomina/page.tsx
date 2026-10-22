import Link from "next/link";
import { Download } from "lucide-react";
import type { PeriodType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { PERIOD } from "@/lib/domain/payroll";
import { payrollSummary } from "@/lib/queries/payroll";
import { formatMXN, mexicoParts } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/form";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonalTabs } from "../tabs";

export const metadata = { title: "Nómina y cortes" };

export default async function Nomina({ searchParams }: { searchParams: Promise<{ tipo?: string; fecha?: string }> }) {
  const user = await requirePermission("nomina.ver");
  const sp = await searchParams;
  const tipo = (sp.tipo && sp.tipo in PERIOD ? sp.tipo : "SEMANAL") as PeriodType;
  const p = mexicoParts();
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const { period, rows } = await payrollSummary(prisma, tipo, fecha);
  const sum = (k: "devengado" | "pagado" | "saldo" | "porServicio" | "otros" | "deducciones") => rows.reduce((a, r) => a + r[k], 0);
  return (
    <>
      <PageHeader
        title="Personal y nómina"
        actions={can(user, "exportar") ? <a href={`/api/exportar/nomina?tipo=${tipo}&fecha=${fecha}`} className={buttonClass("outline")}><Download className="h-4 w-4" /> Excel</a> : undefined}
      />
      <PersonalTabs active="nomina" showPayroll showRates={can(user, "nomina.gestionar")} />
      <Card className="mb-6">
        <form className="flex flex-wrap items-center gap-2 px-5 py-4">
          <Select name="tipo" defaultValue={tipo} className="w-40" aria-label="Tipo de corte">{Object.entries(PERIOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Input type="date" name="fecha" defaultValue={fecha} className="w-44" aria-label="Fecha dentro del periodo" />
          <Button type="submit" variant="secondary">Ver periodo</Button>
          <span className="text-sm text-neutral-600">{period.label}</span>
        </form>
      </Card>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Devengado en el periodo" value={formatMXN(sum("devengado"))} hint={`Servicios ${formatMXN(sum("porServicio"))} · otros ${formatMXN(sum("otros"))} · deducciones ${formatMXN(sum("deducciones"))}`} />
        <Stat label="Pagado en el periodo" value={formatMXN(sum("pagado"))} hint="Efectivo entregado (pagos y anticipos)" />
        <Stat label="Saldo pendiente total" value={formatMXN(sum("saldo"))} tone={sum("saldo") > 0 ? "warn" : "neutral"} hint="Por pagar menos anticipos aún no descontados (todas las fechas)" />
        <Stat label="Colaboradores" value={rows.length} />
      </div>
      <Card>
        <CardHeader title={period.label} description="Devengado: lo generado en el periodo. Pagado: lo entregado en el periodo. Saldo: lo pendiente a la fecha." />
        {rows.length === 0 ? <EmptyState title="Sin colaboradores" /> : (
          <Table>
            <thead><tr><Th>Colaborador</Th><Th className="text-center">Servicios</Th><Th className="text-right">Por servicio</Th><Th className="text-right">Sueldo/bonos/extras</Th><Th className="text-right">Deducciones</Th><Th className="text-right">Devengado</Th><Th className="text-right">Pagado</Th><Th className="text-right">Saldo pendiente</Th><Th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.w.id}>
                  <Td><Link href={`/personal/${r.w.id}`} className="font-medium hover:text-brand-600">{r.w.fullName}</Link><span className="block text-xs text-neutral-500">{r.w.code}{!r.w.active ? " · inactivo" : ""}</span></Td>
                  <Td className="text-center tabular-nums">{r.servicios}</Td>
                  <Td className="text-right tabular-nums">{formatMXN(r.porServicio)}</Td>
                  <Td className="text-right tabular-nums">{formatMXN(r.otros)}</Td>
                  <Td className="text-right tabular-nums">{formatMXN(r.deducciones)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatMXN(r.devengado)}</Td>
                  <Td className="text-right tabular-nums">{formatMXN(r.pagado)}</Td>
                  <Td className={`text-right font-semibold tabular-nums ${r.saldo > 0 ? "text-brand-700" : ""}`}>{formatMXN(r.saldo)}</Td>
                  <Td>{can(user, "nomina.gestionar") && <Link href={`/personal/${r.w.id}/corte?tipo=${tipo}&fecha=${fecha}`} className={buttonClass("outline", "sm")}>Corte</Link>}</Td>
                </Tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-neutral-50 font-semibold"><Td>Totales</Td><Td /><Td className="text-right tabular-nums">{formatMXN(sum("porServicio"))}</Td><Td className="text-right tabular-nums">{formatMXN(sum("otros"))}</Td><Td className="text-right tabular-nums">{formatMXN(sum("deducciones"))}</Td><Td className="text-right tabular-nums">{formatMXN(sum("devengado"))}</Td><Td className="text-right tabular-nums">{formatMXN(sum("pagado"))}</Td><Td className="text-right tabular-nums">{formatMXN(sum("saldo"))}</Td><Td /></tr></tfoot>
          </Table>
        )}
      </Card>
    </>
  );
}
