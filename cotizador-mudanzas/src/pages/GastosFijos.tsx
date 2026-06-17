import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { GASTOS_FIJOS_LABELS } from '../constants'
import { NumberField, SectionTitle, Stat } from '../components/UI'
import { money, num } from '../lib/format'
import type { Config } from '../types'

export function GastosFijos() {
  const { config, setConfig, cotizaciones } = useApp()

  const totalFijos = useMemo(
    () => Object.values(config.gastosFijos).reduce((a, b) => a + (b || 0), 0),
    [config.gastosFijos],
  )

  const meta = config.metaServiciosMensuales || 1
  const metaDiaria = totalFijos / 30
  const metaSemanal = totalFijos / 4.33
  const utilidadPorServicio = totalFijos / meta

  // Utilidad esperada del mes en curso (cotizaciones aceptadas/realizadas)
  const ahora = new Date()
  const utilidadMes = useMemo(
    () =>
      cotizaciones
        .filter((c) => {
          const f = new Date(c.fecha)
          return (
            f.getMonth() === ahora.getMonth() &&
            f.getFullYear() === ahora.getFullYear() &&
            (c.estado === 'aceptada' || c.estado === 'realizada')
          )
        })
        .reduce((a, c) => a + c.utilidadEsperada, 0),
    [cotizaciones],
  )

  const cobertura = totalFijos > 0 ? utilidadMes / totalFijos : 0
  const faltante = Math.max(0, totalFijos - utilidadMes)

  const setGasto = (key: keyof Config['gastosFijos'], value: number) =>
    setConfig({ ...config, gastosFijos: { ...config.gastosFijos, [key]: value } })

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <SectionTitle hint="Captura tus gastos fijos mensuales del negocio.">Gastos fijos mensuales</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {GASTOS_FIJOS_LABELS.map(({ key, label }) => (
            <NumberField key={key} label={label} value={config.gastosFijos[key]} onChange={(v) => setGasto(key, v)} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-900 p-4 text-white">
          <span className="text-sm font-semibold">Total gastos fijos / mes</span>
          <span className="text-2xl font-extrabold">{money(totalFijos)}</span>
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle hint="¿Cuántos servicios planeas cerrar al mes?">Meta de servicios mensuales</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {[20, 30, 50, 100].map((n) => (
            <button
              key={n}
              onClick={() => setConfig({ ...config, metaServiciosMensuales: n })}
              className={`rounded-xl py-3 text-sm font-bold transition ${
                meta === n ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-3 max-w-[200px]">
          <NumberField
            label="O captura otra meta"
            prefix=""
            suffix="serv."
            value={config.metaServiciosMensuales}
            onChange={(v) => setConfig({ ...config, metaServiciosMensuales: v })}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Lo que necesitas generar</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Meta mínima mensual" value={money(totalFijos)} sub="Para cubrir gastos fijos" accent="text-brand-700" />
          <Stat label="Utilidad por servicio" value={money(utilidadPorServicio)} sub={`Con ${num(meta)} servicios/mes`} accent="text-emerald-600" />
          <Stat label="Meta diaria" value={money(metaDiaria)} sub="Gastos ÷ 30 días" />
          <Stat label="Meta semanal" value={money(metaSemanal)} sub="Gastos ÷ 4.33 semanas" />
        </div>
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
          Necesitas <strong>{num(meta)} servicios</strong> que dejen al menos{' '}
          <strong className="text-emerald-700">{money(utilidadPorServicio)}</strong> de utilidad cada uno para cubrir tus gastos fijos.
        </p>
      </div>

      <div className="card p-4">
        <SectionTitle hint="Mes en curso · cotizaciones aceptadas y realizadas.">Avance del mes vs gastos fijos</SectionTitle>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Utilidad acumulada</p>
            <p className="text-2xl font-extrabold text-emerald-600">{money(utilidadMes)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cobertura</p>
            <p className={`text-2xl font-extrabold ${cobertura >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {(cobertura * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${cobertura >= 1 ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, cobertura * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {cobertura >= 1
            ? '✅ Ya cubriste tus gastos fijos este mes. Todo lo demás es utilidad real.'
            : `Te faltan ${money(faltante)} de utilidad para cubrir tus gastos fijos del mes.`}
        </p>
      </div>
    </div>
  )
}
