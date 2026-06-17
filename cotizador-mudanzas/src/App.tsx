import { useState } from 'react'
import { Cotizador } from './pages/Cotizador'
import { Dashboard } from './pages/Dashboard'
import { Historial } from './pages/Historial'
import { GastosFijos } from './pages/GastosFijos'
import { Configuracion } from './pages/Configuracion'
import { useApp } from './context/AppContext'
import {
  IconChart,
  IconDashboard,
  IconHistory,
  IconMoney,
  IconSettings,
  IconTruck,
} from './components/Icons'

type Tab = 'cotizador' | 'dashboard' | 'historial' | 'gastos' | 'config'

const TABS: { id: Tab; label: string; Icon: typeof IconTruck }[] = [
  { id: 'cotizador', label: 'Cotizar', Icon: IconTruck },
  { id: 'dashboard', label: 'Tablero', Icon: IconDashboard },
  { id: 'historial', label: 'Historial', Icon: IconHistory },
  { id: 'gastos', label: 'Gastos', Icon: IconMoney },
  { id: 'config', label: 'Ajustes', Icon: IconSettings },
]

const TITULOS: Record<Tab, { titulo: string; sub: string }> = {
  cotizador: { titulo: 'Cotizador', sub: 'Cotiza un servicio en segundos' },
  dashboard: { titulo: 'Tablero', sub: 'Indicadores del mes' },
  historial: { titulo: 'Historial', sub: 'Tus cotizaciones guardadas' },
  gastos: { titulo: 'Gastos fijos y meta', sub: 'Presión mensual del negocio' },
  config: { titulo: 'Configuración', sub: 'Flota y parámetros' },
}

export default function App() {
  const [tab, setTab] = useState<Tab>('cotizador')
  const { config } = useApp()

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-slate-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-brand-900 text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <IconChart width={22} height={22} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium uppercase tracking-widest text-brand-100/70">{config.empresa.nombre}</p>
            <h1 className="text-lg font-extrabold leading-tight">{TITULOS[tab].titulo}</h1>
          </div>
          <span className="hidden text-xs text-brand-100/70 sm:block">{TITULOS[tab].sub}</span>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-5">
        {tab === 'cotizador' && <Cotizador />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'historial' && <Historial />}
        {tab === 'gastos' && <GastosFijos />}
        {tab === 'config' && <Configuracion />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-2xl -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {TABS.map(({ id, label, Icon }) => {
            const activo = tab === id
            return (
              <button
                key={id}
                onClick={() => {
                  setTab(id)
                  window.scrollTo({ top: 0 })
                }}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                  activo ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                <Icon width={22} height={22} />
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
