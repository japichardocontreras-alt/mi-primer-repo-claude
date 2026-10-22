import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { PeriodType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { PERIOD, periodRange } from "@/lib/domain/payroll";
import { formatDateOnly, formatMXN, mexicoParts } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form-status";
import { SettleForm } from "@/components/forms/settle-form";
import { generateBaseAction, settleAction } from "../../nomina-actions";

export const metadata = { title: "Corte de nómina" };

export default async function Corte({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string; fecha?: string }> }) {
  await requirePermission("nomina.gestionar");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const w = await prisma.worker.findUnique({ where: { id } });
  if (!w) notFound();
  const defType: PeriodType = w.payType === "QUINCENAL" || w.payType === "MENSUAL" || w.payType === "SEMANAL" ? w.payType : "SEMANAL";
  const tipo = (sp.tipo && sp.tipo in PERIOD ? sp.tipo : defType) as PeriodType;
  const now = mexicoParts();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : `${now.year}-${pad(now.month)}-${pad(now.day)}`;
  const p = periodRange(tipo, fecha);
  const [entries, advances, baseDone] = await Promise.all([
    prisma.payrollEntry.findMany({ where: { workerId: id, status: "GENERADO" }, include: { service: true }, orderBy: { date: "asc" } }),
    prisma.payrollPayment.findMany({ where: { workerId: id, kind: "ANTICIPO", cancelledAt: null, appliedToId: null }, orderBy: { paidAt: "asc" } }),
    prisma.payrollEntry.findFirst({ where: { workerId: id, kind: "SUELDO_BASE", periodKey: p.key } }),
  ]);
  const canBase = Number(w.baseSalary) > 0 && (w.payType === tipo || w.payType === "MIXTO") && !baseDone;

  return (
    <>
      <Link href={`/personal/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> {w.fullName}</Link>
      <PageHeader title="Corte y pago de nómina" description={`${w.fullName} · ${p.label}. Se incluyen por defecto los conceptos del periodo y los pendientes de periodos anteriores.`} />
      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-3">
          <form className="flex flex-wrap items-center gap-2">
            <Select name="tipo" defaultValue={tipo} className="w-36" aria-label="Tipo de corte">{Object.entries(PERIOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <Input type="date" name="fecha" defaultValue={fecha} className="w-44" aria-label="Fecha del periodo" />
            <Button type="submit" variant="outline">Cambiar periodo</Button>
          </form>
          {canBase && (
            <ActionForm action={generateBaseAction.bind(null, id)}>
              <input type="hidden" name="periodType" value={tipo} /><input type="hidden" name="ref" value={fecha} />
              <SubmitButton variant="secondary" size="sm">Generar sueldo base ({formatMXN(w.baseSalary)})</SubmitButton>
            </ActionForm>
          )}
          {baseDone && <span className="text-xs text-neutral-500">Sueldo base del periodo ya generado.</span>}
        </CardBody>
      </Card>
      <SettleForm
        action={settleAction.bind(null, id)}
        period={{ type: tipo, ref: fecha }}
        nowLocal={`${now.year}-${pad(now.month)}-${pad(now.day)}T${pad(now.hour)}:${pad(now.minute)}`}
        entries={entries.map((e) => ({
          id: e.id, date: formatDateOnly(e.date), concept: e.service ? `${e.concept}` : e.concept, amount: Number(e.amount),
          tag: e.date < p.start ? "periodo anterior" : e.date >= p.end ? "periodo posterior" : undefined,
          checked: e.date < p.end,
        }))}
        advances={advances.map((a) => ({ id: a.id, date: formatDateOnly(a.paidAt), concept: `Anticipo ${a.folio}`, amount: Number(a.amount), checked: true }))}
      />
    </>
  );
}
