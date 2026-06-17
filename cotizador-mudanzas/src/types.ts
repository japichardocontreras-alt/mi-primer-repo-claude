// ===== Tipos centrales de la aplicación =====

export type UnidadId = 'pickup' | 'cerrada15' | 'ton25' | 'ton35'

export interface Unidad {
  id: UnidadId
  nombre: string
  costoKm: number // costo empresarial por km (base sagrada)
  valorCompra: number
  valorResidual: number
  vidaUtilKm: number
}

export type TipoServicio =
  | 'flete'
  | 'mudanza_local'
  | 'mudanza_foranea'
  | 'compartido'
  | 'renta_chofer'

export const TIPOS_SERVICIO: { id: TipoServicio; nombre: string }[] = [
  { id: 'flete', nombre: 'Flete local' },
  { id: 'mudanza_local', nombre: 'Mudanza local' },
  { id: 'mudanza_foranea', nombre: 'Mudanza foránea' },
  { id: 'compartido', nombre: 'Servicio compartido' },
  { id: 'renta_chofer', nombre: 'Renta de unidad con chofer' },
]

export type EstadoCotizacion = 'pendiente' | 'aceptada' | 'rechazada' | 'realizada'

export const ESTADOS: { id: EstadoCotizacion; nombre: string; color: string }[] = [
  { id: 'pendiente', nombre: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  { id: 'aceptada', nombre: 'Aceptada', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'rechazada', nombre: 'Rechazada', color: 'bg-rose-100 text-rose-700' },
  { id: 'realizada', nombre: 'Realizada', color: 'bg-blue-100 text-blue-700' },
]

export type Modo = 'supervivencia' | 'empresa'

// Datos crudos capturados en el formulario del cotizador
export interface CotizacionInput {
  cliente: string
  telefono: string
  origen: string
  destino: string
  tipoServicio: TipoServicio
  unidadId: UnidadId
  km: number
  chofer: number
  ayudante1: number
  ayudante2: number
  ayudante3: number
  casetas: number
  comidas: number
  hospedaje: number
  materiales: number
  maniobras: number
  publicidad: number
  otros: number
  notas: string
  rentaChoferActiva: boolean
}

// Cotización guardada en el historial (input + snapshot de resultados)
export interface Cotizacion extends CotizacionInput {
  folio: string
  fecha: string // ISO
  estado: EstadoCotizacion
  costoCamioneta: number
  extras: number
  costoTotal: number
  precioEnviado: number
  utilidadEsperada: number
}

export interface GastosFijos {
  rentaUnidades: number
  pension: number
  publicidad: number
  nominaFija: number
  rentaLocal: number
  contador: number
  telefono: number
  internet: number
  suscripciones: number
  seguros: number
  creditos: number
  otros: number
}

export interface ModeloFinanciero {
  camioneta: number // %
  operacion: number // %
  utilidad: number // %
}

export interface Config {
  empresa: { nombre: string; telefono: string }
  unidades: Unidad[]
  modeloFinanciero: ModeloFinanciero
  intermedioPct: number // recargo sobre básico (ej. 0.20)
  premiumPct: number // recargo sobre básico (ej. 0.40)
  gastosFijos: GastosFijos
  metaServiciosMensuales: number
}
