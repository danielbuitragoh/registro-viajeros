/**
 * Validación de DNI/NIF, NIE y CIF (letra o dígito de control).
 * Algoritmos públicos y estables (Orden EHA/451/2008 y normativa de la AEAT).
 */

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE'

export type CodigoErrorDoc = 'formato' | 'letra' | 'control' | 'parece_nie' | 'parece_dni'
export type ResultadoDoc =
  | { ok: true; normalizado: string; aviso?: 'control_no_verificado' }
  | { ok: false; codigo: CodigoErrorDoc; esperada?: string }

/** Mayúsculas y sin espacios, guiones ni puntos. */
export function normalizarDocumento(v: string): string {
  return v.toUpperCase().replace(/[\s.\-_]/g, '')
}

/** Letra de control de un número de DNI de 8 dígitos (o el equivalente numérico de un NIE). */
export function letraDni(numero: string | number): string {
  return LETRAS_DNI.charAt(Number(numero) % 23)
}

const RE_DNI = /^(\d{8})([A-Z])$/
const RE_NIE = /^([XYZ])(\d{7})([A-Z])$/
const RE_NIF_ESPECIAL = /^[KLM]\d{7}[A-Z]$/

export function validarDNI(entrada: string): ResultadoDoc {
  const v = normalizarDocumento(entrada)
  if (RE_NIE.test(v)) return { ok: false, codigo: 'parece_nie' }
  // PENDIENTE-OFICIAL (P6/P9): el PDF solo exige "formato válido" para NIF. Los NIF que empiezan por K, L o M
  // (menores, residentes en el extranjero, extranjeros sin NIE) se aceptan por formato sin verificar el control.
  if (RE_NIF_ESPECIAL.test(v)) return { ok: true, normalizado: v, aviso: 'control_no_verificado' }
  const m = RE_DNI.exec(v)
  if (!m) return { ok: false, codigo: 'formato' }
  const esperada = letraDni(m[1] as string)
  if (esperada !== m[2]) return { ok: false, codigo: 'letra', esperada }
  return { ok: true, normalizado: v }
}

export function validarNIE(entrada: string): ResultadoDoc {
  const v = normalizarDocumento(entrada)
  if (RE_DNI.test(v)) return { ok: false, codigo: 'parece_dni' }
  const m = RE_NIE.exec(v)
  if (!m) return { ok: false, codigo: 'formato' }
  const prefijo = { X: '0', Y: '1', Z: '2' }[m[1] as 'X' | 'Y' | 'Z']
  const esperada = letraDni(prefijo + (m[2] as string))
  if (esperada !== m[3]) return { ok: false, codigo: 'letra', esperada }
  return { ok: true, normalizado: v }
}

const RE_CIF = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/
const LETRAS_CIF = 'JABCDEFGHI'

export function validarCIF(entrada: string): ResultadoDoc {
  const v = normalizarDocumento(entrada)
  const m = RE_CIF.exec(v)
  if (!m) return { ok: false, codigo: 'formato' }
  const [, org, cuerpo, control] = m as unknown as [string, string, string, string]
  let pares = 0
  let impares = 0
  for (let i = 0; i < 7; i++) {
    const d = Number(cuerpo.charAt(i))
    if (i % 2 === 1) pares += d
    else {
      const doble = d * 2
      impares += Math.floor(doble / 10) + (doble % 10)
    }
  }
  const digito = (10 - ((pares + impares) % 10)) % 10
  const letra = LETRAS_CIF.charAt(digito)
  const soloLetra = 'NPQRSW'.includes(org)
  const soloDigito = 'ABEH'.includes(org)
  const valido = soloLetra ? control === letra : soloDigito ? control === String(digito) : control === letra || control === String(digito)
  if (!valido) return { ok: false, codigo: 'control', esperada: soloLetra ? letra : String(digito) }
  return { ok: true, normalizado: v }
}
