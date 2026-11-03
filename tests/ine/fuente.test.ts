import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importar, sha256Hex } from '../../scripts/ine/importar'
import { elegirFuente } from '../../src/ine/fuente'

const raiz = join(__dirname, '..', '..')
const jsons = (dir: string) => (existsSync(join(raiz, dir)) ? readdirSync(join(raiz, dir)).filter((f) => /^municipios-\d{4}-\d{2}-\d{2}\.json$/.test(f)) : [])
const fuentesOficiales = existsSync(join(raiz, 'docs/oficial/ine')) ? readdirSync(join(raiz, 'docs/oficial/ine')).filter((f) => /\.(xlsx|csv)$/i.test(f)) : []

/**
 * Guardia del origen de los datos: los códigos INE de la app salen SOLO del fichero oficial del INE.
 * Cada JSON de src/oficial/ine/ debe poder regenerarse, idéntico, desde su fichero en docs/oficial/ine/.
 */
describe('origen de los códigos INE', () => {
  it.each(jsons('src/oficial/ine'))('src/oficial/ine/%s sale íntegro de un fichero oficial de docs/oficial/ine/', async (f) => {
    const texto = readFileSync(join(raiz, 'src/oficial/ine', f), 'utf8')
    const datos = JSON.parse(texto)
    expect(datos.ficticia).toBe(false)
    const origen = join(raiz, 'docs/oficial/ine', datos.origen.fichero)
    expect(existsSync(origen), `falta ${origen}`).toBe(true)
    const bytes = new Uint8Array(readFileSync(origen))
    expect(await sha256Hex(bytes)).toBe(datos.origen.sha256)
    const r = await importar(bytes, datos.origen.fichero, { fecha: datos.fecha })
    expect(r.json).toBe(texto)
    expect(r.nombreSalida).toBe(f)
  })

  it.each(fuentesOficiales)('docs/oficial/ine/%s tiene su JSON importado en src/oficial/ine/ (npm run ine:importar)', (f) => {
    const usados = jsons('src/oficial/ine').map((j) => JSON.parse(readFileSync(join(raiz, 'src/oficial/ine', j), 'utf8')).origen.fichero)
    expect(usados).toContain(f)
  })

  it.each(jsons('src/demo/ine'))('la muestra de la demo src/demo/ine/%s es FICTICIA y sale de tests/fixtures/ine/', async (f) => {
    const texto = readFileSync(join(raiz, 'src/demo/ine', f), 'utf8')
    const datos = JSON.parse(texto)
    expect(datos.ficticia).toBe(true)
    const bytes = new Uint8Array(readFileSync(join(raiz, 'tests/fixtures/ine', datos.origen.fichero)))
    expect((await importar(bytes, datos.origen.fichero, { ficticia: true })).json).toBe(texto)
    // Provincias 98 y 99: no existen, así que ningún código ficticio puede confundirse con uno real
    for (const p of Object.keys(datos.provincias)) expect(['98', '99']).toContain(p)
  })

  it('hay muestra ficticia para la demo (dos fechas, para ver altas y fusiones)', () => {
    expect(jsons('src/demo/ine')).toEqual(['municipios-2025-01-01.json', 'municipios-2026-01-01.json'])
  })
})

describe('elegirFuente: qué relaciones usa la app', () => {
  const of = { 'a/municipios-2025-01-01.json': 'oficial' }
  const de = { 'b/municipios-2026-01-01.json': 'demo' }

  it('si hay relaciones oficiales usa SOLO esas, también en la demo (nunca mezcla datos ficticios con oficiales)', () => {
    expect(elegirFuente(of, de, true)).toEqual({ origen: 'oficial', cargadores: ['oficial'] })
    expect(elegirFuente(of, de, false)).toEqual({ origen: 'oficial', cargadores: ['oficial'] })
  })

  it('sin relación oficial: la demo usa la muestra ficticia y la app normal no tiene relación (código a mano)', () => {
    expect(elegirFuente({}, de, true)).toEqual({ origen: 'ficticia', cargadores: ['demo'] })
    expect(elegirFuente({}, de, false)).toEqual({ origen: 'ninguna', cargadores: [] })
  })
})
