import { describe, expect, it } from 'vitest'
import { generarClaveEnlace } from '../../src/huesped/enlace'
import { cifrarFicha } from '../../src/huesped/ficha'
import { importarCodigo } from '../../src/huesped/importar'
import { adulto, extranjero, reserva } from '../fixtures'

/** Importar el código del huésped sin saber de antemano de qué reserva es (escáner de «Hoy»). */
describe('importarCodigo', () => {
  const k1 = generarClaveEnlace()
  const k2 = generarClaveEnlace()
  const r1 = reserva({ id: 'r1', referencia: 'UNO', claveEnlace: k1, viajeros: [adulto({ id: 'a' })] })
  const r2 = reserva({ id: 'r2', referencia: 'DOS', claveEnlace: k2, viajeros: [] })

  it('reconoce la reserva por el propio código y añade las fichas (sin duplicar las que ya estaban)', async () => {
    const codigo = await cifrarFicha('r1', k1, [adulto({ id: 'a', nombre: 'Lucía (corregida)' }), extranjero({ id: 'b' })])
    const r = await importarCodigo([r1, r2], codigo, '2026-11-02T20:00:00.000Z')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reserva.id).toBe('r1')
    expect(r.importadas).toBe(2)
    expect(r.reserva.viajeros.map((v) => v.id)).toEqual(['a', 'b'])
    expect(r.reserva.viajeros[0]?.nombre).toBe('Lucía (corregida)')
    expect(r.reserva.modificadaEn).toBe('2026-11-02T20:00:00.000Z')
  })

  it('código de una reserva que no está en este dispositivo: lo dice', async () => {
    const codigo = await cifrarFicha('otra', k1, [adulto()])
    expect(await importarCodigo([r1, r2], codigo, 'x')).toEqual({ ok: false, error: 'no_encontrada' })
  })

  it('reserva sin enlace creado (no hay clave para descifrar)', async () => {
    const codigo = await cifrarFicha('r3', k1, [adulto()])
    expect(await importarCodigo([reserva({ id: 'r3' })], codigo, 'x')).toEqual({ ok: false, error: 'sin_enlace' })
  })

  it('clave equivocada o código manipulado: no se importa nada', async () => {
    const codigo = await cifrarFicha('r2', k1, [adulto()]) // cifrado con la clave de otra reserva
    expect(await importarCodigo([r1, r2], codigo, 'x')).toEqual({ ok: false, error: 'no_descifra' })
  })

  it('texto que no es un código de ficha', async () => {
    expect(await importarCodigo([r1], 'hola', 'x')).toEqual({ ok: false, error: 'formato' })
  })
})
