import { describe, expect, it } from 'vitest'
import { siguientePaso } from '../../src/domain/siguientePaso'
import { adulto, reserva } from '../fixtures'

describe('siguiente paso de una reserva (lo que recepción tiene que hacer ahora)', () => {
  it('sin fichas ni enlace: enviar el enlace al huésped', () => {
    expect(siguientePaso(reserva({ viajeros: [] }))).toEqual({ tipo: 'enlace' })
  })

  it('sin fichas y con enlace creado: esperar al huésped y escanear su QR', () => {
    expect(siguientePaso(reserva({ viajeros: [], claveEnlace: 'k' }))).toEqual({ tipo: 'esperar' })
  })

  it('fichas con errores: revisar N datos', () => {
    expect(siguientePaso(reserva({ viajeros: [adulto({ nombre: '', apellido1: '' })] }))).toEqual({ tipo: 'revisar', errores: 2 })
  })

  it('fichas válidas pero faltan personas: faltan fichas', () => {
    expect(siguientePaso(reserva({ numPersonas: 3, viajeros: [adulto()] }))).toEqual({ tipo: 'faltan', fichas: 1, personas: 3 })
  })

  it('completo: exportar el fichero', () => {
    expect(siguientePaso(reserva({ viajeros: [adulto()] }))).toEqual({ tipo: 'exportar' })
  })

  it('exportado y sin cambios después: recordar subirlo al portal', () => {
    expect(siguientePaso(reserva({ viajeros: [adulto()], exportadaEn: '2026-11-02T12:00:00.000Z', modificadaEn: '2026-11-02T11:00:00.000Z' }))).toEqual({ tipo: 'subir' })
  })

  it('exportado pero modificado después: vuelve a pedir exportar', () => {
    expect(siguientePaso(reserva({ viajeros: [adulto()], exportadaEn: '2026-11-02T10:00:00.000Z', modificadaEn: '2026-11-02T11:00:00.000Z' }))).toEqual({ tipo: 'exportar' })
  })
})
