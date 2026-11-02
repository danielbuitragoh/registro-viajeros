import { beforeEach, describe, expect, it } from 'vitest'
import { Almacen } from '../../src/storage/almacen'
import { ejecutarPurga, planificarPurga } from '../../src/storage/purga'
import { reserva } from '../fixtures'

const ahora = new Date('2026-11-02T10:00:00')

describe('planificarPurga (3 años desde la salida; aviso 30 días antes)', () => {
  const vieja = reserva({ id: 'vieja', salida: '2023-10-30T11:00' }) // purga 2026-10-30 → ya purgable
  const justo = reserva({ id: 'justo', salida: '2023-11-02T11:00' }) // purga hoy 2026-11-02 00:00 → purgable
  const avisoR = reserva({ id: 'aviso', salida: '2023-11-20T11:00' }) // purga 2026-11-20 → quedan 18 días
  const lejos = reserva({ id: 'lejos', salida: '2024-06-01T11:00' }) // purga 2027-06-01
  const reciente = reserva({ id: 'reciente', salida: '2026-11-05T11:00' })

  it('clasifica en purgables, con aviso y vigentes', () => {
    const p = planificarPurga([vieja, justo, avisoR, lejos, reciente], ahora)
    expect(p.purgables.map((r) => r.id).sort()).toEqual(['justo', 'vieja'])
    expect(p.conAviso.map((r) => r.id)).toEqual(['aviso'])
    expect(p.conAviso[0]).toBeDefined()
  })

  it('indica la fecha de purga más próxima entre las que tienen aviso', () => {
    const p = planificarPurga([avisoR, reserva({ id: 'x', salida: '2023-11-25T10:00' })], ahora)
    expect(p.proximaPurga).toBe('2026-11-20')
  })

  it('sin nada que purgar ni avisar', () => {
    const p = planificarPurga([lejos, reciente], ahora)
    expect(p).toEqual({ purgables: [], conAviso: [], proximaPurga: undefined })
  })
})

describe('ejecutarPurga (borra de verdad en IndexedDB)', () => {
  let a: Almacen
  beforeEach(async () => {
    a = await Almacen.abrir(`purga-${Math.random().toString(36).slice(2)}`)
    await a.crear('clave-del-hostal', { iteraciones: 1000 })
  })

  it('elimina solo las reservas con 3 años cumplidos desde la salida y devuelve sus ids', async () => {
    await a.guardar('reservas', 'vieja', reserva({ id: 'vieja', salida: '2023-01-10T11:00' }))
    await a.guardar('reservas', 'reciente', reserva({ id: 'reciente', salida: '2026-10-30T11:00' }))
    const r = await ejecutarPurga(a, ahora)
    expect(r.eliminadas).toEqual(['vieja'])
    expect(await a.obtener('reservas', 'vieja')).toBeUndefined()
    expect(await a.obtener('reservas', 'reciente')).toBeDefined()
  })

  it('no toca la configuración del establecimiento y es idempotente', async () => {
    await a.guardar('config', 'establecimiento', { nombre: 'H' })
    await a.guardar('reservas', 'vieja', reserva({ id: 'vieja', salida: '2020-01-01T11:00' }))
    await ejecutarPurga(a, ahora)
    expect(await a.obtener('config', 'establecimiento')).toEqual({ nombre: 'H' })
    expect((await ejecutarPurga(a, ahora)).eliminadas).toEqual([])
  })

  it('purga aunque la reserva no se haya exportado (la conservación es obligación de plazo, no de estado)', async () => {
    await a.guardar('reservas', 'sinExportar', reserva({ id: 'sinExportar', salida: '2020-01-01T11:00', exportadaEn: undefined }))
    expect((await ejecutarPurga(a, ahora)).eliminadas).toEqual(['sinExportar'])
  })
})
