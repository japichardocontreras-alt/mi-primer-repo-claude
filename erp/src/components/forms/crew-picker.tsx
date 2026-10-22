"use client";
import { useMemo, useState } from "react";
import { Truck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type CrewWorker = { id: string; name: string; position: string; defaultPay: { CHOFER: number; AYUDANTE: number; OTRO: number } };
export type CrewVehicle = { id: string; name: string; available: boolean; note?: string };
type Role = "CHOFER" | "AYUDANTE" | "OTRO";
type Sel = { role: Role; pay: string };

/** Selección de unidades y cuadrilla (chofer, ayudantes) con pago por servicio editable. */
export function CrewPicker({ vehicles, workers, initial }: { vehicles: CrewVehicle[]; workers: CrewWorker[]; initial?: { vehicleIds: string[]; staff: { workerId: string; role: Role; agreedPay: number }[] } }) {
  const [vSel, setVSel] = useState<string[]>(initial?.vehicleIds ?? []);
  const [sel, setSel] = useState<Record<string, Sel>>(() =>
    Object.fromEntries((initial?.staff ?? []).map((s) => [s.workerId, { role: s.role, pay: String(s.agreedPay) }])),
  );
  const staffJson = useMemo(
    () => JSON.stringify(Object.entries(sel).map(([workerId, s]) => ({ workerId, role: s.role, agreedPay: Number(s.pay.replace(/[$,\s]/g, "")) || 0 }))),
    [sel],
  );
  const toggleWorker = (w: CrewWorker) =>
    setSel((cur) => {
      const n = { ...cur };
      if (n[w.id]) delete n[w.id];
      else {
        const role: Role = w.position === "CHOFER" ? "CHOFER" : w.position === "AYUDANTE" ? "AYUDANTE" : "OTRO";
        n[w.id] = { role, pay: String(w.defaultPay[role]) };
      }
      return n;
    });
  const choferes = Object.values(sel).filter((s) => s.role === "CHOFER").length;
  const ayudantes = Object.values(sel).filter((s) => s.role === "AYUDANTE").length;
  const total = Object.values(sel).reduce((a, s) => a + (Number(s.pay.replace(/[$,\s]/g, "")) || 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <input type="hidden" name="staffJson" value={staffJson} />
      <div className="lg:col-span-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600">Unidad</p>
        {vehicles.length === 0 && <p className="text-sm text-neutral-500">No hay unidades activas.</p>}
        <div className="space-y-1.5">
          {vehicles.map((v) => (
            <label key={v.id} className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm", vSel.includes(v.id) ? "border-brand-500 bg-brand-50" : "border-neutral-200 bg-white", !v.available && "opacity-60")}>
              <input type="checkbox" name="vehicleIds" value={v.id} checked={vSel.includes(v.id)} disabled={!v.available && !vSel.includes(v.id)}
                onChange={(e) => setVSel((c) => (e.target.checked ? [...c, v.id] : c.filter((x) => x !== v.id)))} className="h-4 w-4 accent-brand-600" />
              <Truck className="h-4 w-4 text-neutral-400" />
              <span className="flex-1">{v.name}</span>
              {v.note && <span className="text-xs text-neutral-500">{v.note}</span>}
            </label>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600">
          Personal <span className="ml-1 normal-case tracking-normal text-neutral-500">{choferes} chofer(es) · {ayudantes} ayudante(s) · pago total ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </p>
        {workers.length === 0 && <p className="text-sm text-neutral-500">No hay personal activo. Regístrelo en «Personal y nómina».</p>}
        <div className="space-y-1.5">
          {workers.map((w) => {
            const s = sel[w.id];
            return (
              <div key={w.id} className={cn("flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm", s ? "border-brand-500 bg-brand-50" : "border-neutral-200 bg-white")}>
                <label className="flex min-w-[180px] flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={!!s} onChange={() => toggleWorker(w)} className="h-4 w-4 accent-brand-600" aria-label={`Asignar a ${w.name}`} />
                  <UserRound className="h-4 w-4 text-neutral-400" />
                  <span>{w.name}</span>
                </label>
                {s && (
                  <>
                    <select value={s.role} onChange={(e) => setSel((c) => ({ ...c, [w.id]: { ...s, role: e.target.value as Role, pay: String(w.defaultPay[e.target.value as Role]) } }))}
                      className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs" aria-label={`Rol de ${w.name}`}>
                      <option value="CHOFER">Chofer</option><option value="AYUDANTE">Ayudante</option><option value="OTRO">Otro</option>
                    </select>
                    <span className="text-xs text-neutral-500">Pago $</span>
                    <input value={s.pay} onChange={(e) => setSel((c) => ({ ...c, [w.id]: { ...s, pay: e.target.value } }))} inputMode="decimal"
                      className="h-8 w-24 rounded-md border border-neutral-300 px-2 text-right text-xs tabular-nums" aria-label={`Pago de ${w.name}`} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
