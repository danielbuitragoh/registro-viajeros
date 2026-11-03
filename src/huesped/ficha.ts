/**
 * Código de envío: la ficha que rellena el huésped, cifrada (AES-GCM) con la clave del enlace y ligada a su reserva.
 * Formato: "RV1." + base64url( [flags:1][longRid:1][rid utf-8][iv:12][texto cifrado] ). flags bit0 = comprimido (deflate-raw).
 * El huésped lo entrega a recepción como texto, QR o fichero; recepción lo importa en la reserva.
 */
import { LONGITUD_IV_BYTES, a64url, cifrarBytes, de64url, descifrarBytes } from '../crypto/cifrado'
import type { Viajero } from '../domain/tipos'

export const PREFIJO_CODIGO = 'RV1.'
const PREFIJO = PREFIJO_CODIGO
const enc = new TextEncoder()
const dec = new TextDecoder()

async function importarClave(claveB64url: string): Promise<CryptoKey> {
  const raw = de64url(claveB64url)
  if (raw.length !== 32) throw new Error('La clave del enlace no es válida')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

const hayCompresion = () => typeof CompressionStream !== 'undefined' && typeof Response !== 'undefined'

async function canalizar(datos: Uint8Array<ArrayBuffer>, t: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const flujo = (new Response(datos).body as ReadableStream<Uint8Array>).pipeThrough(t as unknown as ReadableWritablePair<Uint8Array, Uint8Array>)
  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

export async function cifrarFicha(rid: string, claveEnlace: string, viajeros: Viajero[]): Promise<string> {
  const clave = await importarClave(claveEnlace)
  let carga: Uint8Array<ArrayBuffer> = enc.encode(JSON.stringify(viajeros))
  let flags = 0
  if (hayCompresion()) {
    carga = await canalizar(carga, new CompressionStream('deflate-raw'))
    flags = 1
  }
  const { iv, ct } = await cifrarBytes(clave, carga, rid)
  const ridBytes = enc.encode(rid)
  const out = new Uint8Array(2 + ridBytes.length + iv.length + ct.length)
  out[0] = flags
  out[1] = ridBytes.length
  out.set(ridBytes, 2)
  out.set(iv, 2 + ridBytes.length)
  out.set(ct, 2 + ridBytes.length + iv.length)
  return PREFIJO + a64url(out)
}

function abrirSobre(codigo: string) {
  const mal = () => new Error('Código no válido: no es un código de ficha de esta aplicación')
  if (!codigo.startsWith(PREFIJO)) throw mal()
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = de64url(codigo.slice(PREFIJO.length).trim())
  } catch {
    throw mal()
  }
  const flags = bytes[0]
  const n = bytes[1]
  if (flags === undefined || n === undefined || bytes.length < 2 + n + LONGITUD_IV_BYTES + 16) throw mal()
  const rid = dec.decode(bytes.subarray(2, 2 + n))
  const iv = bytes.slice(2 + n, 2 + n + LONGITUD_IV_BYTES)
  const ct = bytes.slice(2 + n + LONGITUD_IV_BYTES)
  return { flags, rid, iv, ct }
}

/** Id de la reserva a la que pertenece el código (sin descifrar nada). */
export function reservaDeCodigo(codigo: string): string {
  return abrirSobre(codigo).rid
}

export async function descifrarFicha(codigo: string, claveEnlace: string, ridEsperado: string): Promise<Viajero[]> {
  const { flags, rid, iv, ct } = abrirSobre(codigo)
  if (rid !== ridEsperado) throw new Error('Este código pertenece a otra reserva')
  const clave = await importarClave(claveEnlace)
  let carga = await descifrarBytes(clave, iv, ct, rid)
  if (flags & 1) carga = await canalizar(carga, new DecompressionStream('deflate-raw'))
  const viajeros = JSON.parse(dec.decode(carga)) as Viajero[]
  if (!Array.isArray(viajeros)) throw new Error('Código no válido: contenido inesperado')
  return viajeros.map((v) => ({ ...v, origen: 'huesped' as const }))
}
