import { describe, expect, it } from 'vitest'
import { validarDireccion } from '../../src/validators/direccion'
import type { Direccion } from '../../src/domain/tipos'

const espana: Direccion = { direccion: 'Calle Mayor 1, 2ºA', codigoMunicipio: '28079', codigoPostal: '28013', pais: 'ESP' }
const francia: Direccion = { direccion: '12 Rue de Rivoli', nombreMunicipio: 'Paris', codigoPostal: '75001', pais: 'FRA' }
const codigos = (d: Direccion) => validarDireccion(d).map((i) => `${i.campo}:${i.codigo}:${i.gravedad}`)

describe('validarDireccion (§7.1 del documento oficial)', () => {
  it('dirección española completa: sin incidencias', () => {
    expect(validarDireccion(espana)).toEqual([])
  })

  it('dirección extranjera completa: sin incidencias', () => {
    expect(validarDireccion(francia)).toEqual([])
  })

  it('España exige código de municipio INE de 5 dígitos', () => {
    expect(codigos({ ...espana, codigoMunicipio: undefined })).toContain('codigoMunicipio:requerido:error')
    expect(codigos({ ...espana, codigoMunicipio: '2807' })).toContain('codigoMunicipio:municipio_ine_formato:error')
    expect(codigos({ ...espana, codigoMunicipio: 'ABCDE' })).toContain('codigoMunicipio:municipio_ine_formato:error')
  })

  it('un país distinto de España exige nombre de municipio (no el código INE)', () => {
    expect(codigos({ ...francia, nombreMunicipio: '' })).toContain('nombreMunicipio:requerido:error')
    expect(codigos({ ...francia, nombreMunicipio: undefined })).toContain('nombreMunicipio:requerido:error')
  })

  it('exige calle, código postal y país', () => {
    const r = codigos({ direccion: '', codigoPostal: '', pais: '' })
    expect(r).toContain('direccion:requerido:error')
    expect(r).toContain('codigoPostal:requerido:error')
    expect(r).toContain('pais:requerido:error')
  })

  it('país debe ser ISO 3166-1 alfa-3', () => {
    expect(codigos({ ...francia, pais: 'FR' })).toContain('pais:pais_invalido:error')
    expect(codigos({ ...francia, pais: 'XXX' })).toContain('pais:pais_invalido:error')
  })

  it('respeta las longitudes máximas del documento (100 / 100 / 100 / 20)', () => {
    const largo = 'x'.repeat(101)
    const r = codigos({ ...francia, direccion: largo, direccionComplementaria: largo, nombreMunicipio: largo, codigoPostal: 'y'.repeat(21) })
    expect(r).toContain('direccion:longitud_max:error')
    expect(r).toContain('direccionComplementaria:longitud_max:error')
    expect(r).toContain('nombreMunicipio:longitud_max:error')
    expect(r).toContain('codigoPostal:longitud_max:error')
  })

  it('un código postal español que no tiene 5 dígitos es solo un AVISO (el documento no lo exige)', () => {
    expect(codigos({ ...espana, codigoPostal: '2801' })).toContain('codigoPostal:cp_espana_formato:aviso')
  })
})
