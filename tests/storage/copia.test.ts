import { describe, expect, it } from 'vitest'
import { Almacen } from '../../src/storage/almacen'
import { exportarCopia, importarCopia, leerCabeceraCopia } from '../../src/storage/copia'
import { establecimiento, reserva } from '../fixtures'
import { adulto } from '../fixtures'

const opts = { iteraciones: 1000 }
async function nuevo(pass = 'clave-del-hostal') {
  const a = await Almacen.abrir(`copia-${Math.random().toString(36).slice(2)}`)
  await a.crear(pass, opts)
  return a
}

describe('copia de seguridad cifrada', () => {
  it('ida y vuelta: exportar de un almacén e importar en otro vacío', async () => {
    const origen = await nuevo()
    await origen.guardar('config', 'establecimiento', establecimiento())
    await origen.guardar('reservas', 'r1', reserva())
    await origen.guardar('reservas', 'r2', reserva({ id: 'r2', referencia: 'R2' }))
    const fichero = await exportarCopia(origen, 'clave-de-copia-1', opts)

    const destino = await nuevo('otra-clave-distinta')
    const r = await importarCopia(destino, fichero, 'clave-de-copia-1', 'reemplazar')
    expect(r).toEqual({ reservas: 2, configuracion: true })
    expect(await destino.obtener('config', 'establecimiento')).toEqual(establecimiento())
    expect((await destino.listar('reservas')).length).toBe(2)
  })

  it('el fichero NO contiene datos en claro y declara su formato y versión', async () => {
    const a = await nuevo()
    await a.guardar('reservas', 'r1', reserva({ viajeros: [adulto({ nombre: 'Lucía' })] }))
    const fichero = await exportarCopia(a, 'clave-de-copia-1', opts)
    for (const s of ['Lucía', '12345678Z', 'RES-2026-0001', 'lucia@example.com']) expect(fichero).not.toContain(s)
    const cab = leerCabeceraCopia(fichero)
    expect(cab).toMatchObject({ formato: 'registro-viajeros-copia', version: 1 })
    expect(cab.kdf.iteraciones).toBe(1000)
  })

  it('contraseña de copia incorrecta → error, sin modificar el destino', async () => {
    const o = await nuevo()
    await o.guardar('reservas', 'r1', reserva())
    const fichero = await exportarCopia(o, 'clave-de-copia-1', opts)
    const d = await nuevo()
    await d.guardar('reservas', 'x', reserva({ id: 'x' }))
    await expect(importarCopia(d, fichero, 'equivocada-123', 'reemplazar')).rejects.toThrow(/contraseña|descifr/i)
    expect((await d.listar('reservas')).length).toBe(1)
  })

  it('fichero manipulado o ajeno → error claro', async () => {
    const o = await nuevo()
    const fichero = await exportarCopia(o, 'clave-de-copia-1', opts)
    const obj = JSON.parse(fichero)
    obj.ct = obj.ct.slice(0, -4) + 'AAAA'
    const d = await nuevo()
    await expect(importarCopia(d, JSON.stringify(obj), 'clave-de-copia-1', 'reemplazar')).rejects.toThrow()
    await expect(importarCopia(d, '{"hola":1}', 'clave-de-copia-1', 'reemplazar')).rejects.toThrow(/formato/i)
    await expect(importarCopia(d, 'no es json', 'clave-de-copia-1', 'reemplazar')).rejects.toThrow(/formato/i)
    obj.version = 99
    await expect(importarCopia(d, JSON.stringify(obj), 'clave-de-copia-1', 'reemplazar')).rejects.toThrow(/versión/i)
  })

  it('modo "fusionar": conserva lo existente y añade lo nuevo; "reemplazar": deja solo lo de la copia', async () => {
    const o = await nuevo()
    await o.guardar('reservas', 'a', reserva({ id: 'a' }))
    const fichero = await exportarCopia(o, 'clave-de-copia-1', opts)

    const d1 = await nuevo()
    await d1.guardar('reservas', 'b', reserva({ id: 'b' }))
    await importarCopia(d1, fichero, 'clave-de-copia-1', 'fusionar')
    expect((await d1.listar<{ id: string }>('reservas')).map((r) => r.id).sort()).toEqual(['a', 'b'])

    const d2 = await nuevo()
    await d2.guardar('reservas', 'b', reserva({ id: 'b' }))
    await importarCopia(d2, fichero, 'clave-de-copia-1', 'reemplazar')
    expect((await d2.listar<{ id: string }>('reservas')).map((r) => r.id)).toEqual(['a'])
  })

  it('en "fusionar", gana la versión más reciente de cada reserva (modificadaEn)', async () => {
    const o = await nuevo()
    await o.guardar('reservas', 'a', reserva({ id: 'a', referencia: 'DE-LA-COPIA', modificadaEn: '2026-11-02T12:00:00.000Z' }))
    const fichero = await exportarCopia(o, 'clave-de-copia-1', opts)
    const d = await nuevo()
    await d.guardar('reservas', 'a', reserva({ id: 'a', referencia: 'LOCAL-MAS-NUEVA', modificadaEn: '2026-11-02T13:00:00.000Z' }))
    await importarCopia(d, fichero, 'clave-de-copia-1', 'fusionar')
    expect((await d.obtener<{ referencia: string }>('reservas', 'a'))?.referencia).toBe('LOCAL-MAS-NUEVA')
  })

  it('exige contraseña de copia de al menos 8 caracteres', async () => {
    const o = await nuevo()
    await expect(exportarCopia(o, 'corta', opts)).rejects.toThrow(/8/)
  })
})
