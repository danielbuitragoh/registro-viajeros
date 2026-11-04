import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sha256Hex } from '../../scripts/ine/importar'
import { cargarRelaciones } from '../../src/ine/fuente'
import { buscarMunicipios, decodificarRelacion, estadoCodigo } from '../../src/ine/relacion'

/**
 * La relación REAL del INE («Relación de municipios y sus códigos por provincias», municipios a 1-1-2025) tal como
 * la genera `npm run ine:importar`. Es el último fichero publicado por el INE a 4-11-2026 (el de 2026 no está publicado).
 * Origen: https://www.ine.es/daco/daco42/codmun/codmun25/diccionario25.xlsx
 */
const raiz = join(__dirname, '..', '..')
const XLSX = join(raiz, 'docs/oficial/ine/diccionario25.xlsx')
const JSON_OFICIAL = join(raiz, 'src/oficial/ine/municipios-2025-01-01.json')
const datos = JSON.parse(readFileSync(JSON_OFICIAL, 'utf8')) as { fecha: string; ficticia: boolean; total: number; origen: { fichero: string; sha256: string }; provincias: Record<string, string[]> }
const rel = decodificarRelacion(datos)

describe('fichero oficial del INE guardado en el repositorio', () => {
  it('es el descargado de la web del INE, sin tocar: 306.558 bytes y su huella SHA-256', async () => {
    const bytes = new Uint8Array(readFileSync(XLSX))
    expect(bytes.length).toBe(306_558)
    expect(await sha256Hex(bytes)).toBe('5cf83d5b9c68b4c39650b2f38cd60d817a2c9f90acc618b603e8c17ebd12ad07')
  })

  it('el JSON generado declara ese mismo fichero y huella, la fecha 1-1-2025 y que NO es una muestra', () => {
    expect(datos.origen).toEqual({ fichero: 'diccionario25.xlsx', sha256: '5cf83d5b9c68b4c39650b2f38cd60d817a2c9f90acc618b603e8c17ebd12ad07' })
    expect(datos.fecha).toBe('2025-01-01')
    expect(datos.ficticia).toBe(false)
  })
})

describe('contenido de la relación oficial a 1-1-2025', () => {
  it('8.132 municipios (el total coincide con el campo «total») en las 52 provincias (01 a 52)', () => {
    expect(rel.municipios).toHaveLength(8132)
    expect(datos.total).toBe(8132)
    expect(Object.keys(datos.provincias).sort()).toEqual(Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, '0')))
  })

  it('sin códigos repetidos, mal formados ni nombres vacíos', () => {
    const codigos = rel.municipios.map((m) => m.codigo)
    expect(new Set(codigos).size).toBe(codigos.length)
    for (const m of rel.municipios) {
      expect(m.codigo).toMatch(/^\d{5}$/)
      expect(m.codigo.startsWith(m.provincia)).toBe(true)
      expect(m.nombre.trim()).not.toBe('')
    }
  })

  it.each([
    ['28079', 'Madrid'],
    ['08019', 'Barcelona'],
    ['46250', 'València'],
    ['41091', 'Sevilla'],
    ['48020', 'Bilbao'],
    ['51001', 'Ceuta'],
    ['52001', 'Melilla'],
  ])('el código %s es %s', (codigo, nombre) => {
    expect(rel.porCodigo.get(codigo)?.nombre).toBe(nombre)
    expect(estadoCodigo([rel], codigo)).toMatchObject({ tipo: 'vigente', municipio: { codigo, nombre } })
  })

  it('el autocompletado encuentra las grandes ciudades por su nombre, también sin tilde', () => {
    expect(buscarMunicipios(rel, 'madrid')[0]?.codigo).toBe('28079')
    expect(buscarMunicipios(rel, 'valencia')[0]?.codigo).toBe('46250')
    expect(buscarMunicipios(rel, 'bilbao')[0]?.codigo).toBe('48020')
    expect(buscarMunicipios(rel, 'sevilla', { provincia: '41' })[0]?.codigo).toBe('41091')
  })

  it('un código que no existe en la relación no figura (las provincias 98 y 99 ya no están en la app)', () => {
    expect(estadoCodigo([rel], '99001')).toMatchObject({ tipo: 'no_figura' })
    expect(estadoCodigo([rel], '28999')).toMatchObject({ tipo: 'no_figura' })
  })
})

describe('la app carga esa relación (carga diferida)', () => {
  it('cargarRelaciones() devuelve solo la oficial a 1-1-2025', async () => {
    const rs = await cargarRelaciones()
    expect(rs).toHaveLength(1)
    expect(rs[0]).toMatchObject({ fecha: '2025-01-01', ficticia: false })
    expect(rs[0]?.municipios).toHaveLength(8132)
    expect(rs[0]?.porCodigo.get('28079')?.nombre).toBe('Madrid')
  })
})
