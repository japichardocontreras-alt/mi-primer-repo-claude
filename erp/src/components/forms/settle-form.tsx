"use client";
import { useMemo, useState } from "react";
import { ActionForm, FormField } from "../ui/action-form";
import { Input, Select } from "../ui/form";
import { SubmitButton } from "../ui/form-status";
import type { ActionState } from "@/lib/action-state";

type Line = { id: string; date: string; concept: string; amount: number; tag?: string; checked: boolean };
const mxn = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/** Corte: selección de conceptos y anticipos, total bruto, descuentos y neto a pagar. */
export function SettleForm({ action, entries, advances, period, nowLocal }: {
  action: (p: ActionState, fd: FormData) => Promise<ActionState>; entries: Line[]; advances: Line[]; period?: { type: string; ref: string }; nowLocal: string;
}) {
  const [selE, setSelE] = useState(() => new Set(entries.filter((e) => e.checked).map((e) => e.id)));
  const [selA, setSelA] = useState(() => new Set(advances.filter((e) => e.checked).map((e) => e.id)));
  const gross = useMemo(() => entries.filter((e) => selE.has(e.id)).reduce((a, e) => a + e.amount, 0), [entries, selE]);
  const adv = useMemo(() => advances.filter((e) => selA.has(e.id)).reduce((a, e) => a + e.amount, 0), [advances, selA]);
  const net = Math.round((gross - adv) * 100) / 100;
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id); else n.add(id);
    setter(n);
  };
  const Row = ({ l, checked, onToggle, name, negative }: { l: Line; checked: boolean; onToggle: () => void; name: string; negative?: boolean }) => (
    <label className="flex cursor-pointer items-center gap-3 border-b border-neutral-100 px-5 py-2 text-sm last:border-0 hover:bg-neutral-50">
      <input type="checkbox" name={name} value={l.id} checked={checked} onChange={onToggle} className="h-4 w-4 accent-brand-600" />
      <span className="w-24 shrink-0 text-xs text-neutral-500">{l.date}</span>
      <span className="flex-1">{l.concept}{l.tag && <span className="ml-2 rounded bg-amber-100 px-1.5 text-[11px] text-amber-800">{l.tag}</span>}</span>
      <span className={`tabular-nums ${negative || l.amount < 0 ? "text-red-700" : ""}`}>{negative ? `− ${mxn(l.amount)}` : mxn(l.amount)}</span>
    </label>
  );
  return (
    <ActionForm action={action} messagePosition="top">
      {period && <><input type="hidden" name="periodType" value={period.type} /><input type="hidden" name="ref" value={period.ref} /></>}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <p className="border-b border-neutral-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Conceptos por pagar</p>
        {entries.length === 0 ? <p className="px-5 py-4 text-sm text-neutral-500">No hay conceptos pendientes.</p> :
          entries.map((l) => <Row key={l.id} l={l} name="entry" checked={selE.has(l.id)} onToggle={() => toggle(selE, setSelE, l.id)} />)}
        {advances.length > 0 && (
          <>
            <p className="border-y border-neutral-100 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Anticipos a descontar</p>
            {advances.map((l) => <Row key={l.id} l={l} name="advance" negative checked={selA.has(l.id)} onToggle={() => toggle(selA, setSelA, l.id)} />)}
          </>
        )}
        <div className="grid grid-cols-3 gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 text-sm">
          <div><p className="text-xs text-neutral-500">Total devengado</p><p className="font-semibold tabular-nums">{mxn(gross)}</p></div>
          <div><p className="text-xs text-neutral-500">Anticipos</p><p className="font-semibold tabular-nums">− {mxn(adv)}</p></div>
          <div><p className="text-xs text-neutral-500">Neto a pagar</p><p className={`text-lg font-bold tabular-nums ${net < 0 ? "text-red-700" : "text-brand-700"}`}>{mxn(net)}</p></div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <FormField name="paidAt" label="Fecha de pago"><Input id="paidAt" name="paidAt" type="datetime-local" defaultValue={nowLocal} /></FormField>
        <FormField name="method" label="Método"><Select id="method" name="method" defaultValue="EFECTIVO"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="DEPOSITO">Depósito</option><option value="CHEQUE">Cheque</option><option value="OTRO">Otro</option></Select></FormField>
        <FormField name="reference" label="Referencia" className="sm:col-span-2"><Input id="reference" name="reference" /></FormField>
      </div>
      <div className="mt-4"><SubmitButton confirmText={`¿Registrar el pago de ${mxn(net)}?`} pendingText="Registrando…">Registrar pago del corte</SubmitButton></div>
    </ActionForm>
  );
}
