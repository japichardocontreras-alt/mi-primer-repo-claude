import type { CotizacionInput, Unidad } from '../types'

// ===== Núcleo de cálculo del cotizador =====

export interface EscenarioPrecio {
  key: string
  nombre: string
  divisor: number // costoTotal / divisor
  precio: number
  utilidad: number // pesos
  utilidadPct: number // sobre venta (0-1)
}

export interface Proyeccion {
  utilidadPorKm: number
  proyeccion300k: number
  mensual4anios: number
  mensual5anios: number
}

export interface Distribucion {
  camioneta: number // %
  extras: number // %
  utilidad: number // %
}

export interface Resultado {
  unidad: Unidad
  costoCamioneta: number
  extras: number
  costoTotal: number
  escenarios: EscenarioPrecio[]
  formulaIdeal: number // costoTotal * 2
  // accesos directos por nombre
  precioMinimo: number
  precioAceptable: number
  precioObjetivo: number
  precioMuyBueno: number
  precioExcelente: number
}

// Definición de escenarios oficiales (divisor = 1 - utilidad%)
export const ESCENARIOS_DEF: { key: string; nombre: string; divisor: number }[] = [
  { key: 'minimo', nombre: 'Precio mínimo (15%)', divisor: 0.85 },
  { key: 'aceptable', nombre: 'Precio aceptable (20%)', divisor: 0.8 },
  { key: 'objetivo', nombre: 'Precio objetivo (30%)', divisor: 0.7 },
  { key: 'muyBueno', nombre: 'Precio muy bueno (40%)', divisor: 0.6 },
  { key: 'excelente', nombre: 'Precio excelente (50%)', divisor: 0.5 },
]

export function calcularExtras(input: CotizacionInput): number {
  return (
    n(input.chofer) +
    n(input.ayudante1) +
    n(input.ayudante2) +
    n(input.ayudante3) +
    n(input.casetas) +
    n(input.comidas) +
    n(input.hospedaje) +
    n(input.materiales) +
    n(input.maniobras) +
    n(input.publicidad) +
    n(input.otros)
  )
}

const n = (v: number): number => (isFinite(v) && v > 0 ? v : 0)

export function calcular(input: CotizacionInput, unidad: Unidad): Resultado {
  const costoCamioneta = n(input.km) * unidad.costoKm
  const extras = calcularExtras(input)
  const costoTotal = costoCamioneta + extras

  const escenarios: EscenarioPrecio[] = ESCENARIOS_DEF.map((e) => {
    const precio = costoTotal / e.divisor
    const utilidad = precio - costoTotal
    return {
      key: e.key,
      nombre: e.nombre,
      divisor: e.divisor,
      precio,
      utilidad,
      utilidadPct: precio > 0 ? utilidad / precio : 0,
    }
  })

  const pick = (key: string) => escenarios.find((e) => e.key === key)!.precio

  return {
    unidad,
    costoCamioneta,
    extras,
    costoTotal,
    escenarios,
    formulaIdeal: costoTotal * 2,
    precioMinimo: pick('minimo'),
    precioAceptable: pick('aceptable'),
    precioObjetivo: pick('objetivo'),
    precioMuyBueno: pick('muyBueno'),
    precioExcelente: pick('excelente'),
  }
}

// Utilidad y % a partir de un precio de venta concreto
export function utilidadDe(precio: number, costoTotal: number) {
  const utilidad = precio - costoTotal
  const utilidadPct = precio > 0 ? utilidad / precio : 0
  return { utilidad, utilidadPct }
}

// Distribución (%) sobre el precio de venta
export function distribucion(precio: number, costoCamioneta: number, extras: number): Distribucion {
  if (precio <= 0) return { camioneta: 0, extras: 0, utilidad: 0 }
  const camioneta = (costoCamioneta / precio) * 100
  const ex = (extras / precio) * 100
  return {
    camioneta,
    extras: ex,
    utilidad: Math.max(0, 100 - camioneta - ex),
  }
}

// Proyección de largo plazo a vida útil de la unidad
export function proyeccion(
  utilidadServicio: number,
  km: number,
  vidaUtilKm: number,
): Proyeccion {
  const utilidadPorKm = km > 0 ? utilidadServicio / km : 0
  const proyeccion300k = utilidadPorKm * vidaUtilKm
  return {
    utilidadPorKm,
    proyeccion300k,
    mensual4anios: proyeccion300k / 48,
    mensual5anios: proyeccion300k / 60,
  }
}

// ===== Semáforo de utilidad =====
export interface NivelUtilidad {
  label: string
  // clases tailwind
  bg: string
  text: string
  border: string
  dot: string
  recomendacion: string
}

export function nivelUtilidad(utilidadPct: number): NivelUtilidad {
  const p = utilidadPct * 100
  if (p < 15)
    return {
      label: 'Evitar',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-300',
      dot: 'bg-rose-500',
      recomendacion: 'Menos de 15% de utilidad. Estás perdiendo o casi perdiendo. Evita cerrar a este precio.',
    }
  if (p < 20)
    return {
      label: 'Solo si urge',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-300',
      dot: 'bg-orange-500',
      recomendacion: 'Entre 15% y 20%. Solo acéptalo si urge cerrar o hay poca agenda.',
    }
  if (p < 30)
    return {
      label: 'Aceptable',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300',
      dot: 'bg-amber-400',
      recomendacion: 'Entre 20% y 30%. Aceptable, pero busca acercarte al objetivo de 30%.',
    }
  if (p < 40)
    return {
      label: 'Objetivo sano',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
      recomendacion: 'Entre 30% y 40%. Objetivo sano del negocio. Buen precio.',
    }
  if (p < 50)
    return {
      label: 'Muy bueno',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-300',
      dot: 'bg-blue-500',
      recomendacion: 'Entre 40% y 50%. Muy buen margen. Excelente para escalar.',
    }
  return {
    label: 'Excelente',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-300',
    dot: 'bg-violet-500',
    recomendacion: '50% o más. Margen excelente. Ideal para crecer la flota.',
  }
}
