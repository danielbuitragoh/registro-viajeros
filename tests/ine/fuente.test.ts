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
})

describe('elegirFuente: qué relaciones usa la app', () => {
  it('usa SOLO las oficiales, la más reciente primero', () => {
    const of = { 'a/municipios-2025-01-01.json': 'v2025', 'a/municipios-2026-01-01.json': 'v2026' }
    expect(elegirFuente(of)).toEqual({ origen: 'oficial', cargadores: ['v2026', 'v2025'] })
  })

  it('sin relación oficial no hay relación (el código INE se escribe a mano): nunca se inventa uno', () => {
    expect(elegirFuente({})).toEqual({ origen: 'ninguna', cargadores: [] })
  })

  it('en el repositorio no queda ninguna muestra ficticia de la app (src/demo/ine ya no existe)', () => {
    expect(existsSync(join(raiz, 'src/demo/ine'))).toBe(false)
  })
})
