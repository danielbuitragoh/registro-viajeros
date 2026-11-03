import { describe, expect, it } from 'vitest'
import { mensajeError } from '../src/mensajes.js'
import type { CodigoError } from '../src/tipos.js'
import { validarCIF } from '../src/cif.js'
import { validarDNI } from '../src/dni.js'
import { validarNIE } from '../src/nie.js'

const CODIGOS: CodigoError[] = ['formato', 'letra', 'control', 'parece_nie', 'parece_dni']

describe('mensajeError', () => {
  it('por defecto, en español', () => {
    expect(mensajeError({ codigo: 'formato' })).toBe(mensajeError({ codigo: 'formato' }, 'es'))
    expect(mensajeError({ codigo: 'formato' })).toMatch(/formato/i)
  })

  it.each([
    ['es', 'formato', 'El formato no es el de un DNI, NIE o CIF.'],
    ['en', 'formato', 'The format is not that of a DNI, NIE or CIF.'],
    ['es', 'parece_nie', 'Es un NIE (empieza por X, Y o Z), no un DNI.'],
    ['en', 'parece_nie', 'This is a NIE (it starts with X, Y or Z), not a DNI.'],
    ['es', 'parece_dni', 'Es un DNI (8 cifras y una letra), no un NIE.'],
    ['en', 'parece_dni', 'This is a DNI (8 digits and a letter), not a NIE.'],
  ] as const)('[%s] %s', (idioma, codigo, texto) => {
    expect(mensajeError({ codigo }, idioma)).toBe(texto)
  })

  it('«letra» dice cuál debería ser, si se sabe', () => {
    expect(mensajeError({ codigo: 'letra', esperada: 'Z' }, 'es')).toBe('La letra de control no es correcta: debería ser Z.')
    expect(mensajeError({ codigo: 'letra', esperada: 'Z' }, 'en')).toBe('The check letter is wrong: it should be Z.')
    expect(mensajeError({ codigo: 'letra' }, 'es')).toBe('La letra de control no es correcta.')
    expect(mensajeError({ codigo: 'letra' }, 'en')).toBe('The check letter is wrong.')
  })

  it('«control» dice cuál debería ser, si se sabe', () => {
    expect(mensajeError({ codigo: 'control', esperada: '5' }, 'es')).toBe('El dígito o la letra de control del CIF no es correcto: debería ser 5.')
    expect(mensajeError({ codigo: 'control', esperada: 'E' }, 'en')).toBe('The CIF check digit or letter is wrong: it should be E.')
    expect(mensajeError({ codigo: 'control' }, 'es')).toBe('El dígito o la letra de control del CIF no es correcto.')
    expect(mensajeError({ codigo: 'control' }, 'en')).toBe('The CIF check digit or letter is wrong.')
  })

  it('todos los códigos tienen mensaje no vacío, distinto y sin «undefined» en los dos idiomas', () => {
    for (const idioma of ['es', 'en'] as const) {
      const textos = CODIGOS.map((codigo) => mensajeError({ codigo, esperada: 'X' }, idioma))
      for (const t of textos) {
        expect(t.length).toBeGreaterThan(10)
        expect(t).not.toMatch(/undefined|null|\[object/)
        expect(t.endsWith('.')).toBe(true)
      }
      expect(new Set(textos).size).toBe(CODIGOS.length)
    }
  })

  it('el español y el inglés son distintos para cada código', () => {
    for (const codigo of CODIGOS) expect(mensajeError({ codigo }, 'es')).not.toBe(mensajeError({ codigo }, 'en'))
  })

  it('un idioma no soportado cae en español en lugar de fallar', () => {
    expect(mensajeError({ codigo: 'formato' }, 'fr' as never)).toBe(mensajeError({ codigo: 'formato' }, 'es'))
  })

  it('acepta directamente el resultado de un validador', () => {
    const r = validarDNI('12345678A')
    if (r.ok) throw new Error('debería fallar')
    expect(mensajeError(r, 'en')).toBe('The check letter is wrong: it should be Z.')
    const n = validarNIE('12345678Z')
    if (n.ok) throw new Error('debería fallar')
    expect(mensajeError(n)).toBe('Es un DNI (8 cifras y una letra), no un NIE.')
    const c = validarCIF('A28015864')
    if (c.ok) throw new Error('debería fallar')
    expect(mensajeError(c)).toBe('El dígito o la letra de control del CIF no es correcto: debería ser 5.')
  })
})
