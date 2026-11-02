import { describe, expect, it } from 'vitest'
import { crearDatosEnlace, codificarEnlace, decodificarEnlace, generarClaveEnlace } from '../../src/huesped/enlace'
import { cifrarFicha, descifrarFicha, reservaDeCodigo } from '../../src/huesped/ficha'
import { de64url } from '../../src/crypto/cifrado'
import { adulto, establecimiento, menor, reserva } from '../fixtures'

describe('enlace de huésped (sin datos personales)', () => {
  const r = reserva({ id: 'res-abc', referencia: 'RES-1', entrada: '2026-11-02T15:00', salida: '2026-11-05T11:00', numPersonas: 3 })
  const clave = generarClaveEnlace()

  it('la clave es de 256 bits en base64url', () => {
    expect(clave).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(generarClaveEnlace()).not.toBe(clave)
  })

  it('ida y vuelta: base + #/huesped/<datos>', () => {
    const datos = crearDatosEnlace(establecimiento(), r, clave, 'es')
    const url = codificarEnlace(datos, 'https://hostal.example/app/')
    expect(url.startsWith('https://hostal.example/app/#/huesped/')).toBe(true)
    expect(decodificarEnlace(url)).toEqual(datos)
  })

  it('acepta también solo el fragmento (la app lee location.hash)', () => {
    const datos = crearDatosEnlace(establecimiento(), r, clave, 'en')
    const url = codificarEnlace(datos, 'https://x.test/')
    const frag = url.slice(url.indexOf('#'))
    expect(decodificarEnlace(frag)).toEqual(datos)
  })

  it('contiene lo necesario y NINGÚN dato personal', () => {
    const rr = reserva({ ...r, viajeros: [adulto({ nombre: 'Lucía' })] })
    const url = codificarEnlace(crearDatosEnlace(establecimiento(), rr, clave, 'es'), 'https://x.test/')
    const datos = decodificarEnlace(url)
    expect(datos).toMatchObject({ v: 1, rid: 'res-abc', est: 'Hostal Demo', ent: '2026-11-02T15:00', sal: '2026-11-05T11:00', n: 3, k: clave, l: 'es' })
    const bruto = JSON.stringify(datos)
    for (const s of ['Lucía', '12345678Z', 'lucia@example.com']) expect(bruto).not.toContain(s)
  })

  it('el fragmento es URL-safe', () => {
    const url = codificarEnlace(crearDatosEnlace(establecimiento(), r, clave, 'es'), 'https://x.test/')
    expect(url.slice(url.indexOf('#') + 1)).toMatch(/^\/huesped\/[A-Za-z0-9_-]+$/)
  })

  it.each(['', '#/huesped/', '#/huesped/@@@', '#/otra/abc', '#/huesped/e30', 'https://x.test/#/huesped/bm8gZXMganNvbg'])(
    'enlaces dañados o ajenos → null (%j)',
    (f) => expect(decodificarEnlace(f)).toBeNull(),
  )

  it('rechaza datos con forma incorrecta o versión desconocida', () => {
    const malo = btoa(JSON.stringify({ v: 2, rid: 'a' })).replace(/=/g, '')
    expect(decodificarEnlace(`#/huesped/${malo}`)).toBeNull()
  })
})

describe('ficha cifrada del huésped (código de envío)', () => {
  const clave = generarClaveEnlace()
  const viajeros = [adulto(), menor()]

  it('ida y vuelta con tildes y varios viajeros', async () => {
    const codigo = await cifrarFicha('res-1', clave, [adulto({ nombre: 'Ñandú Núñez' }), menor()])
    const r = await descifrarFicha(codigo, clave, 'res-1')
    expect(r).toHaveLength(2)
    expect(r[0]?.nombre).toBe('Ñandú Núñez')
    expect(r[1]?.responsable).toEqual({ adultoId: 'v1', parentesco: 'HJ' })
  })

  it('el código no contiene datos en claro y es URL-safe y con prefijo', async () => {
    const codigo = await cifrarFicha('res-1', clave, viajeros)
    expect(codigo.startsWith('RV1.')).toBe(true)
    expect(codigo).toMatch(/^RV1\.[A-Za-z0-9_-]+$/)
    const bruto = String.fromCharCode(...de64url(codigo.slice(4)))
    for (const s of ['Lucía', '12345678Z', 'Prueba']) expect(bruto).not.toContain(s)
  })

  it('con la clave equivocada falla', async () => {
    const codigo = await cifrarFicha('res-1', clave, viajeros)
    await expect(descifrarFicha(codigo, generarClaveEnlace(), 'res-1')).rejects.toThrow()
  })

  it('el código está ligado a su reserva: no vale para otra', async () => {
    const codigo = await cifrarFicha('res-1', clave, viajeros)
    await expect(descifrarFicha(codigo, clave, 'res-2')).rejects.toThrow(/reserva/i)
  })

  it('código manipulado o ajeno → error', async () => {
    const codigo = await cifrarFicha('res-1', clave, viajeros)
    await expect(descifrarFicha(codigo.slice(0, -6) + 'AAAAAA', clave, 'res-1')).rejects.toThrow()
    await expect(descifrarFicha('hola', clave, 'res-1')).rejects.toThrow(/código/i)
    await expect(descifrarFicha('RV1.@@@', clave, 'res-1')).rejects.toThrow()
  })

  it('recepción puede saber a qué reserva pertenece un código sin descifrarlo', async () => {
    const codigo = await cifrarFicha('res-77', clave, viajeros)
    expect(reservaDeCodigo(codigo)).toBe('res-77')
    expect(() => reservaDeCodigo('basura')).toThrow(/código/i)
  })

  it('marca las fichas como procedentes del huésped', async () => {
    const r = await descifrarFicha(await cifrarFicha('res-1', clave, [adulto({ origen: 'recepcion' })]), clave, 'res-1')
    expect(r[0]?.origen).toBe('huesped')
  })

  it('comprime: un código de 4 viajeros cabe con holgura en un QR (≈ <2000 caracteres)', async () => {
    const cuatro = [adulto(), adulto({ id: 'a2' }), menor({ id: 'm1' }), menor({ id: 'm2' })]
    const codigo = await cifrarFicha('res-1', clave, cuatro)
    expect(codigo.length).toBeLessThan(2000)
  })
})
