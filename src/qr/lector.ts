/**
 * Lectura de QR en recepción, sin red:
 *  - si el navegador tiene BarcodeDetector con soporte de QR (Chrome/Edge en Android, macOS, ChromeOS…), se usa ese;
 *  - si no, jsQR: JavaScript puro empaquetado con la app (sin dependencias ni llamadas a internet; además, la CSP
 *    de producción solo permite conexiones al propio origen).
 */
import jsQR from 'jsqr'
import { PREFIJO_CODIGO } from '../huesped/ficha'

export interface ImagenRGBA {
  data: Uint8ClampedArray
  width: number
  height: number
}
export type FuenteImagen = HTMLVideoElement | ImageBitmap | HTMLCanvasElement | HTMLImageElement
export interface Detector {
  tipo: 'nativo' | 'local'
  /** Texto del primer QR encontrado, o null si no hay ninguno. */
  detectar(fuente: FuenteImagen): Promise<string | null>
}

/** Decodifica un QR a partir de píxeles RGBA (jsQR). Prueba también colores invertidos (móviles en modo oscuro). */
export function decodificarImagen(img: ImagenRGBA): string | null {
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })
  return r?.data ? r.data : null
}

const LADO_MAX = 1280

function pixeles(fuente: FuenteImagen): ImagenRGBA | null {
  const w = 'videoWidth' in fuente ? fuente.videoWidth : fuente.width
  const h = 'videoHeight' in fuente ? fuente.videoHeight : fuente.height
  if (!w || !h) return null // el vídeo aún no tiene imagen
  const k = Math.min(1, LADO_MAX / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * k)
  canvas.height = Math.round(h * k)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

interface BarcodeDetectorNativo {
  new (opciones: { formats: string[] }): { detect(fuente: FuenteImagen): Promise<{ rawValue: string }[]> }
  getSupportedFormats?: () => Promise<string[]>
}

export async function crearDetector(): Promise<Detector> {
  const BD = (globalThis as { BarcodeDetector?: BarcodeDetectorNativo }).BarcodeDetector
  if (typeof BD === 'function') {
    try {
      const formatos = BD.getSupportedFormats ? await BD.getSupportedFormats() : []
      if (formatos.includes('qr_code')) {
        const bd = new BD({ formats: ['qr_code'] })
        return { tipo: 'nativo', detectar: async (f) => (await bd.detect(f))[0]?.rawValue ?? null }
      }
    } catch {
      /* sin soporte real: alternativa local */
    }
  }
  return {
    tipo: 'local',
    detectar: async (f) => {
      const img = pixeles(f)
      return img ? decodificarImagen(img) : null
    },
  }
}

export type Lectura = { tipo: 'codigo'; codigo: string } | { tipo: 'enlace' } | { tipo: 'otro' }

/** ¿Lo leído es un código de ficha, el enlace del huésped (confusión habitual) u otra cosa? */
export function clasificarLectura(texto: string): Lectura {
  const t = texto.trim()
  if (t.startsWith(PREFIJO_CODIGO) && /^[A-Za-z0-9_-]+$/.test(t.slice(PREFIJO_CODIGO.length))) return { tipo: 'codigo', codigo: t }
  if (t.includes('#/huesped/')) return { tipo: 'enlace' }
  return { tipo: 'otro' }
}
