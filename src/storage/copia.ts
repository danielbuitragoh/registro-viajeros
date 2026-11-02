/**
 * Copia de seguridad cifrada. Un único fichero JSON con cabecera en claro (formato, versión, parámetros de la KDF)
 * y el contenido cifrado con AES-GCM, clave derivada (PBKDF2) de la contraseña de la copia (puede ser distinta de
 * la del almacén). Sin esa contraseña el fichero es ilegible.
 */
import { ITERACIONES_PBKDF2, a64, cifrar, de64, derivarClave, descifrar, nuevaSal } from '../crypto/cifrado'
import type { Establecimiento, Reserva } from '../domain/tipos'
import { LONGITUD_MINIMA_PASSWORD, type Almacen } from './almacen'

const FORMATO = 'registro-viajeros-copia'
const VERSION = 1
const AAD = 'registro-viajeros-copia/v1'

export interface CabeceraCopia {
  formato: typeof FORMATO
  version: number
  creada: string
  kdf: { alg: 'PBKDF2-SHA256'; iteraciones: number; sal: string }
  iv: string
  ct: string
}

interface Contenido {
  reservas: Reserva[]
  configuracion?: Establecimiento
}

export async function exportarCopia(almacen: Almacen, password: string, opciones: { iteraciones?: number } = {}): Promise<string> {
  if (password.length < LONGITUD_MINIMA_PASSWORD) throw new Error(`La contraseña de la copia debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`)
  const contenido: Contenido = {
    reservas: await almacen.listar<Reserva>('reservas'),
    configuracion: await almacen.obtener<Establecimiento>('config', 'establecimiento'),
  }
  const iteraciones = opciones.iteraciones ?? ITERACIONES_PBKDF2
  const sal = nuevaSal()
  const clave = await derivarClave(password, sal, iteraciones)
  const sobre = await cifrar(clave, JSON.stringify(contenido), AAD)
  const cab: CabeceraCopia = {
    formato: FORMATO,
    version: VERSION,
    creada: new Date().toISOString(),
    kdf: { alg: 'PBKDF2-SHA256', iteraciones, sal: a64(sal) },
    ...sobre,
  }
  return JSON.stringify(cab)
}

export function leerCabeceraCopia(fichero: string): CabeceraCopia {
  let obj: unknown
  try {
    obj = JSON.parse(fichero)
  } catch {
    throw new Error('Formato no reconocido: el fichero no es una copia de seguridad de esta aplicación')
  }
  const c = obj as Partial<CabeceraCopia> | null
  if (!c || c.formato !== FORMATO || !c.kdf || typeof c.iv !== 'string' || typeof c.ct !== 'string') {
    throw new Error('Formato no reconocido: el fichero no es una copia de seguridad de esta aplicación')
  }
  if (c.version !== VERSION) throw new Error(`Versión de copia no soportada (${String(c.version)}). Actualiza la aplicación`)
  return c as CabeceraCopia
}

export interface ResultadoImportacion {
  reservas: number
  configuracion: boolean
}

export async function importarCopia(
  almacen: Almacen,
  fichero: string,
  password: string,
  modo: 'fusionar' | 'reemplazar',
): Promise<ResultadoImportacion> {
  const cab = leerCabeceraCopia(fichero)
  let contenido: Contenido
  try {
    const clave = await derivarClave(password, de64(cab.kdf.sal), cab.kdf.iteraciones)
    contenido = JSON.parse(await descifrar(clave, cab, AAD)) as Contenido
  } catch {
    throw new Error('Contraseña incorrecta o fichero dañado: no se pudo descifrar la copia')
  }

  if (modo === 'reemplazar') {
    for (const r of await almacen.listar<Reserva>('reservas')) await almacen.borrar('reservas', r.id)
    for (const r of contenido.reservas) await almacen.guardar('reservas', r.id, r)
    if (contenido.configuracion) await almacen.guardar('config', 'establecimiento', contenido.configuracion)
  } else {
    for (const r of contenido.reservas) {
      const local = await almacen.obtener<Reserva>('reservas', r.id)
      if (!local || r.modificadaEn > local.modificadaEn) await almacen.guardar('reservas', r.id, r)
    }
    if (contenido.configuracion && !(await almacen.obtener('config', 'establecimiento'))) {
      await almacen.guardar('config', 'establecimiento', contenido.configuracion)
    }
  }
  return { reservas: contenido.reservas.length, configuracion: contenido.configuracion !== undefined }
}
