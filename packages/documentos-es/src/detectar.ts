import { normalizarEntrada } from './normalizar.js'
import { RE_CIF, RE_DNI, RE_NIE, RE_NIF_ESPECIAL } from './patrones.js'
import type { TipoDocumento } from './tipos.js'

/**
 * Qué tipo de documento parece un número, solo por su forma (no comprueba la letra ni el control):
 * `'DNI'` (8 cifras y letra, o NIF especial K/L/M), `'NIE'` (X/Y/Z), `'CIF'` o `null` si no encaja en ninguno.
 */
export function detectarTipo(entrada: string): TipoDocumento | null {
  const v = normalizarEntrada(entrada)
  if (RE_DNI.test(v) || RE_NIF_ESPECIAL.test(v)) return 'DNI'
  if (RE_NIE.test(v)) return 'NIE'
  if (RE_CIF.test(v)) return 'CIF'
  return null
}
