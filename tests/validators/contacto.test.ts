import { describe, expect, it } from 'vitest'
import { validarTelefono, validarCorreo } from '../../src/validators/contacto'

describe('validarTelefono (P9: validación permisiva)', () => {
  it.each(['+34 600 123 456', '600123456', '+34 (91) 123-45-67', '0044 20 7946 0958', '+1 202 555 0143'])(
    'acepta %s',
    (t) => expect(validarTelefono(t).ok).toBe(true),
  )
  it('normaliza quitando separadores', () => {
    expect(validarTelefono('+34 600 123 456')).toEqual({ ok: true, normalizado: '+34600123456' })
  })
  it.each(['', '12345', 'abc', '+34 600 12x 456', '6001234567890123456789'])('rechaza %j', (t) =>
    expect(validarTelefono(t).ok).toBe(false),
  )
})

describe('validarCorreo', () => {
  it.each(['ana@example.com', 'a.b+c@sub.example.es', 'x@y.io'])('acepta %s', (c) => expect(validarCorreo(c).ok).toBe(true))
  it.each(['', 'ana', 'ana@', '@example.com', 'ana@example', 'ana example@x.com', 'a@@b.com'])('rechaza %j', (c) =>
    expect(validarCorreo(c).ok).toBe(false),
  )
  it('rechaza más de 50 caracteres (String(50) del documento oficial)', () => {
    expect(validarCorreo('a'.repeat(45) + '@ex.com').ok).toBe(false)
  })
})
