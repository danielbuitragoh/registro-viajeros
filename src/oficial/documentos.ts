/**
 * Reglas de cada tipo de documento, tal como las fija docs/oficial/Instrucciones.pdf (v1.1.0):
 * - §8.5 «Tipos de documento»: NIF, NIE, PAS y OTRO. NO hay más códigos; no añadir ninguno.
 * - §3 (tabla de `persona`): `numeroDocumento` String(15) «deberá corresponder al tipo de documento del campo
 *   tipoDocumento, y tener un formato válido en el caso de NIF o NIE»; `soporteDocumento` «obligatorio si el tipo de
 *   documento es NIF, NIE»; `apellido2` «obligatorio si el tipo de documento es NIF».
 *
 * PENDIENTE-OFICIAL (P16): §8.5 no da un código propio para documentos de identidad de otros países (p. ej. el carné
 * de identidad de un país de la UE), permisos de residencia o carnés de conducir. El único valor genérico es OTRO
 * («Otro»), y es el que se propone al huésped en esos casos. Confirmar con el portal.
 * PENDIENTE-OFICIAL (P10): el documento no define formatos de pasaporte ni de OTRO, ni dónde figura el soporte.
 */
import type { CodigoTipoDocumento } from './codigos'

export interface ReglaDocumento {
  /** §3: el soporte es obligatorio en partes de viajeros. */
  soporteObligatorio: boolean
  /** §3: el segundo apellido es obligatorio en partes de viajeros. */
  apellido2Obligatorio: boolean
  /** §3: el documento exige «formato válido» (letra de control). */
  formatoOficial: boolean
  /** §3: String(15). */
  longitudMax: number
  /** Apartados del documento oficial de los que sale la regla. */
  fuente: string
}

export const REGLAS_DOCUMENTO = {
  NIF: { soporteObligatorio: true, apellido2Obligatorio: true, formatoOficial: true, longitudMax: 15, fuente: '§8.5 (NIF - Número de Identificación Fiscal) y §3 (apellido2, numeroDocumento, soporteDocumento)' },
  NIE: { soporteObligatorio: true, apellido2Obligatorio: false, formatoOficial: true, longitudMax: 15, fuente: '§8.5 (NIE - Número de Identidad de Extranjero) y §3 (numeroDocumento, soporteDocumento)' },
  PAS: { soporteObligatorio: false, apellido2Obligatorio: false, formatoOficial: false, longitudMax: 15, fuente: '§8.5 (Número de pasaporte); formato no definido (P10)' },
  OTRO: { soporteObligatorio: false, apellido2Obligatorio: false, formatoOficial: false, longitudMax: 15, fuente: '§8.5 (Otro); formato no definido (P10, P16)' },
} as const satisfies Record<CodigoTipoDocumento, ReglaDocumento>

/**
 * Ejemplo ficticio (con letra de control correcta) que se enseña junto al campo. Solo para los tipos cuyo formato fija
 * el documento oficial; para pasaporte y OTRO no se inventa un formato.
 */
export function ejemploDocumento(tipo: CodigoTipoDocumento): string | undefined {
  return tipo === 'NIF' ? '12345678Z' : tipo === 'NIE' ? 'X1234567L' : undefined
}
