import { describe, expect, it } from 'vitest'
import {
  ITERACIONES_PBKDF2,
  a64,
  de64,
  cifrar,
  descifrar,
  derivarClave,
  nuevaSal,
} from '../../src/crypto/cifrado'

const IT = 1000 // iteraciones bajas SOLO para que los tests sean rápidos

describe('base64', () => {
  it('ida y vuelta, también con datos grandes', () => {
    const datos = new Uint8Array(200_000).map((_, i) => i % 251)
    expect(de64(a64(datos))).toEqual(datos)
  })
})

describe('derivación de clave (PBKDF2-SHA256)', () => {
  it('usa 600 000 iteraciones por defecto (recomendación OWASP 2023 para PBKDF2-HMAC-SHA256)', () => {
    expect(ITERACIONES_PBKDF2).toBe(600_000)
  })

  it('la sal es aleatoria de 16 bytes', () => {
    const a = nuevaSal()
    const b = nuevaSal()
    expect(a).toHaveLength(16)
    expect(a).not.toEqual(b)
  })

  it('la clave no es exportable', async () => {
    const k = await derivarClave('secreto', nuevaSal(), IT)
    await expect(crypto.subtle.exportKey('raw', k)).rejects.toThrow()
  })

  it('con 600 000 iteraciones funciona en un tiempo razonable', async () => {
    const t = Date.now()
    const k = await derivarClave('secreto', nuevaSal())
    const s = await cifrar(k, 'hola')
    expect(await descifrar(k, s)).toBe('hola')
    expect(Date.now() - t).toBeLessThan(10_000)
  })
})

describe('cifrado AES-GCM', () => {
  it('ida y vuelta (texto, tildes y emojis)', async () => {
    const k = await derivarClave('contraseña', nuevaSal(), IT)
    const s = await cifrar(k, 'Núñez ñandú — 12345678Z 🛎️')
    expect(await descifrar(k, s)).toBe('Núñez ñandú — 12345678Z 🛎️')
  })

  it('misma sal y contraseña → misma clave (se puede descifrar tras reabrir)', async () => {
    const sal = nuevaSal()
    const s = await cifrar(await derivarClave('abc', sal, IT), 'dato')
    expect(await descifrar(await derivarClave('abc', sal, IT), s)).toBe('dato')
  })

  it('la contraseña se normaliza (NFC): "ñ" compuesta y descompuesta son la misma', async () => {
    const sal = nuevaSal()
    const s = await cifrar(await derivarClave('contraseña', sal, IT), 'dato')
    expect(await descifrar(await derivarClave('contraseña', sal, IT), s)).toBe('dato')
  })

  it('cada cifrado usa un IV nuevo: mismo texto → distinto resultado', async () => {
    const k = await derivarClave('abc', nuevaSal(), IT)
    const a = await cifrar(k, 'igual')
    const b = await cifrar(k, 'igual')
    expect(a.iv).not.toBe(b.iv)
    expect(a.ct).not.toBe(b.ct)
  })

  it('el cifrado no deja el texto en claro', async () => {
    const k = await derivarClave('abc', nuevaSal(), IT)
    const s = await cifrar(k, 'DNI 12345678Z de Lucía')
    expect(JSON.stringify(s)).not.toContain('12345678Z')
    expect(atob(s.ct)).not.toContain('12345678Z')
  })

  it('contraseña incorrecta → error', async () => {
    const sal = nuevaSal()
    const s = await cifrar(await derivarClave('buena', sal, IT), 'dato')
    await expect(descifrar(await derivarClave('mala', sal, IT), s)).rejects.toThrow()
  })

  it('detecta manipulación del texto cifrado y del IV (autenticación GCM)', async () => {
    const k = await derivarClave('abc', nuevaSal(), IT)
    const s = await cifrar(k, 'dato importante')
    const ct = de64(s.ct)
    ct[0] = (ct[0] as number) ^ 1
    await expect(descifrar(k, { ...s, ct: a64(ct) })).rejects.toThrow()
    const iv = de64(s.iv)
    iv[0] = (iv[0] as number) ^ 1
    await expect(descifrar(k, { ...s, iv: a64(iv) })).rejects.toThrow()
  })

  it('los datos asociados (AAD) ligan el cifrado a su contexto', async () => {
    const k = await derivarClave('abc', nuevaSal(), IT)
    const s = await cifrar(k, 'dato', 'reservas/r1')
    expect(await descifrar(k, s, 'reservas/r1')).toBe('dato')
    await expect(descifrar(k, s, 'reservas/r2')).rejects.toThrow()
    await expect(descifrar(k, s)).rejects.toThrow()
  })
})
