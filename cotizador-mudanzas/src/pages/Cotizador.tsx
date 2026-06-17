import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { COTIZACION_INPUT_DEFAULT } from '../constants'
import { TIPOS_SERVICIO, type CotizacionInput, type Modo, type Cotizacion } from '../types'
import { NumberField, SectionTitle, SelectField, TextField } from '../components/UI'
import { ResultadoCotizacion } from '../components/ResultadoCotizacion'
import { calcular, utilidadDe } from '../lib/calculations'
import { generarFolio } from '../lib/storage'

export function Cotizador() {
  const { config, cotizaciones, agregarCotizacion } = useApp()
  const [input, setInput] = useState<CotizacionInput>(COTIZACION_INPUT_DEFAULT)
  const [modo, setModo] = useState<Modo>('empresa')
  const [calculado, setCalculado] = useState(false)

  const unidad = useMemo(
    () => config.unidades.find((u) => u.id === input.unidadId) ?? config.unidades[0],
    [config.unidades, input.unidadId],
  )

  const set = <K extends keyof CotizacionInput>(key: K, value: CotizacionInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }))
    setCalculado(false)
  }

  const unidadOptions = config.unidades.map((u) => ({ id: u.id, nombre: `${u.nombre} ($${u.costoKm}/km)` }))

  const guardar = (precioEnviado: number) => {
    const res = calcular(input, unidad)
    const { utilidad } = utilidadDe(precioEnviado, res.costoTotal)
    const cot: Cotizacion = {
      ...input,
      folio: generarFolio(cotizaciones),
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      costoCamioneta: res.costoCamioneta,
      extras: res.extras,
      costoTotal: res.costoTotal,
      precioEnviado,
      utilidadEsperada: utilidad,
    }
    agregarCotizacion(cot)
  }

  const limpiar = () => {
    setInput(COTIZACION_INPUT_DEFAULT)
    setCalculado(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5">
      {/* Selector de modo */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200">
        <button
          onClick={() => setModo('supervivencia')}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${
            modo === 'supervivencia' ? 'bg-brand-900 text-white shadow' : 'text-slate-500'
          }`}
        >
          🛟 Supervivencia
        </button>
        <button
          onClick={() => setModo('empresa')}
          className={`rounded-xl py-2.5 text-sm font-bold transition ${
            modo === 'empresa' ? 'bg-brand-900 text-white shadow' : 'text-slate-500'
          }`}
        >
          🏢 Empresa
        </button>
      </div>

      {/* Datos del cliente */}
      <div className="card p-4">
        <SectionTitle>Datos del servicio</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Cliente" value={input.cliente} onChange={(v) => set('cliente', v)} placeholder="Nombre" />
          <TextField label="Teléfono" value={input.telefono} onChange={(v) => set('telefono', v)} placeholder="10 dígitos" type="tel" />
          <TextField label="Origen" value={input.origen} onChange={(v) => set('origen', v)} placeholder="Dirección / colonia" />
          <TextField label="Destino" value={input.destino} onChange={(v) => set('destino', v)} placeholder="Dirección / colonia" />
          <SelectField label="Tipo de servicio" value={input.tipoServicio} onChange={(v) => set('tipoServicio', v)} options={TIPOS_SERVICIO} />
          <SelectField label="Unidad" value={input.unidadId} onChange={(v) => set('unidadId', v)} options={unidadOptions} />
        </div>
        <div className="mt-3">
          <NumberField label="Kilómetros totales (base a base)" value={input.km} onChange={(v) => set('km', v)} prefix="" suffix="km" placeholder="Ej. 40" />
        </div>
      </div>

      {/* Extras y variables */}
      <div className="card p-4">
        <SectionTitle hint="Captura solo lo que aplique. Todo suma a tus extras.">Personal y gastos variables</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Chofer" value={input.chofer} onChange={(v) => set('chofer', v)} />
          <NumberField label="Ayudante 1" value={input.ayudante1} onChange={(v) => set('ayudante1', v)} />
          <NumberField label="Ayudante 2" value={input.ayudante2} onChange={(v) => set('ayudante2', v)} />
          <NumberField label="Ayudante 3" value={input.ayudante3} onChange={(v) => set('ayudante3', v)} />
          <NumberField label="Casetas" value={input.casetas} onChange={(v) => set('casetas', v)} />
          <NumberField label="Comidas" value={input.comidas} onChange={(v) => set('comidas', v)} />
          <NumberField label="Hospedaje" value={input.hospedaje} onChange={(v) => set('hospedaje', v)} />
          <NumberField label="Materiales" value={input.materiales} onChange={(v) => set('materiales', v)} />
          <NumberField label="Maniobras" value={input.maniobras} onChange={(v) => set('maniobras', v)} />
          <NumberField label="Publicidad prop." value={input.publicidad} onChange={(v) => set('publicidad', v)} />
          <NumberField label="Otros gastos" value={input.otros} onChange={(v) => set('otros', v)} />
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={input.rentaChoferActiva}
            onChange={(e) => set('rentaChoferActiva', e.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-700">
            Incluir opción de renta de unidad con chofer
            <span className="block text-xs font-normal text-slate-500">El cliente realiza carga y descarga (excluye maniobras)</span>
          </span>
        </label>

        <div className="mt-3">
          <label className="block">
            <span className="field-label">Notas del servicio</span>
            <textarea
              className="field-input min-h-[70px] resize-y"
              value={input.notas}
              onChange={(e) => set('notas', e.target.value)}
              placeholder="Detalles, condiciones, accesos, pisos, etc."
            />
          </label>
        </div>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={limpiar} className="btn-ghost col-span-1">Limpiar</button>
        <button
          onClick={() => {
            setCalculado(true)
            setTimeout(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' }), 80)
          }}
          disabled={input.km <= 0}
          className="btn-primary col-span-2 py-3 text-base disabled:opacity-40"
        >
          Calcular cotización
        </button>
      </div>
      {input.km <= 0 && <p className="text-center text-xs text-slate-400 -mt-2">Captura los kilómetros para calcular.</p>}

      {/* Resultado */}
      {calculado && input.km > 0 && (
        <div id="resultado" className="pt-1">
          <ResultadoCotizacion input={input} unidad={unidad} config={config} modo={modo} onGuardar={guardar} />
        </div>
      )}
    </div>
  )
}
