import { normalizarDocumento, normalizarEntrada } from './normalizar.js'
import { RE_CIF } from './patrones.js'
import type { Resultado } from './tipos.js'

/** Letra que corresponde a cada dígito de control (0 → J, 1 → A, 2 → B … 9 → I). */
const LETRAS_CIF = 'JABCDEFGHI'
/** Entidades cuyo control es siempre una letra. */
const SOLO_LETRA = 'NPQRSW'
/** Entidades cuyo control es siempre un dígito. */
const SOLO_DIGITO = 'ABEH'

export interface ControlCif {
  /** Dígito de control (`'0'`–`'9'`). */
  digito: string
  /** Letra equivalente (`J`, `A`–`I`). */
  letra: string
}

/**
 * Control de un CIF a partir de sus 8 primeros caracteres (`A2801586`: letra de entidad y 7 cifras). Las cifras en
 * posición par se suman; las de posición impar se duplican y se suman sus cifras; el control es lo que falta para la
 * siguiente decena. Qué forma admite cada entidad (dígito, letra o ambas) lo decide `validarCIF`.
 * Lanza `RangeError` si no tiene esa forma.
 */
export function controlCif(inicio: string): ControlCif {
  const v = normalizarDocumento(inicio)
  const m = /^[ABCDEFGHJNPQRSUVW](\d{7})$/.exec(v)
  if (!m) throw new RangeError(`controlCif: se esperaba la letra de entidad y 7 cifras (p. ej. A2801586) y llegó ${JSON.stringify(inicio)}`)
  const cuerpo = m[1] as string
  let suma = 0
  for (let i = 0; i < 7; i++) {
    const d = Number(cuerpo.charAt(i))
    if (i % 2 === 1) suma += d
    else {
      const doble = d * 2
      suma += Math.floor(doble / 10) + (doble % 10)
    }
  }
  const digito = (10 - (suma % 10)) % 10
  return { digito: String(digito), letra: LETRAS_CIF.charAt(digito) }
}

/**
 * Valida un CIF: letra de entidad, 7 cifras y control. Según la entidad el control es una letra (N, P, Q, R, S, W),
 * un dígito (A, B, E, H) o cualquiera de los dos (C, D, F, G, J, U, V). No lanza nunca.
 * Si el control falla, `esperada` es la letra para las entidades que la exigen y el dígito para el resto.
 */
export function validarCIF(entrada: string): Resultado {
  const v = normalizarEntrada(entrada)
  const m = RE_CIF.exec(v)
  if (!m) return { ok: false, codigo: 'formato' }
  const [, org, , control] = m as unknown as [string, string, string, string]
  const { digito, letra } = controlCif(v.slice(0, 8))
  const soloLetra = SOLO_LETRA.includes(org)
  const soloDigito = SOLO_DIGITO.includes(org)
  const valido = soloLetra ? control === letra : soloDigito ? control === digito : control === letra || control === digito
  if (!valido) return { ok: false, codigo: 'control', esperada: soloLetra ? letra : digito }
  return { ok: true, normalizado: v }
}
