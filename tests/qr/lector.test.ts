import QRCode from 'qrcode'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clasificarLectura, crearDetector, decodificarImagen } from '../../src/qr/lector'
import { cifrarFicha } from '../../src/huesped/ficha'
import { generarClaveEnlace } from '../../src/huesped/enlace'
import { adulto, extranjero } from '../fixtures'

/** Pinta un QR (generado con la misma librería que usa la app) como píxeles RGBA, sin canvas. */
function qrComoImagen(texto: string, escala = 4, margen = 4) {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: 'L' })
  const lado = (modules.size + margen * 2) * escala
  const data = new Uint8ClampedArray(lado * lado * 4).fill(255)
  for (let y = 0; y < modules.size; y++)
    for (let x = 0; x < modules.size; x++)
      if (modules.get(y, x))
        for (let dy = 0; dy < escala; dy++)
          for (let dx = 0; dx < escala; dx++) {
            const i = (((y + margen) * escala + dy) * lado + (x + margen) * escala + dx) * 4
            data[i] = data[i + 1] = data[i + 2] = 0
          }
  return { data, width: lado, height: lado }
}

afterEach(() => vi.unstubAllGlobals())

describe('lector de QR sin red (jsQR empaquetado en la app)', () => {
  it('lee un código de ficha real (dos viajeros, cifrado) desde los píxeles de un QR', async () => {
    const codigo = await cifrarFicha('res-qr', generarClaveEnlace(), [adulto(), extranjero()])
    expect(codigo.length).toBeGreaterThan(300)
    expect(decodificarImagen(qrComoImagen(codigo))).toBe(codigo)
  })

  it('devuelve null si en la imagen no hay ningún QR', () => {
    const blanco = { data: new Uint8ClampedArray(200 * 200 * 4).fill(255), width: 200, height: 200 }
    expect(decodificarImagen(blanco)).toBeNull()
  })
})

describe('elección del detector', () => {
  it('usa BarcodeDetector del navegador cuando existe y admite qr_code', async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: 'RV1.abc' }])
    class BD {
      static getSupportedFormats = vi.fn().mockResolvedValue(['ean_13', 'qr_code'])
      constructor(public opts: unknown) {}
      detect = detect
    }
    vi.stubGlobal('BarcodeDetector', BD)
    const d = await crearDetector()
    expect(d.tipo).toBe('nativo')
    expect(await d.detectar({} as ImageBitmap)).toBe('RV1.abc')
  })

  it('usa la alternativa local si no hay BarcodeDetector', async () => {
    vi.stubGlobal('BarcodeDetector', undefined)
    expect((await crearDetector()).tipo).toBe('local')
  })

  it('usa la alternativa local si BarcodeDetector no admite QR', async () => {
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        static getSupportedFormats = () => Promise.resolve(['ean_13'])
      },
    )
    expect((await crearDetector()).tipo).toBe('local')
  })
})

describe('qué se ha leído', () => {
  it('un código de ficha (RV1.) se acepta, sin espacios alrededor', () => {
    expect(clasificarLectura('  RV1.AAAA_bb-cc \n')).toEqual({ tipo: 'codigo', codigo: 'RV1.AAAA_bb-cc' })
  })
  it('el QR del ENLACE del huésped se reconoce para avisar de la confusión', () => {
    expect(clasificarLectura('https://x.test/app/#/huesped/eyJ2IjoxfQ')).toEqual({ tipo: 'enlace' })
  })
  it('cualquier otra cosa se rechaza', () => {
    expect(clasificarLectura('https://ejemplo.com')).toEqual({ tipo: 'otro' })
    expect(clasificarLectura('')).toEqual({ tipo: 'otro' })
  })
})
