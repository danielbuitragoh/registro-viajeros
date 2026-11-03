/**
 * Validación orientativa de números de pasaporte.
 * PENDIENTE-OFICIAL (P10): el documento oficial no define formatos por país; solo String(15).
 * Reglas duras (error): 5–15 caracteres A-Z/0-9. Reglas blandas (aviso): longitud 6–9 (ICAO 9303) y patrón habitual del
 * país emisor (se usa la nacionalidad como aproximación). Los patrones son orientativos y NUNCA bloquean el alta.
 */
import { normalizarDocumento } from '@danielbuitragoh/documentos-es'

export type ResultadoPasaporte =
  | { ok: true; normalizado: string; aviso?: 'formato_pais' | 'longitud_inusual' }
  | { ok: false; codigo: 'caracteres' | 'longitud' }

/** Patrones habituales por país emisor (alfa-3). Orientativos. */
const PATRONES: Record<string, RegExp> = {
  ESP: /^[A-Z]{3}\d{6}$/,
  USA: /^(\d{9}|[A-Z]\d{8})$/,
  GBR: /^\d{9}$/,
  FRA: /^\d{2}[A-Z]{2}\d{5}$/,
  DEU: /^[A-Z0-9]{9}$/,
  ITA: /^[A-Z]{1,2}\d{7}$/,
  PRT: /^[A-Z]\d{6}$/,
  NLD: /^[A-Z]{2}[A-Z0-9]{6}\d$/,
  IND: /^[A-Z]\d{7}$/,
  JPN: /^[A-Z]{2}\d{7}$/,
  CAN: /^[A-Z]{2}\d{6}$/,
  BRA: /^[A-Z]{2}\d{6}$/,
  ARG: /^[A-Z]{3}\d{6}$/,
  RUS: /^\d{9}$/,
  AUS: /^[A-Z]{1,2}\d{7}$/,
  MEX: /^[A-Z]\d{8}$/,
  CHN: /^[A-Z]\d{8}$/,
}

export function validarPasaporte(entrada: string, nacionalidadAlfa3?: string): ResultadoPasaporte {
  const v = normalizarDocumento(entrada)
  if (!/^[A-Z0-9]*$/.test(v)) return { ok: false, codigo: 'caracteres' }
  if (v.length < 5 || v.length > 15) return { ok: false, codigo: 'longitud' }
  const patron = nacionalidadAlfa3 ? PATRONES[nacionalidadAlfa3] : undefined
  if (patron && !patron.test(v)) return { ok: true, normalizado: v, aviso: 'formato_pais' }
  if (v.length < 6 || v.length > 9) return { ok: true, normalizado: v, aviso: 'longitud_inusual' }
  return { ok: true, normalizado: v }
}
