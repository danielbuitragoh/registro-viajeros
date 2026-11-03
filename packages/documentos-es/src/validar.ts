import { validarCIF } from './cif.js'
import { detectarTipo } from './detectar.js'
import { validarDNI } from './dni.js'
import { validarNIE } from './nie.js'
import type { ResultadoInvalido, ResultadoValido, TipoDocumento } from './tipos.js'

export type ResultadoDocumento = (ResultadoValido & { tipo: TipoDocumento }) | (ResultadoInvalido & { tipo: TipoDocumento | null })

/**
 * Valida un documento sin saber de antemano de qué tipo es: lo detecta por su forma (`detectarTipo`) y le aplica
 * `validarDNI`, `validarNIE` o `validarCIF`. Si no encaja en ninguno, `tipo` es `null` y el código, `formato`.
 */
export function validarDocumento(entrada: string): ResultadoDocumento {
  const tipo = detectarTipo(entrada)
  if (tipo === null) return { ok: false, tipo, codigo: 'formato' }
  const r = tipo === 'DNI' ? validarDNI(entrada) : tipo === 'NIE' ? validarNIE(entrada) : validarCIF(entrada)
  return { ...r, tipo }
}
