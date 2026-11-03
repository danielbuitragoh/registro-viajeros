import { describe, expect, it } from 'vitest'
import { letraNie, validarNIE } from '../src/nie.js'

const TABLA = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'] as const
const PREFIJO = { X: 0, Y: 1, Z: 2 } as const

describe('letraNie: X, Y y Z valen 0, 1 y 2 delante del cuerpo y se usa la misma tabla del DNI', () => {
  it.each([
    ['X1234567', 'L'],
    ['X0000000', 'T'],
    ['Y1234567', 'X'],
    ['Z1234567', 'R'],
    ['Y0000000', 'Z'],
    ['X8765432', 'V'],
    ['X0000021', 'K'],
    ['X0000022', 'E'],
  ])('letraNie(%s) = %s', (inicio, letra) => {
    expect(letraNie(inicio)).toBe(letra)
  })

  it('cubre los 23 restos con cada prefijo, contra la tabla transcrita aparte', () => {
    for (const [p, valor] of Object.entries(PREFIJO)) {
      for (let resto = 0; resto < 23; resto++) {
        // Busca un cuerpo de 7 cifras con ese resto para el prefijo dado
        let cuerpo = 0
        while ((valor * 10_000_000 + cuerpo) % 23 !== resto) cuerpo++
        expect(letraNie(`${p}${String(cuerpo).padStart(7, '0')}`), `${p}${cuerpo}`).toBe(TABLA[resto])
      }
    }
  })

  it('normaliza la entrada (minúsculas, guiones, espacios)', () => {
    expect(letraNie(' x-1234567 ')).toBe('L')
  })

  it.each(['', 'X123456', 'X12345678', 'A1234567', '12345678', 'X123456L', 'X1234567L'])('lanza RangeError con %j', (entrada) => {
    expect(() => letraNie(entrada)).toThrow(RangeError)
  })
})

describe('validarNIE: documentos válidos', () => {
  it.each(['X1234567L', 'X0000000T', 'Y1234567X', 'Z1234567R', 'Y0000000Z', 'X8765432V', 'x1234567l', 'X-1234567-L', ' Y 1234567 X '])('acepta %j', (nie) => {
    expect(validarNIE(nie).ok).toBe(true)
  })

  it('devuelve el documento normalizado', () => {
    expect(validarNIE('x-1234567-l')).toEqual({ ok: true, normalizado: 'X1234567L' })
  })

  it('X, Y y Z se sustituyen por 0, 1 y 2: mismo cuerpo, distinta letra', () => {
    expect(validarNIE('X1234567L').ok).toBe(true)
    expect(validarNIE('Y1234567X').ok).toBe(true)
    expect(validarNIE('Z1234567R').ok).toBe(true)
    expect(validarNIE('Y1234567L').ok).toBe(false)
  })

  it('con cada prefijo, solo una de las 23 letras es válida', () => {
    for (const p of ['X', 'Y', 'Z']) {
      const validas = TABLA.filter((l) => validarNIE(`${p}7654321${l}`).ok)
      expect(validas, p).toEqual([letraNie(`${p}7654321`)])
    }
  })
})

describe('validarNIE: letra de control incorrecta', () => {
  it('devuelve «letra» y la esperada', () => {
    expect(validarNIE('X1234567A')).toEqual({ ok: false, codigo: 'letra', esperada: 'L' })
    expect(validarNIE('Z1234567A')).toEqual({ ok: false, codigo: 'letra', esperada: 'R' })
  })
})

describe('validarNIE: formato', () => {
  it.each([
    'A1234567L', // prefijo que no es X, Y ni Z
    'X123456L', // 6 cifras
    'X12345678L', // 8 cifras
    '',
    '   ',
    'XXXXXXXXX',
    'X1234567',
    'X1234567LL',
    'L1234567A', // un NIF especial no es un NIE
    'X１２３４５６７L',
    '1X234567L',
  ])('rechaza %j con «formato»', (nie) => {
    expect(validarNIE(nie)).toEqual({ ok: false, codigo: 'formato' })
  })

  it('no se rompe con entradas que no son texto', () => {
    for (const basura of [null, undefined, 1234567, {}, [], false]) {
      expect(validarNIE(basura as unknown as string)).toEqual({ ok: false, codigo: 'formato' })
    }
  })
})

describe('validarNIE: DNI puesto como NIE', () => {
  it('devuelve «parece_dni»', () => {
    expect(validarNIE('12345678Z')).toEqual({ ok: false, codigo: 'parece_dni' })
  })

  it('lo detecta aunque la letra del DNI sea incorrecta', () => {
    expect(validarNIE('12345678A')).toEqual({ ok: false, codigo: 'parece_dni' })
  })
})
