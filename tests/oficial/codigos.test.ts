import { describe, expect, it } from 'vitest'
import {
  PARENTESCO,
  SEXO,
  TIPO_DOCUMENTO,
  TIPO_ESTABLECIMIENTO,
  TIPO_PAGO,
  ROL_PERSONA,
  esCodigo,
} from '../../src/oficial/codigos'
import { PAISES, esPaisAlfa3, alfa3Espana } from '../../src/oficial/paises'

// Transcripción literal de las tablas del apartado 8 de docs/oficial/Instrucciones.pdf (v1.1.0)
describe('tablas de códigos oficiales (apartado 8)', () => {
  it('8.3 relación de parentesco: 15 códigos', () => {
    expect(Object.keys(PARENTESCO)).toEqual([
      'AB', 'BA', 'BN', 'CD', 'CY', 'HJ', 'HR', 'NI', 'PM', 'SB', 'SG', 'TI', 'YN', 'TU', 'OT',
    ])
    expect(PARENTESCO.PM.es).toBe('Padre o madre')
    expect(PARENTESCO.CY.es).toBe('Cónyuge')
  })

  it('8.4 sexo: H, M, O', () => {
    expect(Object.keys(SEXO)).toEqual(['H', 'M', 'O'])
  })

  it('8.5 tipos de documento: NIF, NIE, PAS, OTRO', () => {
    expect(Object.keys(TIPO_DOCUMENTO)).toEqual(['NIF', 'NIE', 'PAS', 'OTRO'])
  })

  it('8.6 tipos de establecimiento: 17 códigos, incluye HOSTAL', () => {
    expect(Object.keys(TIPO_ESTABLECIMIENTO)).toHaveLength(17)
    expect(TIPO_ESTABLECIMIENTO.HOSTAL.es).toBe('Hostal')
    expect(TIPO_ESTABLECIMIENTO.CASA_HUESP.es).toBe('Casa de huéspedes')
  })

  it('8.7 tipos de pago: 8 códigos', () => {
    expect(Object.keys(TIPO_PAGO)).toEqual(['EFECT', 'TARJT', 'PLATF', 'TRANS', 'MOVIL', 'TREG', 'DESTI', 'OTRO'])
  })

  it('rol de persona en hospedaje: TI (titular) y VI (viajero)', () => {
    expect(Object.keys(ROL_PERSONA)).toEqual(['TI', 'VI'])
  })

  it('esCodigo distingue códigos válidos de inventados', () => {
    expect(esCodigo(TIPO_PAGO, 'EFECT')).toBe(true)
    expect(esCodigo(TIPO_PAGO, 'BIZUM')).toBe(false)
    expect(esCodigo(SEXO, 'h')).toBe(false)
  })
})

describe('países ISO 3166-1 alfa-3 (norma citada por el documento oficial)', () => {
  it('contiene los 249 códigos oficialmente asignados, sin duplicados', () => {
    expect(PAISES).toHaveLength(249)
    expect(new Set(PAISES.map((p) => p.alfa3)).size).toBe(249)
    expect(new Set(PAISES.map((p) => p.alfa2)).size).toBe(249)
  })

  it('todos los alfa-3 son 3 letras mayúsculas y los alfa-2 son reconocidos por Intl', () => {
    const nombres = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
    for (const p of PAISES) {
      expect(p.alfa3).toMatch(/^[A-Z]{3}$/)
      expect(nombres.of(p.alfa2), p.alfa2).toBeTruthy()
    }
  })

  it('casos conocidos', () => {
    expect(esPaisAlfa3('ESP')).toBe(true)
    expect(esPaisAlfa3('GBR')).toBe(true)
    expect(esPaisAlfa3('USA')).toBe(true)
    expect(esPaisAlfa3('DEU')).toBe(true)
    expect(esPaisAlfa3('XXX')).toBe(false)
    expect(esPaisAlfa3('es')).toBe(false)
    expect(alfa3Espana).toBe('ESP')
  })
})
