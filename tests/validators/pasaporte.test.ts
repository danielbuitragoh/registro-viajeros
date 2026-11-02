import { describe, expect, it } from 'vitest'
import { validarPasaporte } from '../../src/validators/pasaporte'

describe('validarPasaporte (formato por país: orientativo)', () => {
  it('normaliza a mayúsculas y quita espacios/guiones', () => {
    const r = validarPasaporte('aaa 123-456', 'ESP')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.normalizado).toBe('AAA123456')
  })

  it.each([
    ['AAA123456', 'ESP'],
    ['123456789', 'USA'],
    ['A12345678', 'USA'],
    ['123456789', 'GBR'],
    ['12AB34567', 'FRA'],
    ['C01X00T47', 'DEU'],
    ['YA1234567', 'ITA'],
    ['P123456', 'PRT'],
    ['XR1234567', 'NLD'],
  ])('%s (%s) es un formato habitual: sin avisos', (num, pais) => {
    const r = validarPasaporte(num, pais)
    expect(r).toMatchObject({ ok: true })
    if (r.ok) expect(r.aviso).toBeUndefined()
  })

  it('un formato válido genéricamente pero inusual para el país da AVISO, no error', () => {
    const r = validarPasaporte('AB1234567', 'GBR')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.aviso).toBe('formato_pais')
  })

  it('país sin patrón conocido: solo reglas genéricas, sin aviso de país', () => {
    const r = validarPasaporte('K1234567', 'KEN')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.aviso).toBeUndefined()
  })

  it('sin nacionalidad indicada: solo reglas genéricas', () => {
    expect(validarPasaporte('AAA123456', undefined).ok).toBe(true)
  })

  it('longitud fuera de lo habitual (6-9) pero admisible: aviso', () => {
    const r = validarPasaporte('ABC1234567', undefined)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.aviso).toBe('longitud_inusual')
  })

  it.each(['', 'A12', 'AB 12', 'ÑANDÚ1234', 'ABC*123456', '1234567890123456'])('rechaza %j', (num) => {
    expect(validarPasaporte(num, 'ESP').ok).toBe(false)
  })

  it('indica el motivo del rechazo', () => {
    const corto = validarPasaporte('A12', 'ESP')
    const raro = validarPasaporte('ABC*123456', 'ESP')
    const largo = validarPasaporte('1234567890123456', 'ESP')
    expect(corto).toMatchObject({ ok: false, codigo: 'longitud' })
    expect(raro).toMatchObject({ ok: false, codigo: 'caracteres' })
    expect(largo).toMatchObject({ ok: false, codigo: 'longitud' })
  })
})
