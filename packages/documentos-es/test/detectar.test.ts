import { describe, expect, it } from 'vitest'
import { detectarTipo } from '../src/detectar.js'

describe('detectarTipo: por la forma, sin comprobar el control', () => {
  it.each([
    ['12345678Z', 'DNI'],
    ['12345678A', 'DNI'], // letra incorrecta: sigue teniendo forma de DNI
    ['00000000T', 'DNI'],
    ['K1234567A', 'DNI'], // NIF especial (menores…)
    ['L1234567B', 'DNI'],
    ['M1234567C', 'DNI'],
    ['X1234567L', 'NIE'],
    ['Y1234567A', 'NIE'],
    ['Z0000000T', 'NIE'],
    ['A28015865', 'CIF'],
    ['Q2826000H', 'CIF'],
    ['N2801586E', 'CIF'],
    ['G28102036', 'CIF'],
  ])('%s → %s', (entrada, tipo) => {
    expect(detectarTipo(entrada)).toBe(tipo)
  })

  it('normaliza antes de decidir', () => {
    expect(detectarTipo(' 12.345.678-z ')).toBe('DNI')
    expect(detectarTipo('x-1234567 l')).toBe('NIE')
    expect(detectarTipo('a 28015865')).toBe('CIF')
  })

  it.each(['', '   ', '1234567Z', 'X123456L', 'I28015865', 'T12345678', 'ABC', '12345678', '2801586A5', 'A2801586', '１２３４５６７８Z'])(
    'devuelve null con %j',
    (entrada) => {
      expect(detectarTipo(entrada)).toBeNull()
    },
  )

  it('devuelve null con entradas que no son texto', () => {
    for (const basura of [null, undefined, 12345678, {}, []]) expect(detectarTipo(basura as unknown as string)).toBeNull()
  })

  it('cada letra inicial lleva a un único tipo (CIF, DNI especial K/L/M, NIE X/Y/Z o ninguno)', () => {
    const esperado = (l: string) => ('KLM'.includes(l) ? 'DNI' : 'XYZ'.includes(l) ? 'NIE' : 'ABCDEFGHJNPQRSUVW'.includes(l) ? 'CIF' : null)
    for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') expect(detectarTipo(`${l}1234567A`), l).toBe(esperado(l))
  })
})
