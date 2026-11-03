import { describe, expect, it } from 'vitest'
import { letraDni } from '../src/dni.js'

// Tabla oficial (Orden EHA/451/2008) transcrita aquí a mano, de forma independiente al código: resto 0..22 → letra.
const TABLA = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'] as const

describe('letraDni: los 23 restos del módulo 23', () => {
  it('la tabla tiene 23 letras distintas y sin I, Ñ, O ni U', () => {
    expect(TABLA).toHaveLength(23)
    expect(new Set(TABLA).size).toBe(23)
    for (const prohibida of ['I', 'Ñ', 'O', 'U']) expect(TABLA).not.toContain(prohibida)
  })

  it.each(TABLA.map((letra, resto) => [resto, letra] as const))('número con resto %i → letra %s', (resto, letra) => {
    expect(letraDni(resto)).toBe(letra)
    expect(letraDni(String(resto).padStart(8, '0'))).toBe(letra)
    // El mismo resto, sumando 23 una y otra vez: la letra se repite
    expect(letraDni(resto + 23 * 1_000_000)).toBe(letra)
  })

  it.each([
    ['12345678', 'Z'],
    ['00000000', 'T'],
    ['99999999', 'R'],
    ['00000001', 'R'],
    ['87654321', 'X'],
    ['50000000', 'R'],
  ])('letraDni(%s) = %s', (numero, letra) => {
    expect(letraDni(numero)).toBe(letra)
    expect(letraDni(Number(numero))).toBe(letra)
  })

  it('acepta cifras sin ceros a la izquierda (el equivalente numérico de un NIE puede tener menos de 8)', () => {
    expect(letraDni('1234567')).toBe(TABLA[1234567 % 23])
    expect(letraDni('7')).toBe('F')
  })

  it.each([
    ['vacío', ''],
    ['con letras', '1234567A'],
    ['con signo', '-1'],
    ['con decimales', '12.5'],
    ['con espacios', ' 12345678'],
    ['de más de 8 cifras', '123456789'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negativo', -1],
    ['decimal', 1.5],
    ['mayor de 99 999 999', 100_000_000],
  ])('lanza RangeError con una entrada %s', (_nombre, entrada) => {
    expect(() => letraDni(entrada)).toThrow(RangeError)
  })
})
