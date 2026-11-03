import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importar } from '../../scripts/ine/importar'
import { consultaIne, decodificarRelacion, ordenarRelaciones } from '../../src/ine/relacion'
import { validarViajero } from '../../src/validators/viajero'
import { validarReserva } from '../../src/validators/reserva'
import { mensajeIncidencia } from '../../src/i18n/mensajes'
import { adulto, reserva } from '../fixtures'

const rel = async (f: string) => decodificarRelacion(JSON.parse((await importar(new Uint8Array(readFileSync(join(__dirname, '..', 'fixtures', 'ine', f))), f, { ficticia: true })).json))
const relaciones = ordenarRelaciones([await rel('relacion-ficticia-2025.xlsx'), await rel('relacion-ficticia-2026.csv')])
const ine = consultaIne(relaciones)
const ctx = { fechaEntrada: '2026-11-02', modo: 'parte' as const, ine }
const conMunicipio = (codigoMunicipio: string, nombreMunicipio?: string) =>
  adulto({ direccion: { direccion: 'Calle Inventada 1', codigoMunicipio, nombreMunicipio, codigoPostal: '99001', pais: 'ESP' } })
const delIne = (v: ReturnType<typeof adulto>) => validarViajero(v, ctx).filter((i) => i.campo === 'direccion.codigoMunicipio')

describe('validación del código INE contra la relación de municipios (solo avisos)', () => {
  it('código vigente y nombre que coincide (o sin nombre): ningún aviso', () => {
    expect(delIne(conMunicipio('99003', 'Las Rozas del Ensayo'))).toEqual([])
    expect(delIne(conMunicipio('99003'))).toEqual([])
  })

  it('código que no figura en la relación: aviso con la fecha de la relación (nunca error: puede ser un alta posterior)', () => {
    const [i] = delIne(conMunicipio('12345'))
    expect(i).toMatchObject({ codigo: 'municipio_ine_no_figura', gravedad: 'aviso', params: { codigo: '12345', fecha: '01/01/2026' } })
    expect(mensajeIncidencia(i!, 'es')).toBe('El código 12345 no figura en la relación de municipios del INE a 01/01/2026. Compruébalo: puede ser un error o un municipio dado de alta después.')
  })

  it('código dado de baja (fusión…): aviso con el municipio y las dos fechas', () => {
    const [i] = delIne(conMunicipio('99006'))
    expect(i).toMatchObject({ codigo: 'municipio_ine_baja', gravedad: 'aviso', params: { codigo: '99006', nombre: 'San Inventado de Abajo', fechaAnterior: '01/01/2025', fecha: '01/01/2026' } })
    expect(mensajeIncidencia(i!, 'es')).toContain('San Inventado de Abajo')
  })

  it('código vigente pero el nombre escrito es de otro municipio: aviso con el nombre oficial', () => {
    const [i] = delIne(conMunicipio('99003', 'Villaficticia'))
    expect(i).toMatchObject({ codigo: 'municipio_ine_nombre', gravedad: 'aviso', params: { codigo: '99003', nombre: 'Rozas del Ensayo, Las' } })
    expect(i!.campo).toBe('direccion.codigoMunicipio')
  })

  it('sin relación cargada, con formato incorrecto o fuera de España no se consulta nada', () => {
    expect(validarViajero(conMunicipio('12345'), { ...ctx, ine: undefined }).some((i) => i.codigo.startsWith('municipio_ine_') && i.codigo !== 'municipio_ine_formato')).toBe(false)
    expect(delIne(conMunicipio('123')).map((i) => i.codigo)).toEqual(['municipio_ine_formato'])
    const fuera = adulto({ direccion: { direccion: '1 Main St', nombreMunicipio: 'Springfield', codigoMunicipio: '12345', codigoPostal: '62701', pais: 'USA' } })
    expect(delIne(fuera)).toEqual([])
  })

  it('los avisos no cambian el estado del parte (un aviso no bloquea la exportación)', () => {
    const r = reserva({ viajeros: [conMunicipio('12345')] })
    const inc = validarReserva(r, 'partes', { ine })
    expect(inc.find((i) => i.codigo === 'municipio_ine_no_figura')).toMatchObject({ viajeroId: r.viajeros[0]!.id, gravedad: 'aviso' })
    expect(validarReserva(r, 'partes').some((i) => i.codigo === 'municipio_ine_no_figura')).toBe(false)
  })

  it.each(['en', 'fr', 'de', 'it', 'pt'] as const)('los tres avisos están traducidos en %s y conservan código, nombre y fechas', (idioma) => {
    for (const v of [conMunicipio('12345'), conMunicipio('99006'), conMunicipio('99003', 'Villaficticia')]) {
      const [i] = delIne(v)
      const m = mensajeIncidencia(i!, idioma)
      expect(m).not.toBe(mensajeIncidencia(i!, 'es'))
      expect(m).toContain(i!.params!.codigo as string)
      for (const p of Object.values(i!.params!)) expect(m).toContain(String(p))
    }
  })
})
