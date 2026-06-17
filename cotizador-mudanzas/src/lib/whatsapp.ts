import type { Config, CotizacionInput } from '../types'
import { calcular } from './calculations'
import { money } from './format'
import { UNIDADES_DEFAULT } from '../constants'

// Redondea a la centena más cercana para precios "presentables"
const redondear = (n: number): number => Math.round(n / 100) * 100

export interface OpcionWhatsApp {
  titulo: string
  precio: number
  descripcion: string
}

export function generarOpciones(input: CotizacionInput, config: Config): OpcionWhatsApp[] {
  const unidad =
    config.unidades.find((u) => u.id === input.unidadId) ??
    UNIDADES_DEFAULT.find((u) => u.id === input.unidadId)!
  const res = calcular(input, unidad)

  // Básico = precio objetivo (30%) redondeado
  const basico = redondear(res.precioObjetivo)
  const intermedio = redondear(basico * (1 + config.intermedioPct))
  const premium = redondear(basico * (1 + config.premiumPct))

  const opciones: OpcionWhatsApp[] = []

  // Opción de renta de unidad con chofer (solo si está activa). Excluye maniobras.
  if (input.rentaChoferActiva) {
    const inputSinManiobras = { ...input, maniobras: 0 }
    const resRenta = calcular(inputSinManiobras, unidad)
    opciones.push({
      titulo: 'Renta de unidad con chofer',
      precio: redondear(resRenta.precioObjetivo),
      descripcion: 'Incluye unidad y chofer. El cliente realiza carga y descarga.',
    })
  }

  opciones.push({
    titulo: 'Opción Básica',
    precio: basico,
    descripcion: 'Incluye traslado, carga y descarga básica.',
  })
  opciones.push({
    titulo: 'Opción Intermedia',
    precio: intermedio,
    descripcion: 'Mayor apoyo, acomodo y protección básica de muebles.',
  })
  opciones.push({
    titulo: 'Opción Premium',
    precio: premium,
    descripcion: 'Protección reforzada, desmontaje/montaje si aplica y servicio prioritario.',
  })

  return opciones
}

export function generarTextoWhatsApp(input: CotizacionInput, config: Config): string {
  const opciones = generarOpciones(input, config)
  const saludo = input.cliente ? `Estimado(a) ${input.cliente}:` : 'Estimado(a) cliente:'

  const lineas: string[] = []
  lineas.push(`*${config.empresa.nombre.toUpperCase()}*`)
  lineas.push('')
  lineas.push(saludo)
  lineas.push('')

  if (input.origen || input.destino) {
    lineas.push(`Servicio: ${input.origen || 'Origen'} → ${input.destino || 'Destino'}`)
    lineas.push('')
  }

  lineas.push('Le comparto las opciones para su servicio:')
  lineas.push('')

  opciones.forEach((op, i) => {
    lineas.push(`*Opción ${i + 1} — ${op.titulo}: ${money(op.precio)}*`)
    lineas.push(op.descripcion)
    lineas.push('')
  })

  lineas.push('Quedo atento para confirmar la opción que mejor se adapte a sus necesidades.')
  if (config.empresa.telefono) {
    lineas.push('')
    lineas.push(`📞 ${config.empresa.telefono}`)
  }

  return lineas.join('\n')
}
