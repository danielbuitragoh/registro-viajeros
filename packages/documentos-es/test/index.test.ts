import { describe, expect, it } from 'vitest'
import * as api from '../src/index.js'

describe('API pública', () => {
  it('exporta exactamente estas funciones (cambiarlas es cambiar la API)', () => {
    expect(Object.keys(api).sort()).toEqual(
      ['controlCif', 'detectarTipo', 'letraDni', 'letraNie', 'mensajeError', 'normalizarDocumento', 'validarCIF', 'validarDNI', 'validarDocumento', 'validarNIE'].sort(),
    )
    for (const f of Object.values(api)) expect(typeof f).toBe('function')
  })

  it('un uso completo de principio a fin', () => {
    const r = api.validarDocumento(' 12.345.678-a ')
    expect(r).toEqual({ ok: false, tipo: 'DNI', codigo: 'letra', esperada: 'Z' })
    if (r.ok) throw new Error('debería fallar')
    expect(api.mensajeError(r, 'en')).toBe('The check letter is wrong: it should be Z.')
    expect(api.letraDni(12345678)).toBe('Z')
    expect(api.letraNie('X1234567')).toBe('L')
    expect(api.controlCif('A2801586')).toEqual({ digito: '5', letra: 'E' })
    expect(api.detectarTipo('x1234567l')).toBe('NIE')
  })
})
