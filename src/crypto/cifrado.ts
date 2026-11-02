/**
 * Cifrado local con Web Crypto: AES-256-GCM, clave derivada de la contraseña con PBKDF2-HMAC-SHA256.
 * Sin dependencias ni llamadas externas. La clave derivada NO es exportable.
 */

/** Recomendación de OWASP (2023) para PBKDF2-HMAC-SHA256. Se guarda junto a cada almacén para poder subirla en el futuro. */
export const ITERACIONES_PBKDF2 = 600_000
const LONGITUD_SAL = 16
const LONGITUD_IV = 12

export interface Sobre {
  /** IV de 12 bytes (base64) */
  iv: string
  /** Texto cifrado + etiqueta de autenticación GCM (base64) */
  ct: string
}

export function a64(bytes: Uint8Array): string {
  let s = ''
  const trozo = 0x8000
  for (let i = 0; i < bytes.length; i += trozo) s += String.fromCharCode(...bytes.subarray(i, i + trozo))
  return btoa(s)
}

export function de64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export function nuevaSal(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(LONGITUD_SAL))
}

const enc = new TextEncoder()
const dec = new TextDecoder()

export async function derivarClave(
  password: string,
  sal: Uint8Array<ArrayBuffer>,
  iteraciones: number = ITERACIONES_PBKDF2,
): Promise<CryptoKey> {
  // NFC: la misma contraseña escrita con "ñ" compuesta o descompuesta da la misma clave en cualquier dispositivo.
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal, iterations: iteraciones, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function cifrar(clave: CryptoKey, texto: string, aad?: string): Promise<Sobre> {
  const iv = crypto.getRandomValues(new Uint8Array(LONGITUD_IV))
  const params: AesGcmParams = { name: 'AES-GCM', iv, ...(aad ? { additionalData: enc.encode(aad) } : {}) }
  const ct = new Uint8Array(await crypto.subtle.encrypt(params, clave, enc.encode(texto)))
  return { iv: a64(iv), ct: a64(ct) }
}

/** Lanza si la clave es incorrecta, el contenido fue manipulado o el contexto (AAD) no coincide. */
export async function descifrar(clave: CryptoKey, sobre: Sobre, aad?: string): Promise<string> {
  const params: AesGcmParams = { name: 'AES-GCM', iv: de64(sobre.iv), ...(aad ? { additionalData: enc.encode(aad) } : {}) }
  return dec.decode(await crypto.subtle.decrypt(params, clave, de64(sobre.ct)))
}
