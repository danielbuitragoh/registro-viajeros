import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importar } from '../../scripts/ine/importar'
import { buscarMunicipios, decodificarRelacion, estadoCodigo, nombreCoincide, normalizar, ordenarRelaciones, variantesNombre, type RelacionIne } from '../../src/ine/relacion'

/** Relaciones FICTICIAS (provincias 98 y 99, que no existen). */
async function relacion(fichero: string): Promise<RelacionIne> {
  const r = await importar(new Uint8Array(readFileSync(join(__dirname, '..', 'fixtures', 'ine', fichero))), fichero, { ficticia: true })
  return decodificarRelacion(JSON.parse(r.json))
}
const r2025 = await relacion('relacion-ficticia-2025.xlsx')
const r2026 = await relacion('relacion-ficticia-2026.csv')

describe('decodificarRelacion', () => {
  it('rechaza un JSON que no tiene el formato esperado (nunca carga datos dudosos)', () => {
    expect(() => decodificarRelacion(null)).toThrow()
    expect(() => decodificarRelacion({ formato: 2, fecha: '2025-01-01', provincias: {} })).toThrow(/formato/)
    expect(() => decodificarRelacion({ formato: 1, fecha: '2025-13-01', provincias: { '99': ['001X'] } })).toThrow(/fecha/)
    expect(() => decodificarRelacion({ formato: 1, fecha: '2025-01-01', provincias: { '9': ['001X'] } })).toThrow(/provincia/)
    expect(() => decodificarRelacion({ formato: 1, fecha: '2025-01-01', provincias: { '99': ['01X'] } })).toThrow(/municipio/)
  })

  it('indexa por código y conserva el nombre oficial tal cual', () => {
    expect(r2025.porCodigo.get('99003')).toEqual({ codigo: '99003', nombre: 'Rozas del Ensayo, Las', provincia: '99' })
    expect(r2025.municipios).toHaveLength(10)
    expect(r2025.ficticia).toBe(true)
  })

  it('ordenarRelaciones deja la más reciente primero', () => {
    expect(ordenarRelaciones([r2025, r2026]).map((r) => r.fecha)).toEqual(['2026-01-01', '2025-01-01'])
  })
})

describe('nombres: normalización y variantes', () => {
  it('normalizar quita tildes, mayúsculas y signos', () => {
    expect(normalizar('  Ávila de MENTIRA ')).toBe('avila de mentira')
    expect(normalizar('Peña-Simulada')).toBe('pena simulada')
  })

  it('el artículo pospuesto («Rozas del Ensayo, Las») y los nombres bilingües («Muestra/Mostra») se buscan de todas las formas', () => {
    expect(variantesNombre('Rozas del Ensayo, Las')).toEqual(['Rozas del Ensayo, Las', 'Las Rozas del Ensayo'])
    expect(variantesNombre('Coruñita de Ejemplo, A')).toContain('A Coruñita de Ejemplo')
    expect(variantesNombre('Muestra/Mostra')).toEqual(['Muestra/Mostra', 'Muestra', 'Mostra'])
  })

  it('nombreCoincide acepta cualquiera de las variantes', () => {
    const rozas = r2025.porCodigo.get('99003')!
    expect(nombreCoincide(rozas, 'las rozas del ensayo')).toBe(true)
    expect(nombreCoincide(rozas, 'Rozas del Ensayo')).toBe(true)
    expect(nombreCoincide(r2025.porCodigo.get('99004')!, 'MOSTRA')).toBe(true)
    expect(nombreCoincide(rozas, 'Villaficticia')).toBe(false)
  })
})

describe('buscarMunicipios', () => {
  const codigos = (rel: RelacionIne, q: string, o?: Parameters<typeof buscarMunicipios>[2]) => buscarMunicipios(rel, q, o).map((m) => m.codigo)

  it('encuentra sin tildes, por el principio de cualquier palabra y con el artículo delante', () => {
    expect(codigos(r2025, 'avila')).toEqual(['98002'])
    expect(codigos(r2025, 'las rozas')).toEqual(['99003'])
    expect(codigos(r2025, 'ensayo')).toEqual(['99003'])
    expect(codigos(r2025, 'a coruñita')).toEqual(['99005'])
    expect(codigos(r2025, 'mostra')).toEqual(['99004'])
  })

  it('primero la coincidencia exacta, luego «empieza por», luego «contiene»', () => {
    expect(codigos(r2026, 'san inventado')).toEqual(['99901'])
    expect(codigos(r2025, 'san inventado')).toEqual(['99006', '99007'])
    expect(codigos(r2025, 'ficti')).toEqual(['98001', '99001'])
  })

  it('con la provincia del código postal, los municipios de esa provincia van primero (el mismo nombre en dos provincias)', () => {
    expect(codigos(r2025, 'villaficticia')).toEqual(['98001', '99001'])
    expect(codigos(r2025, 'villaficticia', { provincia: '99' })).toEqual(['99001', '98001'])
  })

  it('también busca por código (al menos 2 cifras)', () => {
    expect(codigos(r2025, '9900')).toEqual(['99001', '99002', '99003', '99004', '99005', '99006', '99007'])
    expect(codigos(r2025, '98002')).toEqual(['98002'])
  })

  it('menos de 2 caracteres no busca; respeta el máximo de resultados', () => {
    expect(codigos(r2025, 'a')).toEqual([])
    expect(codigos(r2025, '  ')).toEqual([])
    expect(codigos(r2025, '99', { max: 3 })).toHaveLength(3)
  })
})

describe('estadoCodigo: un código según la fecha de la relación (fusiones y altas)', () => {
  const ambas = ordenarRelaciones([r2025, r2026])

  it('vigente en la relación más reciente', () => {
    expect(estadoCodigo(ambas, '99901')).toEqual({ tipo: 'vigente', municipio: r2026.porCodigo.get('99901'), fecha: '2026-01-01' })
  })

  it('dado de baja: figuraba en una relación anterior pero no en la más reciente (p. ej. fusión)', () => {
    expect(estadoCodigo(ambas, '99006')).toEqual({ tipo: 'baja', municipio: r2025.porCodigo.get('99006'), fechaAnterior: '2025-01-01', fecha: '2026-01-01' })
  })

  it('no figura en ninguna (puede ser un error o un alta posterior a la relación)', () => {
    expect(estadoCodigo(ambas, '12345')).toEqual({ tipo: 'no_figura', fecha: '2026-01-01' })
    // Con solo la relación de 2025, el alta de 2026 «no figura» todavía
    expect(estadoCodigo([r2025], '99901')).toEqual({ tipo: 'no_figura', fecha: '2025-01-01' })
  })

  it('sin relaciones o con un código mal formado no dice nada (eso lo valida el formato)', () => {
    expect(estadoCodigo([], '99001')).toBeUndefined()
    expect(estadoCodigo(ambas, '9900')).toBeUndefined()
    expect(estadoCodigo(ambas, '')).toBeUndefined()
  })
})
