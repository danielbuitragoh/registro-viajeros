import type { Reserva } from './tipos'
import { estadoParte, validarReserva } from '../validators/reserva'

/** Lo que recepción tiene que hacer ahora con una reserva (se muestra en «Hoy» y en la ficha de la reserva). */
export type SiguientePaso =
  | { tipo: 'enlace' }
  | { tipo: 'esperar' }
  | { tipo: 'revisar'; errores: number }
  | { tipo: 'faltan'; fichas: number; personas: number }
  | { tipo: 'exportar' }
  | { tipo: 'subir' }

export function siguientePaso(r: Reserva): SiguientePaso {
  const estado = estadoParte(r)
  if (estado === 'exportado') return { tipo: 'subir' }
  if (r.viajeros.length === 0) return r.claveEnlace ? { tipo: 'esperar' } : { tipo: 'enlace' }
  const inc = validarReserva(r, 'partes')
  const errores = inc.filter((i) => i.gravedad === 'error' && i.campo !== 'viajeros').length
  if (errores > 0) return { tipo: 'revisar', errores }
  if (estado === 'pendiente') return { tipo: 'faltan', fichas: r.viajeros.length, personas: r.numPersonas }
  return { tipo: 'exportar' }
}

/** Texto corto del siguiente paso (recepción, en español). */
export function textoSiguientePaso(p: SiguientePaso): string {
  switch (p.tipo) {
    case 'enlace':
      return 'enviar el enlace al huésped (o rellenar las fichas en recepción)'
    case 'esperar':
      return 'esperar la ficha del huésped y escanear su QR'
    case 'revisar':
      return `revisar ${p.errores} ${p.errores === 1 ? 'dato' : 'datos'}`
    case 'faltan':
      return `faltan fichas (${p.fichas} de ${p.personas})`
    case 'exportar':
      return 'exportar el parte'
    case 'subir':
      return 'subir el fichero al portal SES.Hospedajes (si no lo has hecho)'
  }
}
