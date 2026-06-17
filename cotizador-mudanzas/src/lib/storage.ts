// Acceso seguro a LocalStorage con fallback en memoria

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // almacenamiento lleno o no disponible: ignorar silenciosamente
  }
}

// Genera un folio tipo CMM-260617-001 (fecha + consecutivo del día)
export function generarFolio(existentes: { folio: string }[]): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const prefijoDia = `CMM-${yy}${mm}${dd}`
  const delDia = existentes.filter((c) => c.folio.startsWith(prefijoDia)).length
  return `${prefijoDia}-${String(delDia + 1).padStart(3, '0')}`
}
