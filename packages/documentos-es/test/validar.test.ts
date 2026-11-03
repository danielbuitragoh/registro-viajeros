import { describe, expect, it } from 'vitest'
import { validarDocumento } from '../src/validar.js'

describe('validarDocumento: detecta el tipo y aplica su validación', () => {
  it.each([
    ['12345678Z', 'DNI'],
    ['12.345.678-z', 'DNI'],
    ['X1234567L', 'NIE'],
    ['x-1234567-l', 'NIE'],
    ['A28015865', 'CIF'],
    ['Q2826000H', 'CIF'],
  ] as const)('%s es un %s válido', (entrada, tipo) => {
    const r = validarDocumento(entrada)
    expect(r.ok).toBe(true)
    expect(r.tipo).toBe(tipo)
    if (r.ok) expect(r.normalizado).toBe(entrada.toUpperCase().replace(/[\s.-]/g, ''))
  })

  it('conserva el aviso de los NIF especiales K, L y M', () => {
    expect(validarDocumento('K1234567A')).toEqual({ ok: true, tipo: 'DNI', normalizado: 'K1234567A', aviso: 'control_no_verificado' })
  })

  it.each([
    ['12345678A', 'DNI', { codigo: 'letra', esperada: 'Z' }],
    ['X1234567A', 'NIE', { codigo: 'letra', esperada: 'L' }],
    ['A28015864', 'CIF', { codigo: 'control', esperada: '5' }],
    ['N2801586A', 'CIF', { codigo: 'control', esperada: 'E' }],
  ] as const)('%s: es un %s con el control mal', (entrada, tipo, error) => {
    expect(validarDocumento(entrada)).toEqual({ ok: false, tipo, ...error })
  })

  it.each(['', '   ', 'hola', '1234', 'I28015865', '12345678', 'X123456L'])('%j no encaja en ningún tipo: tipo null y «formato»', (entrada) => {
    expect(validarDocumento(entrada)).toEqual({ ok: false, tipo: null, codigo: 'formato' })
  })

  it('no se rompe con entradas que no son texto', () => {
    for (const basura of [null, undefined, 1, {}, []]) {
      expect(validarDocumento(basura as unknown as string)).toEqual({ ok: false, tipo: null, codigo: 'formato' })
    }
  })

  it('con la forma de un tipo no da nunca «parece_dni» ni «parece_nie» (esos solo salen de validarNIE y validarDNI)', () => {
    for (const e of ['12345678Z', 'X1234567L', '12345678A', 'X1234567A']) {
      const r = validarDocumento(e)
      if (!r.ok) expect(['parece_dni', 'parece_nie']).not.toContain(r.codigo)
    }
  })
})
