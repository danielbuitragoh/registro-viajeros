import { normalizarEntrada } from './normalizar.js'
import { RE_DNI, RE_NIE, RE_NIF_ESPECIAL } from './patrones.js'
import type { Resultado } from './tipos.js'

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE'

/**
 * Letra de control de un número de DNI: el resto de dividirlo entre 23 indexa la tabla `TRWAGMYFPDXBNJZSQVHLCKE`.
 * Acepta el número (`12345678`) o sus cifras como texto (`'12345678'`, con o sin ceros a la izquierda).
 * Lanza `RangeError` si no es un entero entre 0 y 99 999 999: no hay letra posible para otra cosa.
 */
export function letraDni(numero: string | number): string {
  const valido = typeof numero === 'number' ? Number.isInteger(numero) && numero >= 0 && numero <= 99_999_999 : /^\d{1,8}$/.test(numero)
  if (!valido) throw new RangeError(`letraDni: se esperaba un entero de 0 a 99999999 (o hasta 8 cifras en texto) y llegó ${JSON.stringify(numero)}`)
  return LETRAS_DNI.charAt(Number(numero) % 23)
}

/**
 * Valida un DNI/NIF de persona física: 8 cifras y su letra de control. No lanza nunca.
 * - Un NIE (X, Y, Z…) da `parece_nie`.
 * - Un NIF que empieza por K, L o M (menores, residentes en el extranjero) se acepta solo por formato, con
 *   `aviso: 'control_no_verificado'`: su control no sigue una regla pública y estable.
 */
export function validarDNI(entrada: string): Resultado {
  const v = normalizarEntrada(entrada)
  if (RE_NIE.test(v)) return { ok: false, codigo: 'parece_nie' }
  if (RE_NIF_ESPECIAL.test(v)) return { ok: true, normalizado: v, aviso: 'control_no_verificado' }
  const m = RE_DNI.exec(v)
  if (!m) return { ok: false, codigo: 'formato' }
  const esperada = letraDni(m[1] as string)
  if (esperada !== m[2]) return { ok: false, codigo: 'letra', esperada }
  return { ok: true, normalizado: v }
}
