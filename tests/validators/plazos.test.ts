import { describe, expect, it } from 'vitest'
import { plazo24h, fechaPurga, estadoPurga } from '../../src/domain/plazos'

describe('plazo de comunicación de 24 h', () => {
  const entrada = '2024-12-02T15:00'

  it('vence 24 h después de la entrada', () => {
    const p = plazo24h(entrada, new Date('2024-12-02T15:00:00'))
    expect(p.vence.getTime()).toBe(new Date('2024-12-03T15:00:00').getTime())
    expect(p.horasRestantes).toBeCloseTo(24, 5)
    expect(p.estado).toBe('ok')
  })

  it('"próximo" cuando quedan 6 h o menos', () => {
    expect(plazo24h(entrada, new Date('2024-12-03T09:00:00')).estado).toBe('proximo')
    expect(plazo24h(entrada, new Date('2024-12-03T08:59:00')).estado).toBe('ok')
  })

  it('"vencido" cuando ya ha pasado, con horas negativas', () => {
    const p = plazo24h(entrada, new Date('2024-12-03T17:30:00'))
    expect(p.estado).toBe('vencido')
    expect(p.horasRestantes).toBeCloseTo(-2.5, 5)
  })
})

describe('conservación de 3 años y purga', () => {
  it('la fecha de purga es la fecha de salida + 3 años', () => {
    expect(fechaPurga('2024-12-02T11:00')).toBe('2027-12-02')
  })

  it('estado: vigente → aviso (30 días antes) → purgable', () => {
    expect(estadoPurga('2024-12-02T11:00', new Date('2027-10-01T00:00:00'))).toBe('vigente')
    expect(estadoPurga('2024-12-02T11:00', new Date('2027-11-05T00:00:00'))).toBe('aviso')
    expect(estadoPurga('2024-12-02T11:00', new Date('2027-12-01T23:59:00'))).toBe('aviso')
    expect(estadoPurga('2024-12-02T11:00', new Date('2027-12-02T00:00:00'))).toBe('purgable')
    expect(estadoPurga('2024-12-02T11:00', new Date('2030-01-01T00:00:00'))).toBe('purgable')
  })
})
