import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Config, Cotizacion } from '../types'
import { CONFIG_DEFAULT, STORAGE_KEYS } from '../constants'
import { load, save } from '../lib/storage'

interface AppContextValue {
  config: Config
  setConfig: (c: Config) => void
  cotizaciones: Cotizacion[]
  agregarCotizacion: (c: Cotizacion) => void
  actualizarCotizacion: (folio: string, cambios: Partial<Cotizacion>) => void
  eliminarCotizacion: (folio: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

// Combina config guardada con defaults para tolerar versiones antiguas
function mergeConfig(saved: Config): Config {
  return {
    ...CONFIG_DEFAULT,
    ...saved,
    empresa: { ...CONFIG_DEFAULT.empresa, ...saved.empresa },
    modeloFinanciero: { ...CONFIG_DEFAULT.modeloFinanciero, ...saved.modeloFinanciero },
    gastosFijos: { ...CONFIG_DEFAULT.gastosFijos, ...saved.gastosFijos },
    unidades: saved.unidades?.length ? saved.unidades : CONFIG_DEFAULT.unidades,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(() =>
    mergeConfig(load<Config>(STORAGE_KEYS.config, CONFIG_DEFAULT)),
  )
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(() =>
    load<Cotizacion[]>(STORAGE_KEYS.cotizaciones, []),
  )

  useEffect(() => save(STORAGE_KEYS.config, config), [config])
  useEffect(() => save(STORAGE_KEYS.cotizaciones, cotizaciones), [cotizaciones])

  const setConfig = (c: Config) => setConfigState(c)

  const agregarCotizacion = (c: Cotizacion) => setCotizaciones((prev) => [c, ...prev])

  const actualizarCotizacion = (folio: string, cambios: Partial<Cotizacion>) =>
    setCotizaciones((prev) => prev.map((c) => (c.folio === folio ? { ...c, ...cambios } : c)))

  const eliminarCotizacion = (folio: string) =>
    setCotizaciones((prev) => prev.filter((c) => c.folio !== folio))

  return (
    <AppContext.Provider
      value={{ config, setConfig, cotizaciones, agregarCotizacion, actualizarCotizacion, eliminarCotizacion }}
    >
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
