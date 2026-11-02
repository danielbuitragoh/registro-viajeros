import { describe, expect, it } from 'vitest'
import { construirXml, nombreFichero } from '../../src/exportador/construir'
import { adulto, establecimiento, extranjero, menor, reserva } from '../fixtures'

const parse = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
  return doc
}
const hijos = (el: Element) => Array.from(el.children).map((c) => c.tagName)
const txt = (el: Element | Document, sel: string) => el.querySelector(sel)?.textContent
const todos = (el: Element | Document, sel: string) => Array.from(el.querySelectorAll(sel))

describe('construirXml — partes de viajeros (§3, figura 1)', () => {
  const xml = construirXml(establecimiento(), [reserva({ viajeros: [adulto(), menor()], numPersonas: 2 })], 'partes')
  const doc = parse(xml)

  it('cabecera XML y raíz peticion > solicitud', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(doc.documentElement.tagName).toBe('peticion')
    expect(hijos(doc.documentElement)).toEqual(['solicitud'])
  })

  it('solicitud: codigoEstablecimiento y después comunicacion', () => {
    const sol = doc.querySelector('peticion > solicitud') as Element
    expect(hijos(sol)).toEqual(['codigoEstablecimiento', 'comunicacion'])
    expect(txt(sol, 'codigoEstablecimiento')).toBe('0000012345')
  })

  it('comunicacion: contrato y personas, en ese orden', () => {
    const com = doc.querySelector('comunicacion') as Element
    expect(hijos(com)).toEqual(['contrato', 'persona', 'persona'])
  })

  it('contrato: orden de la figura 1, fechas con formato oficial y sin "internet" (P3)', () => {
    const c = doc.querySelector('contrato') as Element
    expect(hijos(c)).toEqual(['referencia', 'fechaContrato', 'fechaEntrada', 'fechaSalida', 'numPersonas', 'pago'])
    expect(txt(c, 'referencia')).toBe('RES-2026-0001')
    expect(txt(c, 'fechaContrato')).toBe('2026-10-20')
    expect(txt(c, 'fechaEntrada')).toBe('2026-11-02T15:00:00')
    expect(txt(c, 'fechaSalida')).toBe('2026-11-05T11:00:00')
    expect(txt(c, 'numPersonas')).toBe('2')
    expect(hijos(c.querySelector('pago') as Element)).toEqual(['tipoPago'])
  })

  it('numHabitaciones solo si se informó; pago opcional completo en su orden', () => {
    const x = construirXml(
      establecimiento(),
      [reserva({ numHabitaciones: 2, pago: { tipoPago: 'TARJT', fechaPago: '2026-10-20', medioPago: 'VISA ****1234', titular: 'Lucía Prueba', caducidadTarjeta: '09/2028' } })],
      'partes',
    )
    const c = parse(x).querySelector('contrato') as Element
    expect(hijos(c)).toContain('numHabitaciones')
    expect(hijos(c).indexOf('numHabitaciones')).toBe(hijos(c).indexOf('numPersonas') + 1)
    expect(hijos(c.querySelector('pago') as Element)).toEqual(['tipoPago', 'fechaPago', 'medioPago', 'titular', 'caducidadTarjeta'])
  })

  it('persona (adulto): campos en el orden de la figura 1, rol VI', () => {
    const p = todos(doc, 'persona')[0] as Element
    expect(hijos(p)).toEqual([
      'rol', 'nombre', 'apellido1', 'apellido2', 'tipoDocumento', 'numeroDocumento', 'soporteDocumento',
      'fechaNacimiento', 'nacionalidad', 'sexo', 'direccion', 'telefono', 'correo', 'parentesco',
    ])
    expect(txt(p, 'rol')).toBe('VI')
    expect(txt(p, 'tipoDocumento')).toBe('NIF')
    expect(txt(p, 'numeroDocumento')).toBe('12345678Z')
    expect(txt(p, 'telefono')).toBe('+34600123456')
    expect(txt(p, 'fechaNacimiento')).toBe('1985-04-12')
  })

  it('el parentesco se exporta en el ADULTO responsable, no en el menor (P7)', () => {
    const [a, m] = todos(doc, 'persona') as Element[]
    expect(txt(a as Element, 'parentesco')).toBe('HJ')
    expect(txt(m as Element, 'parentesco')).toBeUndefined()
  })

  it('dirección española: codigoMunicipio y NO nombreMunicipio', () => {
    const d = (todos(doc, 'persona')[0] as Element).querySelector('direccion') as Element
    expect(hijos(d)).toEqual(['direccion', 'codigoMunicipio', 'codigoPostal', 'pais'])
    expect(txt(d, 'pais')).toBe('ESP')
  })

  it('dirección extranjera: nombreMunicipio y NO codigoMunicipio; sin apellido2 no se emite el elemento', () => {
    const x = construirXml(establecimiento(), [reserva({ viajeros: [extranjero()] })], 'partes')
    const p = parse(x).querySelector('persona') as Element
    expect(hijos(p.querySelector('direccion') as Element)).toEqual(['direccion', 'nombreMunicipio', 'codigoPostal', 'pais'])
    expect(hijos(p)).not.toContain('apellido2')
    expect(hijos(p)).not.toContain('soporteDocumento')
    expect(txt(p, 'tipoDocumento')).toBe('PAS')
  })

  it('varias reservas en un mismo fichero', () => {
    const x = construirXml(establecimiento(), [reserva(), reserva({ id: 'r2', referencia: 'RES-2' })], 'partes')
    expect(todos(parse(x), 'comunicacion')).toHaveLength(2)
  })

  it('normaliza el documento (mayúsculas, sin separadores) y el teléfono', () => {
    const x = construirXml(establecimiento(), [reserva({ viajeros: [adulto({ numeroDocumento: '12.345.678-z', soporteDocumento: 'abc123456' })] })], 'partes')
    const p = parse(x).querySelector('persona') as Element
    expect(txt(p, 'numeroDocumento')).toBe('12345678Z')
    expect(txt(p, 'soporteDocumento')).toBe('ABC123456')
  })

  it('escapa caracteres especiales y conserva acentos y eñes', () => {
    const x = construirXml(establecimiento(), [reserva({ viajeros: [adulto({ nombre: "Núñez & <O'Brien> \"X\"", apellido1: 'Peña' })] })], 'partes')
    const p = parse(x).querySelector('persona') as Element
    expect(txt(p, 'nombre')).toBe("Núñez & <O'Brien> \"X\"")
    expect(txt(p, 'apellido1')).toBe('Peña')
  })

  it('elimina caracteres de control no permitidos en XML 1.0', () => {
    const x = construirXml(establecimiento(), [reserva({ viajeros: [adulto({ nombre: 'Ana\u0000\u0008 María' })] })], 'partes')
    expect(txt(parse(x), 'persona nombre')).toBe('Ana María')
  })

  it('no emite elementos vacíos', () => {
    const x = construirXml(establecimiento(), [reserva({ viajeros: [adulto({ apellido2: '  ', telefono2: '' })] })], 'partes')
    for (const el of todos(parse(x), '*')) {
      if (el.children.length === 0) expect(el.textContent?.trim(), el.tagName).not.toBe('')
    }
  })

  it('no exporta datos internos (habitación, canal, código de arrendador)', () => {
    const x = construirXml(establecimiento({ codigoArrendador: 'ARR-99' }), [reserva({ habitacion: 'HAB-777', canal: 'booking-xyz' })], 'partes')
    expect(x).not.toContain('HAB-777')
    expect(x).not.toContain('booking-xyz')
    expect(x).not.toContain('ARR-99')
  })

  it('es determinista', () => {
    const a = construirXml(establecimiento(), [reserva()], 'partes')
    const b = construirXml(establecimiento(), [reserva()], 'partes')
    expect(a).toBe(b)
  })
})

describe('construirXml — reservas de hospedaje (§4, figura 2)', () => {
  const r = reserva({ viajeros: [adulto({ esTitular: true }), extranjero()], numPersonas: 2 })

  it('NO lleva codigoEstablecimiento en solicitud; el establecimiento va dentro de cada comunicacion', () => {
    const doc = parse(construirXml(establecimiento(), [r], 'reservas'))
    const sol = doc.querySelector('solicitud') as Element
    expect(hijos(sol)).toEqual(['comunicacion'])
    expect(hijos(doc.querySelector('comunicacion') as Element)).toEqual(['establecimiento', 'contrato', 'persona', 'persona', 'persona'])
  })

  it('con código de establecimiento: solo <codigo>', () => {
    const doc = parse(construirXml(establecimiento(), [r], 'reservas'))
    const e = doc.querySelector('establecimiento') as Element
    expect(hijos(e)).toEqual(['codigo'])
    expect(txt(e, 'codigo')).toBe('0000012345')
  })

  it('sin código: datosEstablecimiento con tipo, nombre y dirección', () => {
    const doc = parse(construirXml(establecimiento({ codigoEstablecimiento: '' }), [r], 'reservas'))
    const e = doc.querySelector('establecimiento') as Element
    expect(hijos(e)).toEqual(['datosEstablecimiento'])
    const d = e.querySelector('datosEstablecimiento') as Element
    expect(hijos(d)).toEqual(['tipo', 'nombre', 'direccion'])
    expect(txt(d, 'tipo')).toBe('HOSTAL')
    expect(txt(d, 'nombre')).toBe('Hostal Demo')
  })

  it('personas: primero el titular (TI), luego un VI por viajero; sin soporte ni parentesco', () => {
    const doc = parse(construirXml(establecimiento(), [r], 'reservas'))
    const ps = todos(doc, 'persona')
    expect(ps.map((p) => txt(p, 'rol'))).toEqual(['TI', 'VI', 'VI'])
    expect(txt(ps[0] as Element, 'nombre')).toBe('Lucía')
    for (const p of ps) {
      expect(hijos(p)).not.toContain('soporteDocumento')
      expect(hijos(p)).not.toContain('parentesco')
    }
    expect(hijos(ps[0] as Element)).toEqual([
      'rol', 'nombre', 'apellido1', 'apellido2', 'tipoDocumento', 'numeroDocumento', 'fechaNacimiento',
      'nacionalidad', 'sexo', 'direccion', 'telefono', 'correo',
    ])
  })
})

describe('nombreFichero', () => {
  it('incluye el tipo y la marca de tiempo', () => {
    expect(nombreFichero('partes', new Date('2026-11-02T14:05:09'))).toBe('partes-viajeros_20261102-1405.xml')
    expect(nombreFichero('reservas', new Date('2026-11-02T14:05:09'))).toBe('reservas-hospedaje_20261102-1405.xml')
  })
})
