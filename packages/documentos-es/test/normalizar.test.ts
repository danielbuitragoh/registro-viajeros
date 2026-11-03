import { describe, expect, it } from 'vitest'
import { normalizarDocumento } from '../src/normalizar.js'

describe('normalizarDocumento', () => {
  it('pasa a mayúsculas', () => {
    expect(normalizarDocumento('x1234567l')).toBe('X1234567L')
  })

  it.each([
    [' 12.345.678-z ', '12345678Z'],
    ['x-1234567 l', 'X1234567L'],
    ['12 345 678 Z', '12345678Z'],
    ['12_345_678_z', '12345678Z'],
    ['\t12345678Z\n', '12345678Z'],
    ['12 345 678Z', '12345678Z'], // espacio duro (típico al copiar de una web o un PDF)
  ])('quita espacios, tabuladores, puntos, guiones y guiones bajos: %j → %s', (entrada, esperado) => {
    expect(normalizarDocumento(entrada)).toBe(esperado)
  })

  it('no toca el resto de caracteres (la validación decide si son válidos)', () => {
    expect(normalizarDocumento('12/345*678?z')).toBe('12/345*678?Z')
  })

  it('es idempotente y admite la cadena vacía', () => {
    expect(normalizarDocumento('')).toBe('')
    expect(normalizarDocumento(normalizarDocumento(' a-b.c '))).toBe('ABC')
  })
})
