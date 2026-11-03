/**
 * Implementación de REFERENCIA, escrita aparte y a propósito de otra manera que el código del paquete (tablas de
 * búsqueda en lugar de aritmética, sin expresiones regulares, sin reutilizar nada de `src/`). Solo sirve para que las
 * pruebas de propiedades comparen: si las dos discrepan en alguna entrada, una de las dos está mal.
 */
const TABLA_DNI = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E']
/** Valor de «duplicar y sumar las cifras» para cada dígito 0–9. */
const DOBLE_SUMADO = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9]
const LETRAS_CONTROL_CIF = ['J', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

export const ENTIDADES_SOLO_LETRA = ['N', 'P', 'Q', 'R', 'S', 'W']
export const ENTIDADES_SOLO_DIGITO = ['A', 'B', 'E', 'H']
export const ENTIDADES_AMBOS = ['C', 'D', 'F', 'G', 'J', 'U', 'V']
export const ENTIDADES = [...ENTIDADES_SOLO_LETRA, ...ENTIDADES_SOLO_DIGITO, ...ENTIDADES_AMBOS]

const SEPARADORES = new Set([' ', '\t', '\n', '\r', '\f', '\v', ' ', '.', '-', '_'])

export function refNormalizar(s: string): string {
  return [...s.toUpperCase()].filter((c) => !SEPARADORES.has(c)).join('')
}

const esDigito = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9'
const esLetra = (c: string | undefined): boolean => c !== undefined && c >= 'A' && c <= 'Z'
const todasCifras = (s: string): boolean => s.length > 0 && [...s].every(esDigito)

export function refLetraDni(n: number): string {
  return TABLA_DNI[n % 23] as string
}

export type Tipo = 'DNI' | 'NIE' | 'CIF' | null

export function refTipo(entrada: string): Tipo {
  const v = refNormalizar(entrada)
  if (v.length !== 9) return null
  const cuerpo7 = v.slice(1, 8)
  if (todasCifras(v.slice(0, 8)) && esLetra(v[8])) return 'DNI'
  if ('KLM'.includes(v[0] as string) && todasCifras(cuerpo7) && esLetra(v[8])) return 'DNI'
  if ('XYZ'.includes(v[0] as string) && todasCifras(cuerpo7) && esLetra(v[8])) return 'NIE'
  if (ENTIDADES.includes(v[0] as string) && todasCifras(cuerpo7) && (esDigito(v[8]) || 'JABCDEFGHI'.includes(v[8] as string))) return 'CIF'
  return null
}

export function refLetraNie(v: string): string {
  const prefijo = 'XYZ'.indexOf(v[0] as string)
  return refLetraDni(prefijo * 10_000_000 + Number(v.slice(1, 8)))
}

export function refControlCif(v: string): { digito: string; letra: string } {
  let suma = 0
  for (let i = 1; i <= 7; i++) {
    const d = Number(v[i])
    suma += i % 2 === 1 ? (DOBLE_SUMADO[d] as number) : d // posiciones 1.ª, 3.ª, 5.ª y 7.ª del cuerpo: dobles
  }
  const digito = (10 - (suma % 10)) % 10
  return { digito: String(digito), letra: LETRAS_CONTROL_CIF[digito] as string }
}

/** ¿Es un DNI válido? (los K, L y M se aceptan por formato). */
export function refDniValido(entrada: string): boolean {
  const v = refNormalizar(entrada)
  if (refTipo(v) !== 'DNI') return false
  if ('KLM'.includes(v[0] as string)) return true
  return refLetraDni(Number(v.slice(0, 8))) === v[8]
}

export function refNieValido(entrada: string): boolean {
  const v = refNormalizar(entrada)
  return refTipo(v) === 'NIE' && refLetraNie(v) === v[8]
}

export function refCifValido(entrada: string): boolean {
  const v = refNormalizar(entrada)
  if (refTipo(v) !== 'CIF') return false
  const { digito, letra } = refControlCif(v)
  const control = v[8] as string
  if (ENTIDADES_SOLO_LETRA.includes(v[0] as string)) return control === letra
  if (ENTIDADES_SOLO_DIGITO.includes(v[0] as string)) return control === digito
  return control === letra || control === digito
}
