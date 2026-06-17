import { useMemo, useState } from 'react'
import type { Config, CotizacionInput, Modo, Unidad } from '../types'
import { calcular, distribucion, nivelUtilidad, proyeccion, utilidadDe } from '../lib/calculations'
import { generarOpciones, generarTextoWhatsApp } from '../lib/whatsapp'
import { money, num, pct } from '../lib/format'
import { IconCheck, IconCopy, IconSave, IconWhatsApp } from './Icons'
import { SectionTitle } from './UI'

export function ResultadoCotizacion({
  input,
  unidad,
  config,
  modo,
  onGuardar,
}: {
  input: CotizacionInput
  unidad: Unidad
  config: Config
  modo: Modo
  onGuardar: (precioEnviado: number) => void
}) {
  const res = useMemo(() => calcular(input, unidad), [input, unidad])
  const opciones = useMemo(() => generarOpciones(input, config), [input, config])
  const texto = useMemo(() => generarTextoWhatsApp(input, config), [input, config])

  // Precio base de referencia según el modo
  const precioRef = modo === 'supervivencia' ? res.precioAceptable : res.precioObjetivo
  const [precioEnviado, setPrecioEnviado] = useState<number>(Math.round(precioRef / 100) * 100)

  const { utilidad, utilidadPct } = utilidadDe(precioEnviado, res.costoTotal)
  const nivel = nivelUtilidad(utilidadPct)
  const dist = distribucion(precioEnviado, res.costoCamioneta, res.extras)
  const proy = proyeccion(utilidad, input.km, unidad.vidaUtilKm)

  const [copiado, setCopiado] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = texto
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const abrirWhatsApp = () => {
    const tel = input.telefono.replace(/\D/g, '')
    const base = tel ? `https://wa.me/52${tel}` : 'https://wa.me/'
    window.open(`${base}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const guardar = () => {
    onGuardar(precioEnviado)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  // Tarjetas resumen
  const cards = [
    { label: 'Costo camioneta', value: money(res.costoCamioneta), tone: 'text-slate-900', sub: `${num(input.km)} km × $${unidad.costoKm}/km` },
    { label: 'Extras / variables', value: money(res.extras), tone: 'text-slate-900' },
    { label: 'Costo total', value: money(res.costoTotal), tone: 'text-brand-700', sub: 'Tu costo real' },
  ]

  // Escenarios visibles según modo
  const escenariosVisibles =
    modo === 'supervivencia'
      ? res.escenarios.filter((e) => ['minimo', 'aceptable', 'objetivo'].includes(e.key))
      : res.escenarios.filter((e) => ['objetivo', 'muyBueno', 'excelente'].includes(e.key))

  return (
    <div className="space-y-5">
      {/* Resumen de costos */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">{c.label}</p>
            <p className={`mt-1 text-base font-extrabold leading-tight ${c.tone}`}>{c.value}</p>
            {c.sub && <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Escenarios de precio */}
      <div>
        <SectionTitle hint={modo === 'supervivencia' ? 'Foco en no perder dinero y cerrar.' : 'Foco en utilidad sana y crecimiento.'}>
          Escenarios de precio
        </SectionTitle>
        <div className="space-y-2">
          {escenariosVisibles.map((e) => {
            const niv = nivelUtilidad(e.utilidadPct)
            const seleccion = Math.round(e.precio / 100) * 100 === precioEnviado
            return (
              <button
                key={e.key}
                onClick={() => setPrecioEnviado(Math.round(e.precio / 100) * 100)}
                className={`w-full text-left rounded-xl border ${niv.border} ${niv.bg} p-3 transition ${
                  seleccion ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${niv.dot}`} />
                    <span className="text-sm font-semibold text-slate-700">{e.nombre}</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900">{money(e.precio)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className={`font-semibold ${niv.text}`}>{niv.label}</span>
                  <span className="text-slate-500">
                    Utilidad {money(e.utilidad)} · {pct(e.utilidadPct)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Fórmula ideal */}
        <div className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <div>
            <p className="text-xs font-semibold text-slate-600">Fórmula ideal (costo × 2)</p>
            <p className="text-[11px] text-slate-400">Referencia rápida de venta</p>
          </div>
          <span className="text-lg font-extrabold text-slate-900">{money(res.formulaIdeal)}</span>
        </div>
      </div>

      {/* Precio a enviar + semáforo */}
      <div className={`card p-4 border-2 ${nivel.border}`}>
        <SectionTitle hint="Ajusta el precio final que enviarás al cliente.">Precio a enviar</SectionTitle>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            className="field-input pl-8 text-2xl font-extrabold"
            value={precioEnviado === 0 ? '' : precioEnviado}
            onChange={(e) => setPrecioEnviado(e.target.value === '' ? 0 : Number(e.target.value))}
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div className={`mt-3 rounded-xl ${nivel.bg} ${nivel.text} p-3`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{nivel.label}</span>
            <span className="text-sm font-bold">
              {money(utilidad)} · {pct(utilidadPct)}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-90">{nivel.recomendacion}</p>
        </div>

        {modo === 'supervivencia' && utilidadPct < 0.2 && (
          <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-semibold text-rose-700">
            ⚠️ Este servicio deja menos de 20%. Solo ciérralo si urge llenar agenda.
          </div>
        )}

        {/* Distribución */}
        <div className="mt-4">
          <p className="field-label">Distribución del precio</p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-brand-700" style={{ width: `${dist.camioneta}%` }} />
            <div className="bg-amber-400" style={{ width: `${dist.extras}%` }} />
            <div className="bg-emerald-500" style={{ width: `${dist.utilidad}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span><span className="inline-block h-2 w-2 rounded-full bg-brand-700 mr-1" />Camioneta {pct(dist.camioneta / 100)}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" />Extras {pct(dist.extras / 100)}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />Utilidad {pct(dist.utilidad / 100)}</span>
          </div>
        </div>
      </div>

      {/* Proyección largo plazo (sobre todo en modo empresa) */}
      <div className="card p-4">
        <SectionTitle hint={`Si la ${unidad.nombre} trabajara ${num(unidad.vidaUtilKm)} km con esta utilidad por km.`}>
          Proyección a largo plazo
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <ProyItem label="Utilidad por km" value={money(proy.utilidadPorKm)} />
          <ProyItem label={`Proyectada a ${num(unidad.vidaUtilKm)} km`} value={money(proy.proyeccion300k)} accent="text-emerald-600" />
          <ProyItem label="Equivale mensual (4 años)" value={money(proy.mensual4anios)} />
          <ProyItem label="Equivale mensual (5 años)" value={money(proy.mensual5anios)} />
        </div>
      </div>

      {/* Opciones WhatsApp */}
      <div className="card p-4">
        <SectionTitle hint="Listas para enviar al cliente.">Opciones para el cliente</SectionTitle>
        <div className="space-y-2">
          {opciones.map((op, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{`Opción ${i + 1} — ${op.titulo}`}</p>
                <p className="text-xs text-slate-500">{op.descripcion}</p>
              </div>
              <span className="whitespace-nowrap text-base font-extrabold text-brand-700">{money(op.precio)}</span>
            </div>
          ))}
        </div>

        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
{texto}
        </pre>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={copiar} className="btn-ghost">
            {copiado ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
            {copiado ? 'Copiado' : 'Copiar texto'}
          </button>
          <button onClick={abrirWhatsApp} className="btn bg-emerald-600 text-white hover:bg-emerald-700">
            <IconWhatsApp width={16} height={16} />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Guardar */}
      <button onClick={guardar} className="btn-dark w-full py-3 text-base">
        {guardado ? <IconCheck width={18} height={18} /> : <IconSave width={18} height={18} />}
        {guardado ? 'Cotización guardada' : 'Guardar cotización'}
      </button>
    </div>
  )
}

function ProyItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">{label}</p>
      <p className={`mt-1 text-base font-extrabold ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
