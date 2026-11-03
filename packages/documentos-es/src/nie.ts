import { letraDni } from './dni.js'
import { normalizarDocumento, normalizarEntrada } from './normalizar.js'
import { RE_DNI, RE_NIE } from './patrones.js'
import type { Resultado } from './tipos.js'

const VALOR_PREFIJO = { X: '0', Y: '1', Z: '2' } as const

/**
 * Letra de control de un NIE a partir de sus 8 primeros caracteres (`X1234567`): X, Y y Z se sustituyen por 0, 1 y 2
 * y se aplica la misma tabla que al DNI. Lanza `RangeError` si no tiene esa forma.
 */
export function letraNie(inicio: string): string {
  const m = /^([XYZ])(\d{7})$/.exec(normalizarDocumento(inicio))
  if (!m) throw new RangeError(`letraNie: se esperaba X, Y o Z seguida de 7 cifras (p. ej. X1234567) y llegó ${JSON.stringify(inicio)}`)
  return letraDni(VALOR_PREFIJO[m[1] as 'X' | 'Y' | 'Z'] + (m[2] as string))
}

/** Valida un NIE: X, Y o Z, 7 cifras y su letra de control. Un DNI da `parece_dni`. No lanza nunca. */
export function validarNIE(entrada: string): Resultado {
  const v = normalizarEntrada(entrada)
  if (RE_DNI.test(v)) return { ok: false, codigo: 'parece_dni' }
  const m = RE_NIE.exec(v)
  if (!m) return { ok: false, codigo: 'formato' }
  const esperada = letraNie(v.slice(0, 8))
  if (esperada !== m[3]) return { ok: false, codigo: 'letra', esperada }
  return { ok: true, normalizado: v }
}
