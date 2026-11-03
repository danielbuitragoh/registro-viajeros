import { describe, expect, it } from 'vitest'
import { FRECUENCIAS_COPIA, recordatorioCopia, viajeroEjemplo } from '../../src/domain/preferencias'
import { validarViajero } from '../../src/validators/viajero'

const dia = (s: string) => new Date(`${s}T10:00:00`)

describe('recordatorio de copia de seguridad', () => {
  it('frecuencias: cada semana (por defecto), cada 2 semanas, cada mes o no recordar', () => {
    expect(FRECUENCIAS_COPIA.map((f) => f.dias)).toEqual([7, 14, 30, 0])
  })

  it('nunca se ha hecho copia y ya hay reservas reales: recordarlo', () => {
    expect(recordatorioCopia({ cadaDias: 7 }, dia('2026-11-02'), 3)).toEqual({ tipo: 'nunca' })
  })

  it('sin reservas reales (ninguna o solo la de prueba): no molesta', () => {
    expect(recordatorioCopia({ cadaDias: 7 }, dia('2026-11-02'), 0)).toBeUndefined()
  })

  it('última copia hace más días de los elegidos: vencida, con los días', () => {
    expect(recordatorioCopia({ cadaDias: 7, ultima: '2026-10-25T09:00:00.000Z' }, dia('2026-11-02'), 1)).toEqual({ tipo: 'vencida', dias: 8 })
  })

  it('copia reciente: nada', () => {
    expect(recordatorioCopia({ cadaDias: 7, ultima: '2026-10-30T09:00:00.000Z' }, dia('2026-11-02'), 1)).toBeUndefined()
  })

  it('«no recordar» lo desactiva', () => {
    expect(recordatorioCopia({ cadaDias: 0 }, dia('2026-11-02'), 9)).toBeUndefined()
  })

  it('sin preferencias guardadas (versiones anteriores): semanal', () => {
    expect(recordatorioCopia(undefined, dia('2026-11-02'), 2)).toEqual({ tipo: 'nunca' })
  })
})

describe('viajero de ejemplo del asistente', () => {
  it('es claramente ficticio y forma un parte válido, sin usar ningún código INE (domicilio fuera de España)', () => {
    const v = viajeroEjemplo('e1')
    expect(v.nombre).toBe('Ana')
    expect(v.apellido1).toBe('Ejemplo')
    expect(v.numeroDocumento).toMatch(/EJEMPLO/)
    expect(v.direccion.pais).not.toBe('ESP')
    expect(v.direccion.codigoMunicipio).toBeUndefined()
    expect(validarViajero(v, { fechaEntrada: '2026-11-02', modo: 'parte' }).filter((i) => i.gravedad === 'error')).toEqual([])
  })
})
