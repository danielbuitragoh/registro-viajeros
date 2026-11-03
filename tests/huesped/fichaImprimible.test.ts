import { describe, expect, it } from 'vitest'
import { contenidoFicha } from '../../src/huesped/fichaImprimible'
import { crearDatosEnlace } from '../../src/huesped/enlace'
import { adulto, establecimiento, extranjero, menor, reserva } from '../fixtures'

const datos = (l: 'es' | 'de' = 'es') => crearDatosEnlace(establecimiento({ nombre: 'Pensión Ejemplo' }), reserva({ id: 'r1', entrada: '2026-11-03T15:00', salida: '2026-11-05T11:00', numPersonas: 3 }), 'A'.repeat(43), l)
const fila = (filas: { etiqueta: string; valor: string }[], etiqueta: string) => filas.find((f) => f.etiqueta === etiqueta)?.valor

describe('contenido de la ficha imprimible (pre-check-in)', () => {
  it('cabecera con establecimiento, fechas y personas', () => {
    const c = contenidoFicha(datos(), [adulto()], 'es')
    expect(c.titulo).toBe('Ficha de viajeros (pre-check-in)')
    expect(fila(c.cabecera, 'Nombre del establecimiento')).toBe('Pensión Ejemplo')
    expect(fila(c.cabecera, 'Entrada')).toBe('03/11/2026 15:00')
    expect(fila(c.cabecera, 'Salida')).toBe('05/11/2026 11:00')
    expect(fila(c.cabecera, 'Nº de personas')).toBe('3')
  })

  it('todos los datos rellenados del viajero, con fechas legibles y códigos oficiales como texto', () => {
    const [v] = contenidoFicha(datos(), [adulto()], 'es').viajeros
    expect(v?.titulo).toBe('Ficha del viajero 1')
    const f = v?.filas ?? []
    expect(fila(f, 'Nombre')).toBe('Lucía')
    expect(fila(f, 'Primer apellido')).toBe('Prueba')
    expect(fila(f, 'Segundo apellido')).toBe('Ejemplo')
    expect(fila(f, 'Fecha de nacimiento')).toBe('12/04/1985')
    expect(fila(f, 'Tipo de documento')).toBe('DNI / NIF')
    expect(fila(f, 'Número de documento')).toBe('12345678Z')
    expect(fila(f, 'Número de soporte')).toBe('ABC123456')
    expect(fila(f, 'Sexo')).toBe('Mujer')
    expect(fila(f, 'Nacionalidad')).toBe('España (ESP)')
    expect(fila(f, 'País de residencia')).toBe('España (ESP)')
    expect(fila(f, 'Código INE del municipio')).toBe('28079')
    expect(fila(f, 'Teléfono')).toBe('+34 600 123 456')
    expect(fila(f, 'Correo electrónico')).toBe('lucia@example.com')
  })

  it('omite los campos vacíos (no hay filas en blanco)', () => {
    const [v] = contenidoFicha(datos(), [extranjero()], 'es').viajeros
    expect(fila(v?.filas ?? [], 'Segundo apellido')).toBeUndefined()
    expect(v?.filas.every((x) => x.valor.trim() !== '')).toBe(true)
    expect(fila(v?.filas ?? [], 'Municipio o ciudad')).toBe('Springfield')
  })

  it('menor: adulto que le acompaña y parentesco', () => {
    const c = contenidoFicha(datos(), [adulto(), menor()], 'es')
    const f = c.viajeros[1]?.filas ?? []
    expect(fila(f, 'Adulto responsable')).toBe('Lucía Prueba')
    expect(fila(f, 'Parentesco')).toBe('Hijo/a')
  })

  it('en otro idioma, etiquetas y valores bilingües: español para recepción / idioma del huésped', () => {
    const c = contenidoFicha(datos('de'), [extranjero({ tipoDocumento: 'PAS', nacionalidad: 'DEU' })], 'de')
    expect(c.titulo).toBe('Ficha de viajeros (pre-check-in) / Gästedaten (Pre-Check-in)')
    const f = c.viajeros[0]?.filas ?? []
    expect(fila(f, 'Nombre / Vorname')).toBe('John')
    expect(fila(f, 'Tipo de documento / Ausweisart')).toBe('Pasaporte / Reisepass')
    expect(fila(f, 'Nacionalidad / Staatsangehörigkeit')).toBe('Alemania / Deutschland (DEU)')
  })
})
