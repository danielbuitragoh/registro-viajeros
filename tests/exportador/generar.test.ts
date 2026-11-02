import { describe, expect, it } from 'vitest'
import { generarFichero } from '../../src/exportador'
import { adulto, establecimiento, menor, reserva } from '../fixtures'

describe('generarFichero — valida SIEMPRE antes de entregar nada', () => {
  it('reservas correctas → XML + nombre de fichero + ids incluidos', () => {
    const r = generarFichero(establecimiento(), [reserva(), reserva({ id: 'r2', referencia: 'R2' })], 'partes', new Date('2026-11-02T10:00:00'))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.nombreFichero).toBe('partes-viajeros_20261102-1000.xml')
      expect(r.reservasIncluidas).toEqual(['r1', 'r2'])
      expect(r.xml).toContain('<peticion>')
    }
  })

  it('sin reservas seleccionadas → error', () => {
    const r = generarFichero(establecimiento(), [], 'partes')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.map((e) => e.codigo)).toContain('sin_reservas')
  })

  it('una reserva con errores bloquea la exportación y se identifica por reservaId / viajeroId', () => {
    const mala = reserva({ id: 'rMala', viajeros: [adulto({ numeroDocumento: '12345678A' })] })
    const r = generarFichero(establecimiento(), [reserva(), mala], 'partes')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      const e = r.errores.find((x) => x.codigo === 'doc_letra')
      expect(e).toMatchObject({ reservaId: 'rMala', viajeroId: 'v1', campo: 'numeroDocumento' })
    }
  })

  it('los AVISOS no bloquean y se devuelven', () => {
    const r = generarFichero(establecimiento(), [reserva({ numPersonas: 3 })], 'partes')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.avisos.map((a) => a.codigo)).toContain('viajeros_cuenta')
  })

  it('partes: exige código de establecimiento (≤10 caracteres)', () => {
    for (const codigo of ['', '12345678901']) {
      const r = generarFichero(establecimiento({ codigoEstablecimiento: codigo }), [reserva()], 'partes')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.errores.map((e) => e.campo)).toContain('codigoEstablecimiento')
    }
  })

  it('reservas: sin código, exige nombre y dirección del establecimiento', () => {
    const r = generarFichero(
      establecimiento({ codigoEstablecimiento: '', nombre: '', direccion: undefined }),
      [reserva({ viajeros: [adulto({ esTitular: true })] })],
      'reservas',
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.map((e) => e.campo)).toEqual(expect.arrayContaining(['nombre', 'direccion']))
  })

  it('un parte con menor y adulto responsable se exporta y supera la validación del XML', () => {
    const r = generarFichero(establecimiento(), [reserva({ viajeros: [adulto(), menor()], numPersonas: 2 })], 'partes')
    expect(r.ok).toBe(true)
  })

  it('un fichero no puede mezclar tipos: el tipo se elige al exportar', () => {
    const p = generarFichero(establecimiento(), [reserva()], 'partes')
    const rs = generarFichero(establecimiento(), [reserva({ viajeros: [adulto({ esTitular: true })] })], 'reservas')
    expect(p.ok && rs.ok).toBe(true)
    if (p.ok && rs.ok) {
      expect(p.xml).toContain('<codigoEstablecimiento>')
      expect(rs.xml).not.toContain('<codigoEstablecimiento>')
    }
  })
})
