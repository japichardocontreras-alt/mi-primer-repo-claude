import type { Config, CotizacionInput, Unidad } from './types'

// ===== Flota oficial precargada (costos por km = base sagrada) =====
export const UNIDADES_DEFAULT: Unidad[] = [
  { id: 'pickup', nombre: 'Pick Up', costoKm: 7, valorCompra: 400000, valorResidual: 100000, vidaUtilKm: 300000 },
  { id: 'cerrada15', nombre: '1.5 cerrada', costoKm: 9, valorCompra: 550000, valorResidual: 150000, vidaUtilKm: 300000 },
  { id: 'ton25', nombre: '2.5 toneladas', costoKm: 10, valorCompra: 625000, valorResidual: 200000, vidaUtilKm: 300000 },
  { id: 'ton35', nombre: '3.5 toneladas', costoKm: 12, valorCompra: 800000, valorResidual: 250000, vidaUtilKm: 300000 },
]

// ===== Configuración inicial por defecto =====
export const CONFIG_DEFAULT: Config = {
  empresa: { nombre: 'Mudanzas Metepec', telefono: '' },
  unidades: UNIDADES_DEFAULT,
  modeloFinanciero: { camioneta: 30, operacion: 40, utilidad: 30 },
  intermedioPct: 0.2, // +20% sobre básico
  premiumPct: 0.4, // +40% sobre básico
  gastosFijos: {
    rentaUnidades: 0,
    pension: 0,
    publicidad: 0,
    nominaFija: 0,
    rentaLocal: 0,
    contador: 0,
    telefono: 0,
    internet: 0,
    suscripciones: 0,
    seguros: 0,
    creditos: 0,
    otros: 0,
  },
  metaServiciosMensuales: 30,
}

// Etiquetas legibles para cada renglón de gastos fijos
export const GASTOS_FIJOS_LABELS: { key: keyof Config['gastosFijos']; label: string }[] = [
  { key: 'rentaUnidades', label: 'Renta de unidades' },
  { key: 'pension', label: 'Pensión' },
  { key: 'publicidad', label: 'Publicidad mensual' },
  { key: 'nominaFija', label: 'Nómina fija' },
  { key: 'rentaLocal', label: 'Renta de local' },
  { key: 'contador', label: 'Contador' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'internet', label: 'Internet' },
  { key: 'suscripciones', label: 'Suscripciones' },
  { key: 'seguros', label: 'Seguros' },
  { key: 'creditos', label: 'Créditos' },
  { key: 'otros', label: 'Otros gastos fijos' },
]

export const COTIZACION_INPUT_DEFAULT: CotizacionInput = {
  cliente: '',
  telefono: '',
  origen: '',
  destino: '',
  tipoServicio: 'mudanza_local',
  unidadId: 'cerrada15',
  km: 0,
  chofer: 0,
  ayudante1: 0,
  ayudante2: 0,
  ayudante3: 0,
  casetas: 0,
  comidas: 0,
  hospedaje: 0,
  materiales: 0,
  maniobras: 0,
  publicidad: 0,
  otros: 0,
  notas: '',
  rentaChoferActiva: false,
}

export const STORAGE_KEYS = {
  config: 'cmm_config_v1',
  cotizaciones: 'cmm_cotizaciones_v1',
}
