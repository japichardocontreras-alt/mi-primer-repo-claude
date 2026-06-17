import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { money, num, pct } from '../lib/format'
import { SectionTitle, Stat } from '../components/UI'
import type { Cotizacion } from '../types'

export function Dashboard() {
  const { cotizaciones, config } = useApp()

  const ahora = new Date()
  const delMes = useMemo(
    () =>
      cotizaciones.filter((c) => {
        const f = new Date(c.fecha)
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()
      }),
    [cotizaciones],
  )

  const m = useMemo(() => metricas(delMes), [delMes])
  const totalFijos = Object.values(config.gastosFijos).reduce((a, b) => a + (b || 0), 0)
  const utilidadAcumulada = delMes
    .filter((c) => c.estado === 'aceptada' || c.estado === 'realizada')
    .reduce((a, c) => a + c.utilidadEsperada, 0)
  const cobertura = totalFijos > 0 ? utilidadAcumulada / totalFijos : 0

  // Rentabilidad por unidad
  const porUnidad = useMemo(() => {
    const map = new Map<string, { nombre: string; servicios: number; utilidad: number; km: number }>()
    config.unidades.forEach((u) => map.set(u.id, { nombre: u.nombre, servicios: 0, utilidad: 0, km: 0 }))
    delMes.forEach((c) => {
      const e = map.get(c.unidadId)
      if (e) {
        e.servicios += 1
        e.utilidad += c.utilidadEsperada
        e.km += c.km
      }
    })
    return [...map.values()]
  }, [delMes, config.unidades])

  const masRentable = [...porUnidad].sort((a, b) => b.utilidad - a.utilidad)[0]

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle hint={`Mes en curso · ${delMes.length} cotizaciones`}>Resumen del mes</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Cotizaciones" value={num(delMes.length)} sub={`${num(m.aceptadas)} aceptadas · ${num(m.rechazadas)} rechazadas`} />
          <Stat label="Tasa de cierre" value={pct(m.tasaCierre)} sub="Aceptadas / total" accent="text-emerald-600" />
          <Stat label="Precio promedio" value={money(m.precioPromedio)} />
          <Stat label="Utilidad promedio" value={money(m.utilidadPromedio)} accent="text-emerald-600" />
          <Stat label="Margen promedio" value={pct(m.margenPromedio)} accent="text-brand-700" />
          <Stat label="Utilidad esperada" value={money(m.utilidadTotal)} sub="Aceptadas + realizadas" accent="text-emerald-600" />
          <Stat label="Km cotizados" value={`${num(m.kmCotizados)} km`} />
          <Stat label="Km realizados" value={`${num(m.kmRealizados)} km`} sub="Aceptadas + realizadas" />
        </div>
      </div>

      {/* Vs gastos fijos */}
      <div className="card p-4">
        <SectionTitle>Avance vs gastos fijos</SectionTitle>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Utilidad / Gastos fijos</p>
            <p className="text-xl font-extrabold text-slate-900">
              {money(utilidadAcumulada)} <span className="text-sm font-semibold text-slate-400">/ {money(totalFijos)}</span>
            </p>
          </div>
          <p className={`text-2xl font-extrabold ${cobertura >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {(cobertura * 100).toFixed(0)}%
          </p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${cobertura >= 1 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, cobertura * 100)}%` }} />
        </div>
        {totalFijos === 0 && (
          <p className="mt-2 text-xs text-slate-400">Captura tus gastos fijos en la sección correspondiente para ver tu avance real.</p>
        )}
      </div>

      {/* Por unidad */}
      <div className="card p-4">
        <SectionTitle hint={masRentable && masRentable.utilidad > 0 ? `Más rentable del mes: ${masRentable.nombre}` : undefined}>
          Servicios por unidad
        </SectionTitle>
        <div className="space-y-2">
          {porUnidad.map((u) => (
            <div key={u.nombre} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">{u.nombre}</span>
                {masRentable && u.nombre === masRentable.nombre && masRentable.utilidad > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">★ Top</span>
                )}
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Serv.</p>
                  <p className="text-sm font-bold text-slate-700">{num(u.servicios)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Km</p>
                  <p className="text-sm font-bold text-slate-700">{num(u.km)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Utilidad</p>
                  <p className="text-sm font-bold text-emerald-600">{money(u.utilidad)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cotizaciones.length === 0 && (
        <div className="card p-8 text-center text-slate-400">
          <p className="text-sm">Aún no hay cotizaciones. Crea la primera desde el cotizador.</p>
        </div>
      )}
    </div>
  )
}

function metricas(cots: Cotizacion[]) {
  const aceptadas = cots.filter((c) => c.estado === 'aceptada').length
  const rechazadas = cots.filter((c) => c.estado === 'rechazada').length
  const cerradas = cots.filter((c) => c.estado === 'aceptada' || c.estado === 'realizada')
  const decididas = cots.filter((c) => c.estado !== 'pendiente').length

  const precioPromedio = cots.length ? cots.reduce((a, c) => a + c.precioEnviado, 0) / cots.length : 0
  const utilidadPromedio = cots.length ? cots.reduce((a, c) => a + c.utilidadEsperada, 0) / cots.length : 0
  const margenes = cots.filter((c) => c.precioEnviado > 0).map((c) => c.utilidadEsperada / c.precioEnviado)
  const margenPromedio = margenes.length ? margenes.reduce((a, b) => a + b, 0) / margenes.length : 0

  return {
    aceptadas,
    rechazadas,
    tasaCierre: decididas ? aceptadas / decididas : 0,
    precioPromedio,
    utilidadPromedio,
    margenPromedio,
    utilidadTotal: cerradas.reduce((a, c) => a + c.utilidadEsperada, 0),
    kmCotizados: cots.reduce((a, c) => a + c.km, 0),
    kmRealizados: cerradas.reduce((a, c) => a + c.km, 0),
  }
}
