"use client";
import { useMemo, useState } from "react";
import { FormField } from "../ui/action-form";
import { Input } from "../ui/form";

const dayMx = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(d);
const fmt = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/** Fecha, hora, duración y márgenes; muestra el fin estimado y el periodo en que la unidad queda ocupada. */
export function ScheduleFields({ d }: { d: { date?: string; time?: string; durationHours?: number; prepMinutes: number; returnMinutes: number } }) {
  const [date, setDate] = useState(d.date ?? "");
  const [time, setTime] = useState(d.time ?? "");
  const [dur, setDur] = useState(String(d.durationHours ?? 4));
  const [prep, setPrep] = useState(String(d.prepMinutes));
  const [ret, setRet] = useState(String(d.returnMinutes));

  const info = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !(Number(dur) > 0)) return null;
    // México no tiene horario de verano desde 2022: UTC−6.
    const start = new Date(`${date}T${time}:00-06:00`);
    const end = new Date(start.getTime() + Number(dur) * 3600_000);
    return { end, busyFrom: new Date(start.getTime() - Number(prep || 0) * 60_000), busyTo: new Date(end.getTime() + Number(ret || 0) * 60_000), nextDay: dayMx(end) !== dayMx(start) };
  }, [date, time, dur, prep, ret]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-5">
        <FormField name="date" label="Fecha" required><Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
        <FormField name="time" label="Hora de inicio" required><Input id="time" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></FormField>
        <FormField name="durationHours" label="Duración estimada (h)" required><Input id="durationHours" name="durationHours" type="number" step="0.5" min={0.5} value={dur} onChange={(e) => setDur(e.target.value)} /></FormField>
        <FormField name="prepMinutes" label="Preparación (min)"><Input id="prepMinutes" name="prepMinutes" type="number" min={0} value={prep} onChange={(e) => setPrep(e.target.value)} /></FormField>
        <FormField name="returnMinutes" label="Regreso a base (min)"><Input id="returnMinutes" name="returnMinutes" type="number" min={0} value={ret} onChange={(e) => setRet(e.target.value)} /></FormField>
      </div>
      {info && (
        <p className="mt-2 text-xs text-neutral-600">
          Fin estimado: <b>{fmt(info.end)}</b>{info.nextDay && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">continúa otro día</span>} · Unidad y personal ocupados de {fmt(info.busyFrom)} a {fmt(info.busyTo)}.
        </p>
      )}
    </div>
  );
}
