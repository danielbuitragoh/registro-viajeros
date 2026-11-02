import { describe, expect, it } from 'vitest'
import { letraDni, validarDNI, validarNIE, validarCIF, normalizarDocumento } from '../../src/validators/documentos'

describe('normalizarDocumento', () => {
  it('pasa a mayúsculas y quita espacios, guiones y puntos', () => {
    expect(normalizarDocumento(' 12.345.678-z ')).toBe('12345678Z')
    expect(normalizarDocumento('x-1234567 l')).toBe('X1234567L')
  })
})

describe('letra de control del DNI (módulo 23)', () => {
  // Valores calculados de forma independiente (n mod 23 sobre TRWAGMYFPDXBNJZSQVHLCKE)
  it.each([
    ['12345678', 'Z'],
    ['00000000', 'T'],
    ['99999999', 'R'],
    ['00000001', 'R'],
    ['87654321', 'X'],
    ['50000000', 'R'],
  ])('letraDni(%s) = %s', (num, letra) => {
    expect(letraDni(num)).toBe(letra)
  })
})

describe('validarDNI', () => {
  it.each(['12345678Z', '00000000T', '99999999R', '87654321X', '12345678z', '12.345.678-Z'])('acepta %s', (dni) => {
    expect(validarDNI(dni).ok).toBe(true)
  })

  it('devuelve el documento normalizado', () => {
    expect(validarDNI('12.345.678-z')).toEqual({ ok: true, normalizado: '12345678Z' })
  })

  it('rechaza una letra de control incorrecta e indica la esperada', () => {
    const r = validarDNI('12345678A')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.codigo).toBe('letra')
      expect(r.esperada).toBe('Z')
    }
  })

  it.each(['1234567Z', '123456789Z', 'ABCDEFGHZ', '12345678', '', '   ', '1234567ZZ'])('rechaza formato %j', (dni) => {
    const r = validarDNI(dni)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.codigo).toBe('formato')
  })

  it('detecta que un NIE se ha puesto como DNI', () => {
    const r = validarDNI('X1234567L')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.codigo).toBe('parece_nie')
  })

  it('NIF especiales K, L, M (menores, residentes en el extranjero, extranjeros sin NIE): solo formato, con aviso', () => {
    const r = validarDNI('K1234567A')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.aviso).toBe('control_no_verificado')
  })
})

describe('validarNIE', () => {
  it.each(['X1234567L', 'X0000000T', 'Y1234567X', 'Z1234567R', 'Y0000000Z', 'X8765432V', 'x1234567l'])('acepta %s', (nie) => {
    expect(validarNIE(nie).ok).toBe(true)
  })

  it('rechaza letra de control incorrecta', () => {
    const r = validarNIE('X1234567A')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.codigo).toBe('letra')
      expect(r.esperada).toBe('L')
    }
  })

  it('X, Y y Z se sustituyen por 0, 1 y 2 antes de calcular', () => {
    // mismo cuerpo numérico, distinto prefijo → distinta letra
    expect(validarNIE('Y1234567X').ok).toBe(true)
    expect(validarNIE('Y1234567L').ok).toBe(false)
  })

  it.each(['A1234567L', 'X123456L', 'X12345678L', '12345678Z', ''])('rechaza formato %j', (nie) => {
    const r = validarNIE(nie)
    expect(r.ok).toBe(false)
  })

  it('detecta que un DNI se ha puesto como NIE', () => {
    const r = validarNIE('12345678Z')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.codigo).toBe('parece_dni')
  })
})

describe('validarCIF', () => {
  // A28015865: CIF público de una gran empresa; Q/P/S/G: calculados de forma independiente
  it.each(['A28015865', 'B83191270', 'Q2826000H', 'P2807900B', 'G28102036', 'G2810203F', 'a28015865'])('acepta %s', (cif) => {
    expect(validarCIF(cif).ok).toBe(true)
  })

  it('A y B exigen dígito de control; Q, P y S exigen letra', () => {
    expect(validarCIF('A2801586E').ok).toBe(false) // A con letra
    expect(validarCIF('B8319127J').ok).toBe(false) // B con letra
    expect(validarCIF('Q28260008').ok).toBe(false) // Q con dígito
    expect(validarCIF('S2800000H').ok).toBe(true)
  })

  it('rechaza control incorrecto', () => {
    const r = validarCIF('A28015864')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.codigo).toBe('control')
  })

  it.each(['I28015865', 'A2801586', 'A280158655', '', '1234567890'])('rechaza formato %j', (cif) => {
    const r = validarCIF(cif)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.codigo).toBe('formato')
  })
})
