import { describe, expect, it } from 'vitest'
import { letraDni, validarDNI } from '../src/dni.js'

const TABLA = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'] as const

describe('validarDNI: documentos válidos', () => {
  it.each(['12345678Z', '00000000T', '99999999R', '87654321X', '12345678z', '12.345.678-Z', ' 12 345 678 z '])('acepta %j', (dni) => {
    expect(validarDNI(dni).ok).toBe(true)
  })

  it('devuelve el documento normalizado y nada más (sin aviso)', () => {
    expect(validarDNI('12.345.678-z')).toEqual({ ok: true, normalizado: '12345678Z' })
  })

  it.each(TABLA.map((letra, resto) => [resto, letra] as const))('con el resto %i la única letra válida es %s', (resto, letra) => {
    const cuerpo = String(resto).padStart(8, '0')
    for (const candidata of TABLA) {
      expect(validarDNI(`${cuerpo}${candidata}`).ok, `${cuerpo}${candidata}`).toBe(candidata === letra)
    }
  })

  it('valida la letra de cualquier número, también los de 8 cifras con resto alto', () => {
    for (const n of [1, 22, 23, 24, 12_345_678, 76_543_210, 99_999_998, 99_999_999]) {
      const cuerpo = String(n).padStart(8, '0')
      expect(validarDNI(`${cuerpo}${letraDni(n)}`).ok, cuerpo).toBe(true)
    }
  })
})

describe('validarDNI: letra de control incorrecta', () => {
  it('devuelve el código «letra» y la letra esperada', () => {
    expect(validarDNI('12345678A')).toEqual({ ok: false, codigo: 'letra', esperada: 'Z' })
  })

  it('las letras I, O y U (formato A-Z pero fuera de la tabla) dan «letra» con la esperada', () => {
    for (const l of ['I', 'O', 'U']) expect(validarDNI(`00000000${l}`)).toEqual({ ok: false, codigo: 'letra', esperada: 'T' })
  })
})

describe('validarDNI: formato', () => {
  it.each([
    '1234567Z', // 7 cifras
    '123456789Z', // 9 cifras
    'ABCDEFGHZ',
    '12345678', // sin letra
    '',
    '   ',
    '1234567ZZ',
    'Z12345678',
    '１２３４５６７８Z', // cifras de ancho completo
    '12345678Ñ',
    '12345678Z1',
    '12345678ZZ',
    '1234 5678 Z 9',
    '12345678-',
    '--',
  ])('rechaza %j con «formato»', (dni) => {
    expect(validarDNI(dni)).toEqual({ ok: false, codigo: 'formato' })
  })

  it('no se rompe con entradas que no son texto (JavaScript sin tipos)', () => {
    for (const basura of [null, undefined, 12345678, {}, [], true, Symbol.iterator]) {
      expect(validarDNI(basura as unknown as string)).toEqual({ ok: false, codigo: 'formato' })
    }
  })

  it('no se rompe con textos enormes ni con caracteres raros', () => {
    expect(validarDNI('1'.repeat(1_000_000)).ok).toBe(false)
    expect(validarDNI('\u0000\ud800💥')).toEqual({ ok: false, codigo: 'formato' })
  })
})

describe('validarDNI: NIE puesto como DNI', () => {
  it.each(['X1234567L', 'Y1234567X', 'Z1234567R', 'x-1234567-l'])('%j → «parece_nie»', (nie) => {
    expect(validarDNI(nie)).toEqual({ ok: false, codigo: 'parece_nie' })
  })

  it('lo detecta aunque la letra de control del NIE sea incorrecta (el error de fondo es el tipo)', () => {
    expect(validarDNI('X1234567A')).toEqual({ ok: false, codigo: 'parece_nie' })
  })
})

describe('validarDNI: NIF de la forma K, L o M (menores, residentes en el extranjero…)', () => {
  it.each(['K1234567A', 'L1234567B', 'M1234567C', 'k1234567a', 'M-1234567-C'])('acepta %j solo por formato y avisa de que no se comprueba el control', (nif) => {
    const r = validarDNI(nif)
    expect(r).toEqual({ ok: true, normalizado: nif.toUpperCase().replace(/-/g, ''), aviso: 'control_no_verificado' })
  })

  it.each(['K123456A', 'K12345678A', 'K1234567', 'N1234567A', 'K12345671'])('pero rechaza %j si no tiene esa forma', (nif) => {
    expect(validarDNI(nif)).toEqual({ ok: false, codigo: 'formato' })
  })
})
