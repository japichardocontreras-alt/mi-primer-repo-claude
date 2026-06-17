// Utilidades de formato

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

export const money = (n: number): string => mxn.format(isFinite(n) ? n : 0)

export const pct = (n: number, decimals = 0): string =>
  `${(isFinite(n) ? n * 100 : 0).toFixed(decimals)}%`

export const num = (n: number): string =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(isFinite(n) ? n : 0)

export const fechaCorta = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

export const fechaHora = (iso: string): string =>
  new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
