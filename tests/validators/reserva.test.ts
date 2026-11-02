import { describe, expect, it } from 'vitest'
import { validarReserva, estadoParte } from '../../src/validators/reserva'
import type { Incidencia } from '../../src/domain/tipos'
import { adulto, extranjero, menor, reserva } from '../fixtures'

const claves = (is: Incidencia[], g?: 'error' | 'aviso') =>
  is.filter((i) => !g || i.gravedad === g).map((i) => `${i.campo}:${i.codigo}`)

describe('validarReserva — contrato (§3 y §4)', () => {
  it('reserva correcta: sin incidencias', () => {
    expect(validarReserva(reserva(), 'partes')).toEqual([])
  })

  it('referencia obligatoria y máx. 50', () => {
    expect(claves(validarReserva(reserva({ referencia: '' }), 'partes'))).toContain('referencia:requerido')
    expect(claves(validarReserva(reserva({ referencia: 'R'.repeat(51) }), 'partes'))).toContain('referencia:longitud_max')
  })

  it('fechas: contrato no posterior a la entrada; salida posterior a la entrada', () => {
    expect(claves(validarReserva(reserva({ fechaContrato: '2026-11-03' }), 'partes'))).toContain('fechaContrato:contrato_posterior_entrada')
    expect(claves(validarReserva(reserva({ salida: '2026-11-02T15:00' }), 'partes'))).toContain('salida:salida_anterior_entrada')
    expect(claves(validarReserva(reserva({ salida: '2026-11-01T10:00' }), 'partes'))).toContain('salida:salida_anterior_entrada')
  })

  it('fechas inexistentes o mal formadas', () => {
    const r = claves(validarReserva(reserva({ fechaContrato: '2026-02-30', entrada: 'mañana', salida: '' }), 'partes'))
    expect(r).toEqual(expect.arrayContaining(['fechaContrato:fecha_invalida', 'entrada:fecha_invalida', 'salida:requerido']))
  })

  it('nº de personas entero ≥ 1; nº de habitaciones opcional pero entero ≥ 1', () => {
    expect(claves(validarReserva(reserva({ numPersonas: 0 }), 'partes'))).toContain('numPersonas:numero_invalido')
    expect(claves(validarReserva(reserva({ numPersonas: 1.5 }), 'partes'))).toContain('numPersonas:numero_invalido')
    expect(claves(validarReserva(reserva({ numHabitaciones: 0 }), 'partes'))).toContain('numHabitaciones:numero_invalido')
    expect(claves(validarReserva(reserva({ numHabitaciones: 2 }), 'partes'))).toEqual([])
  })
})

describe('validarReserva — pago (§7.2)', () => {
  it('tipo de pago obligatorio y de la tabla 8.7', () => {
    expect(claves(validarReserva(reserva({ pago: { tipoPago: '' as never } }), 'partes'))).toContain('pago.tipoPago:requerido')
    expect(claves(validarReserva(reserva({ pago: { tipoPago: 'BIZUM' as never } }), 'partes'))).toContain('pago.tipoPago:codigo_invalido')
  })

  it('campos opcionales del pago: formato y longitudes', () => {
    const pago = { tipoPago: 'TARJT' as const, fechaPago: '2026-13-01', medioPago: 'x'.repeat(51), titular: 'y'.repeat(101), caducidadTarjeta: '2026/13' }
    const r = claves(validarReserva(reserva({ pago }), 'partes'))
    expect(r).toEqual(
      expect.arrayContaining([
        'pago.fechaPago:fecha_invalida',
        'pago.medioPago:longitud_max',
        'pago.titular:longitud_max',
        'pago.caducidadTarjeta:caducidad_formato',
      ]),
    )
  })

  it('caducidad MM/AAAA válida', () => {
    const pago = { tipoPago: 'TARJT' as const, caducidadTarjeta: '09/2028' }
    expect(validarReserva(reserva({ pago }), 'partes')).toEqual([])
  })
})

describe('validarReserva — viajeros en partes de viajeros', () => {
  it('al menos un viajero', () => {
    expect(claves(validarReserva(reserva({ viajeros: [], numPersonas: 1 }), 'partes'), 'error')).toContain('viajeros:viajeros_vacio')
  })

  it('si hay menos fichas que personas, AVISO (no error) con los números', () => {
    const r = validarReserva(reserva({ numPersonas: 3 }), 'partes')
    expect(r.filter((i) => i.gravedad === 'error')).toEqual([])
    expect(r.find((i) => i.codigo === 'viajeros_cuenta')).toMatchObject({ gravedad: 'aviso', params: { fichas: 1, personas: 3 } })
  })

  it('las incidencias de cada viajero llevan su viajeroId', () => {
    const r = validarReserva(reserva({ viajeros: [adulto(), extranjero({ nombre: '' })], numPersonas: 2 }), 'partes')
    const i = r.find((x) => x.campo === 'nombre')
    expect(i?.viajeroId).toBe('v2')
  })

  it('documento repetido entre dos viajeros → aviso', () => {
    const dup = adulto({ id: 'v4', nombre: 'Otro' })
    const r = validarReserva(reserva({ viajeros: [adulto(), dup], numPersonas: 2 }), 'partes')
    expect(claves(r, 'aviso')).toContain('numeroDocumento:documento_duplicado')
  })

  it('menor con adulto responsable en la misma reserva: sin incidencias', () => {
    const r = validarReserva(reserva({ viajeros: [adulto(), menor()], numPersonas: 2 }), 'partes')
    expect(r).toEqual([])
  })

  it('un menor sin ningún adulto en la reserva: error', () => {
    const r = validarReserva(reserva({ viajeros: [menor()], numPersonas: 1 }), 'partes')
    expect(claves(r, 'error')).toContain('responsable:responsable_invalido')
  })

  it('dos menores con distinto parentesco hacia el mismo adulto → aviso (P7: solo hay un campo parentesco)', () => {
    const m2 = menor({ id: 'v5', nombre: 'Sara', responsable: { adultoId: 'v1', parentesco: 'SB' } })
    const r = validarReserva(reserva({ viajeros: [adulto(), menor(), m2], numPersonas: 3 }), 'partes')
    expect(claves(r, 'aviso')).toContain('responsable:parentesco_multiple')
  })
})

describe('validarReserva — modo reservas de hospedaje (§4)', () => {
  it('exige exactamente un titular', () => {
    expect(claves(validarReserva(reserva(), 'reservas'))).toContain('viajeros:titular_requerido')
    const dos = reserva({ viajeros: [adulto({ esTitular: true }), extranjero({ esTitular: true })], numPersonas: 2 })
    expect(claves(validarReserva(dos, 'reservas'))).toContain('viajeros:titular_multiple')
    const uno = reserva({ viajeros: [adulto({ esTitular: true })] })
    expect(claves(validarReserva(uno, 'reservas'))).toEqual([])
  })
})

describe('estadoParte (pendiente / completo / exportado)', () => {
  it('completo: sin errores y todas las fichas', () => {
    expect(estadoParte(reserva())).toBe('completo')
  })
  it('pendiente: con errores o faltan fichas', () => {
    expect(estadoParte(reserva({ viajeros: [adulto({ nombre: '' })] }))).toBe('pendiente')
    expect(estadoParte(reserva({ numPersonas: 2 }))).toBe('pendiente')
    expect(estadoParte(reserva({ viajeros: [] }))).toBe('pendiente')
  })
  it('exportado: si se exportó y no se ha modificado desde entonces', () => {
    const r = reserva({ exportadaEn: '2026-11-02T16:00:00.000Z', modificadaEn: '2026-11-02T15:00:00.000Z' })
    expect(estadoParte(r)).toBe('exportado')
  })
  it('si se modifica después de exportar, vuelve a "completo" (hay que reexportar)', () => {
    const r = reserva({ exportadaEn: '2026-11-02T16:00:00.000Z', modificadaEn: '2026-11-02T17:00:00.000Z' })
    expect(estadoParte(r)).toBe('completo')
  })
})
