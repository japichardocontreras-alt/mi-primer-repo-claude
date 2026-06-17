import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { ESTADOS, type EstadoCotizacion } from '../types'
import { fechaCorta, money, num, pct } from '../lib/format'
import { IconTrash } from '../components/Icons'
import { SectionTitle } from '../components/UI'

export function Historial() {
  const { cotizaciones, actualizarCotizacion, eliminarCotizacion } = useApp()
  const [q, setQ] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoCotizacion | 'todos'>('todos')

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase()
    return cotizaciones.filter((c) => {
      if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
      if (!term) return true
      return (
        c.cliente.toLowerCase().includes(term) ||
        c.folio.toLowerCase().includes(term) ||
        c.telefono.includes(term) ||
        fechaCorta(c.fecha).toLowerCase().includes(term) ||
        c.origen.toLowerCase().includes(term) ||
        c.destino.toLowerCase().includes(term)
      )
    })
  }, [cotizaciones, q, filtroEstado])

  const estadoInfo = (id: EstadoCotizacion) => ESTADOS.find((e) => e.id === id)!

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <SectionTitle hint="Busca por cliente, folio, fecha, teléfono u origen.">Historial de cotizaciones</SectionTitle>
        <input
          className="field-input"
          placeholder="🔍 Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <FiltroChip activo={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')}>
            Todas ({cotizaciones.length})
          </FiltroChip>
          {ESTADOS.map((e) => (
            <FiltroChip key={e.id} activo={filtroEstado === e.id} onClick={() => setFiltroEstado(e.id)}>
              {e.nombre} ({cotizaciones.filter((c) => c.estado === e.id).length})
            </FiltroChip>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <p className="text-sm">No hay cotizaciones que coincidan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => {
            const info = estadoInfo(c.estado)
            const margen = c.precioEnviado > 0 ? c.utilidadEsperada / c.precioEnviado : 0
            return (
              <div key={c.folio} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-slate-400">{c.folio}</p>
                    <p className="text-base font-bold text-slate-900">{c.cliente || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-500">{fechaCorta(c.fecha)} · {c.telefono || 's/tel'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${info.color}`}>{info.nombre}</span>
                </div>

                <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
                  <span className="truncate">{c.origen || 'Origen'}</span>
                  <span className="text-slate-300">→</span>
                  <span className="truncate">{c.destino || 'Destino'}</span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Mini label="Km" value={num(c.km)} />
                  <Mini label="Costo" value={money(c.costoTotal)} />
                  <Mini label="Precio" value={money(c.precioEnviado)} accent="text-brand-700" />
                  <Mini label="Margen" value={pct(margen)} accent="text-emerald-600" />
                </div>

                {c.notas && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">{c.notas}</p>}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <select
                    className="field-input py-1.5 text-xs"
                    value={c.estado}
                    onChange={(e) => actualizarCotizacion(c.folio, { estado: e.target.value as EstadoCotizacion })}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la cotización ${c.folio}?`)) eliminarCotizacion(c.folio)
                    }}
                    className="btn bg-rose-50 text-rose-600 hover:bg-rose-100 px-3"
                    aria-label="Eliminar"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FiltroChip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        activo ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${accent ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}
