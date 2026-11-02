/** Utilidades de fecha sin zonas horarias: trabajan con cadenas AAAA-MM-DD y AAAA-MM-DDThh:mm[:ss]. */

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/
const RE_FECHA_HORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

export function esFechaValida(s: string): boolean {
  const m = RE_FECHA.exec(s)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const f = new Date(Date.UTC(y, mo - 1, d))
  return f.getUTCFullYear() === y && f.getUTCMonth() === mo - 1 && f.getUTCDate() === d
}

export function esFechaHoraValida(s: string): boolean {
  const m = RE_FECHA_HORA.exec(s)
  if (!m || !esFechaValida(m[1] as string)) return false
  const h = Number(m[2])
  const mi = Number(m[3])
  const se = m[4] === undefined ? 0 : Number(m[4])
  return h <= 23 && mi <= 59 && se <= 59
}

/** Formato exigido por el documento oficial: AAAA-MM-DDThh:mm:ss */
export function aFechaHoraOficial(s: string): string {
  return /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s
}

export function soloFecha(fechaHora: string): string {
  return fechaHora.slice(0, 10)
}

export function edadEn(nacimiento: string, referencia: string): number {
  const [by, bm, bd] = nacimiento.split('-').map(Number) as [number, number, number]
  const [ry, rm, rd] = referencia.slice(0, 10).split('-').map(Number) as [number, number, number]
  let edad = ry - by
  if (rm < bm || (rm === bm && rd < bd)) edad--
  return edad
}

/**
 * PENDIENTE-OFICIAL (P6): el documento no define "mayor de edad". Se usa 18 años, a la fecha de referencia dada.
 */
export const MAYORIA_DE_EDAD = 18

export function esMayorDeEdad(nacimiento: string, referencia: string): boolean {
  return edadEn(nacimiento, referencia) >= MAYORIA_DE_EDAD
}

const esBisiesto = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** Suma años de calendario. El 29-feb pasa a 1-mar si el año destino no es bisiesto (así nunca se purga antes de plazo). */
export function sumarAnios(fecha: string, anios: number): string {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number) as [number, number, number]
  const ny = y + anios
  if (m === 2 && d === 29 && !esBisiesto(ny)) return `${ny}-03-01`
  return `${String(ny).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Hoy en AAAA-MM-DD según la hora local del dispositivo. */
export function hoyISO(ahora: Date = new Date()): string {
  const y = ahora.getFullYear()
  const m = String(ahora.getMonth() + 1).padStart(2, '0')
  const d = String(ahora.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
