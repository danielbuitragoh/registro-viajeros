/**
 * Enlace/QR por reserva para el modo huésped. Va en el FRAGMENTO de la URL (#/huesped/<datos>): el fragmento no se
 * envía nunca a ningún servidor. Contiene solo datos de la reserva (sin datos personales) y una clave aleatoria de
 * 256 bits con la que el móvil del huésped cifra la ficha que devuelve a recepción.
 */
import { a64url, de64url } from '../crypto/cifrado'
import type { Establecimiento, Reserva } from '../domain/tipos'

export type Idioma = 'es' | 'en'

export interface DatosEnlace {
  v: 1
  /** id de la reserva */
  rid: string
  /** nombre del establecimiento (para mostrarlo al huésped) */
  est: string
  /** entrada AAAA-MM-DDThh:mm */
  ent: string
  /** salida AAAA-MM-DDThh:mm */
  sal: string
  /** nº de personas de la reserva */
  n: number
  /** clave AES-GCM de 256 bits, base64url */
  k: string
  /** idioma inicial del formulario */
  l: Idioma
}

const PREFIJO = '#/huesped/'
const enc = new TextEncoder()
const dec = new TextDecoder()

export function generarClaveEnlace(): string {
  return a64url(crypto.getRandomValues(new Uint8Array(32)))
}

export function crearDatosEnlace(e: Establecimiento, r: Reserva, clave: string, idioma: Idioma): DatosEnlace {
  return { v: 1, rid: r.id, est: e.nombre, ent: r.entrada, sal: r.salida, n: r.numPersonas, k: clave, l: idioma }
}

export function codificarEnlace(datos: DatosEnlace, baseUrl: string): string {
  return `${baseUrl}${PREFIJO}${a64url(enc.encode(JSON.stringify(datos)))}`
}

/** Acepta la URL completa o solo el fragmento. Devuelve null si no es un enlace de huésped válido. */
export function decodificarEnlace(entrada: string): DatosEnlace | null {
  const i = entrada.indexOf(PREFIJO)
  if (i === -1) return null
  try {
    const obj = JSON.parse(dec.decode(de64url(entrada.slice(i + PREFIJO.length)))) as Partial<DatosEnlace> | null
    if (
      !obj ||
      obj.v !== 1 ||
      typeof obj.rid !== 'string' ||
      !obj.rid ||
      typeof obj.est !== 'string' ||
      typeof obj.ent !== 'string' ||
      typeof obj.sal !== 'string' ||
      !Number.isInteger(obj.n) ||
      (obj.n as number) < 1 ||
      typeof obj.k !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(obj.k) ||
      (obj.l !== 'es' && obj.l !== 'en')
    ) {
      return null
    }
    return obj as DatosEnlace
  } catch {
    return null
  }
}
