"use client";
/**
 * Gráficas del ERP (Recharts). Reglas de visualización:
 *  - Un solo eje Y (nunca doble eje); mismas unidades por gráfica.
 *  - Colores categóricos validados (paleta de referencia, slots 1-2) y rampa ordinal azul para el embudo;
 *    el rojo de marca no se usa para series (se reserva a la marca y al estado «crítico»).
 *  - Barras delgadas con extremos redondeados de 4 px, separación de 2 px, cuadrícula sólida tenue.
 *  - Leyenda cuando hay 2+ series; tooltip al pasar el cursor; textos en tinta neutra.
 */
import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const SERIES = ["#2a78d6", "#eb6834"] as const;
export const ORDINAL = ["#86b6ef", "#5598e7", "#256abf", "#184f95", "#0d366b"] as const;
const INK = { primary: "#171717", secondary: "#525252", muted: "#737373", grid: "#e7e5e4" };

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const mxnFull = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const int = new Intl.NumberFormat("es-MX");
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${mxn.format(v / 1000).replace(/\s?MXN/, "")}k` : mxn.format(v));

export type Fmt = "money" | "int";

/** El eje siempre incluye el cero (barras ancladas a la línea base, nunca «colgando»). */
const withZero: [(v: number) => number, (v: number) => number] = [(min) => Math.min(0, min), (max) => Math.max(0, max)];

/** Barra con extremo redondeado (4 px) en el lado del dato y recta en la línea base, también para negativos. */
function RoundedBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; value?: number | number[]; layout?: "horizontal" | "vertical" }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  const w = Math.abs(width), h = Math.abs(height);
  const left = width < 0 ? x + width : x, top = height < 0 ? y + height : y;
  if (!w || !h) return null;
  const r = Math.min(4, w / 2, h / 2);
  const raw = Array.isArray(props.value) ? props.value[1] - props.value[0] : Number(props.value ?? 0);
  const neg = raw < 0;
  let d: string;
  if (props.layout === "vertical") {
    // barras horizontales: extremo a la derecha (positivo) o a la izquierda (negativo)
    d = neg
      ? `M${left + w},${top} H${left + r} Q${left},${top} ${left},${top + r} V${top + h - r} Q${left},${top + h} ${left + r},${top + h} H${left + w} Z`
      : `M${left},${top} H${left + w - r} Q${left + w},${top} ${left + w},${top + r} V${top + h - r} Q${left + w},${top + h} ${left + w - r},${top + h} H${left} Z`;
  } else {
    d = neg
      ? `M${left},${top} H${left + w} V${top + h - r} Q${left + w},${top + h} ${left + w - r},${top + h} H${left + r} Q${left},${top + h} ${left},${top + h - r} Z`
      : `M${left},${top + h} V${top + r} Q${left},${top} ${left + r},${top} H${left + w - r} Q${left + w},${top} ${left + w},${top + r} V${top + h} Z`;
  }
  return <path d={d} fill={fill} />;
}

const legendText = (v: string) => <span style={{ color: "#525252" }}>{v}</span>;
const fmtAxis = (f: Fmt) => (v: number) => (f === "money" ? compact(v) : int.format(v));
const fmtTip = (f: Fmt) => (v: number) => (f === "money" ? mxnFull.format(v) : int.format(v));

function TooltipBox({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; fmt: Fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-neutral-900">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-neutral-700">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-medium tabular-nums text-neutral-900">{fmtTip(fmt)(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Barras verticales (una o dos series comparables, mismo eje). */
export function ColumnChart({ data, series, fmt = "money", height = 260 }: {
  data: Record<string, string | number>[]; series: { key: string; name: string; color?: string }[]; fmt?: Fmt; height?: number;
}) {
  const hasNeg = data.some((d) => series.some((s) => Number(d[s.key]) < 0));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={INK.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: INK.grid }} tick={{ fill: INK.secondary, fontSize: 11 }} />
        <YAxis tickFormatter={fmtAxis(fmt)} tickLine={false} axisLine={false} tick={{ fill: INK.muted, fontSize: 11 }} width={fmt === "money" ? 56 : 32} allowDecimals={false} domain={withZero} />
        {hasNeg && <ReferenceLine y={0} stroke={INK.secondary} />}
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<TooltipBox fmt={fmt} />} />
        {series.length > 1 && <Legend iconType="square" iconSize={10} formatter={legendText} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color ?? SERIES[i]} shape={(p: object) => <RoundedBar {...p} layout="horizontal" />} maxBarSize={28} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontales (categorías con nombre largo: unidades, categorías de gasto, etapas). */
export function BarList({ data, series, fmt = "money", ordinal = false }: {
  data: Record<string, string | number>[]; series: { key: string; name: string; color?: string }[]; fmt?: Fmt; ordinal?: boolean;
}) {
  const height = Math.max(120, data.length * (series.length > 1 ? 44 : 32) + 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid horizontal={false} stroke={INK.grid} />
        <XAxis type="number" tickFormatter={fmtAxis(fmt)} tickLine={false} axisLine={false} tick={{ fill: INK.muted, fontSize: 11 }} allowDecimals={false} domain={withZero} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={{ stroke: INK.grid }} tick={{ fill: INK.secondary, fontSize: 11 }} width={130} />
        <ReferenceLine x={0} stroke={INK.secondary} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<TooltipBox fmt={fmt} />} />
        {series.length > 1 && <Legend iconType="square" iconSize={10} formatter={legendText} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color ?? SERIES[i]} shape={(p: object) => <RoundedBar {...p} layout="vertical" />} maxBarSize={20} isAnimationActive={false}>
            {ordinal && data.map((_, j) => <Cell key={j} fill={ORDINAL[Math.min(j, ORDINAL.length - 1)]} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
