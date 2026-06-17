import { useApp } from '../context/AppContext'
import { CONFIG_DEFAULT } from '../constants'
import { NumberField, SectionTitle, TextField } from '../components/UI'
import { money, num } from '../lib/format'
import type { Unidad } from '../types'

export function Configuracion() {
  const { config, setConfig } = useApp()

  const setUnidad = (id: string, cambios: Partial<Unidad>) =>
    setConfig({
      ...config,
      unidades: config.unidades.map((u) => (u.id === id ? { ...u, ...cambios } : u)),
    })

  const restaurarFlota = () => {
    if (confirm('¿Restaurar la flota y costos por km a los valores oficiales?')) {
      setConfig({ ...config, unidades: CONFIG_DEFAULT.unidades })
    }
  }

  return (
    <div className="space-y-5">
      {/* Empresa */}
      <div className="card p-4">
        <SectionTitle>Datos de la empresa</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Nombre" value={config.empresa.nombre} onChange={(v) => setConfig({ ...config, empresa: { ...config.empresa, nombre: v } })} />
          <TextField label="Teléfono de contacto" value={config.empresa.telefono} onChange={(v) => setConfig({ ...config, empresa: { ...config.empresa, telefono: v } })} placeholder="Aparece en WhatsApp" />
        </div>
      </div>

      {/* Flota */}
      <div className="card p-4">
        <SectionTitle hint="El costo por km es la base sagrada del cálculo. Edítalo solo si cambian tus costos reales.">
          Flota y costos por km
        </SectionTitle>
        <div className="space-y-4">
          {config.unidades.map((u) => {
            const depreciacionKm = (u.valorCompra - u.valorResidual) / (u.vidaUtilKm || 1)
            return (
              <div key={u.id} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{u.nombre}</h3>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">${u.costoKm}/km</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Costo por km" value={u.costoKm} onChange={(v) => setUnidad(u.id, { costoKm: v })} />
                  <NumberField label="Valor de compra" value={u.valorCompra} onChange={(v) => setUnidad(u.id, { valorCompra: v })} />
                  <NumberField label="Valor residual" value={u.valorResidual} onChange={(v) => setUnidad(u.id, { valorResidual: v })} />
                  <NumberField label="Vida útil" prefix="" suffix="km" value={u.vidaUtilKm} onChange={(v) => setUnidad(u.id, { vidaUtilKm: v })} />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Depreciación implícita: <strong>{money(depreciacionKm)}/km</strong> · Vida útil {num(u.vidaUtilKm)} km
                </p>
              </div>
            )
          })}
        </div>
        <button onClick={restaurarFlota} className="btn-ghost mt-3 w-full">Restaurar valores oficiales</button>
      </div>

      {/* Modelo financiero */}
      <div className="card p-4">
        <SectionTitle hint="Estructura ideal del negocio (referencia).">Modelo financiero ideal</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Camioneta %" prefix="" suffix="%" value={config.modeloFinanciero.camioneta} onChange={(v) => setConfig({ ...config, modeloFinanciero: { ...config.modeloFinanciero, camioneta: v } })} />
          <NumberField label="Operación %" prefix="" suffix="%" value={config.modeloFinanciero.operacion} onChange={(v) => setConfig({ ...config, modeloFinanciero: { ...config.modeloFinanciero, operacion: v } })} />
          <NumberField label="Utilidad %" prefix="" suffix="%" value={config.modeloFinanciero.utilidad} onChange={(v) => setConfig({ ...config, modeloFinanciero: { ...config.modeloFinanciero, utilidad: v } })} />
        </div>
      </div>

      {/* Recargos de opciones */}
      <div className="card p-4">
        <SectionTitle hint="Recargo sobre la opción básica para generar Intermedia y Premium.">Recargos de opciones (WhatsApp)</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Intermedia +%"
            prefix=""
            suffix="%"
            value={Math.round(config.intermedioPct * 100)}
            onChange={(v) => setConfig({ ...config, intermedioPct: v / 100 })}
          />
          <NumberField
            label="Premium +%"
            prefix=""
            suffix="%"
            value={Math.round(config.premiumPct * 100)}
            onChange={(v) => setConfig({ ...config, premiumPct: v / 100 })}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Básica = precio objetivo (30%). Intermedia = básica +{Math.round(config.intermedioPct * 100)}%. Premium = básica +{Math.round(config.premiumPct * 100)}%.
        </p>
      </div>

      <p className="px-2 text-center text-xs text-slate-400">
        Todos los datos se guardan localmente en este dispositivo (LocalStorage).
      </p>
    </div>
  )
}
