import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ErrorImportacion,
  compararRelaciones,
  extraerRelacion,
  importar,
  leerCsv,
  leerTabla,
  leerXlsx,
  serializarRelacion,
  sha256Hex,
} from '../../scripts/ine/importar'
import { decodificarRelacion } from '../../src/ine/relacion'

/** Muestras FICTICIAS (provincias 98 y 99, que no existen): ver tests/fixtures/ine/LEEME-FICTICIO.md */
const dir = join(__dirname, '..', 'fixtures', 'ine')
const leer = (f: string) => new Uint8Array(readFileSync(join(dir, f)))
const XLSX_2025 = 'relacion-ficticia-2025.xlsx'
const CSV_2026 = 'relacion-ficticia-2026.csv'
const utf8 = (s: string) => new TextEncoder().encode(s)

describe('lectura del xlsx (sin dependencias; escrito por openpyxl, un programa distinto)', () => {
  it('lee la hoja con la fila de título, la cabecera y las 10 filas, con números y textos mezclados', async () => {
    const filas = await leerXlsx(leer(XLSX_2025))
    expect(filas[0]?.[0]).toContain('a 01-01-2025')
    const cab = filas.findIndex((f) => f.includes('NOMBRE'))
    expect(filas[cab]).toEqual(['CODAUTO', 'CPRO', 'CMUN', 'DC', 'NOMBRE'])
    const datos = filas.slice(cab + 1).filter((f) => f.some((c) => c !== ''))
    expect(datos).toHaveLength(10)
    // CPRO guardado como número pierde el 0 a la izquierda; como texto lo conserva
    expect(datos.map((f) => f[1])).toContain('98')
    expect(datos.map((f) => f[2])).toContain('1')
    expect(datos.map((f) => f[2])).toContain('002')
    expect(datos.map((f) => f[4])).toContain('Ávila de Mentira')
  })

  it('un fichero que no es un xlsx da un error claro', async () => {
    await expect(leerXlsx(utf8('hola'))).rejects.toThrow(ErrorImportacion)
  })
})

describe('lectura del csv', () => {
  it('detecta Windows-1252 y el separador «;» (como los csv que exporta Excel en español)', () => {
    const filas = leerCsv(leer(CSV_2026))
    expect(filas[0]?.[0]).toContain('1 de enero de 2026')
    expect(filas[1]).toEqual(['CODAUTO', 'CPRO', 'CMUN', 'DC', 'NOMBRE'])
    expect(filas.map((f) => f[4])).toContain('Ávila de Mentirijillas')
    expect(filas.map((f) => f[4])).toContain('Peña Simulada')
  })

  it('UTF-8 con BOM, separador «,», comillas con comas dentro y comillas escapadas', () => {
    const texto = '﻿CPRO,CMUN,NOMBRE\r\n99,003,"Rozas del Ensayo, Las"\n99,004,"Muestra ""Mostra"""\n'
    expect(leerCsv(utf8(texto))).toEqual([
      ['CPRO', 'CMUN', 'NOMBRE'],
      ['99', '003', 'Rozas del Ensayo, Las'],
      ['99', '004', 'Muestra "Mostra"'],
    ])
  })

  it('leerTabla elige por extensión y rechaza el .xls antiguo explicando qué hacer', async () => {
    expect((await leerTabla(leer(CSV_2026), 'x.CSV')).length).toBeGreaterThan(5)
    expect((await leerTabla(leer(XLSX_2025), 'x.xlsx')).length).toBeGreaterThan(5)
    await expect(leerTabla(utf8('x'), 'relacion.xls')).rejects.toThrow(/xlsx o csv/)
    await expect(leerTabla(utf8('x'), 'relacion.pdf')).rejects.toThrow(ErrorImportacion)
  })
})

describe('extraerRelacion: de la tabla a «código INE de 5 dígitos → nombre»', () => {
  const cab = ['CODAUTO', 'CPRO', 'CMUN', 'DC', 'NOMBRE']

  it('código = CPRO (2) + CMUN (3), rellenando ceros; el dígito de control (DC) no forma parte del código de 5 dígitos', async () => {
    const r = extraerRelacion(await leerXlsx(leer(XLSX_2025)), {})
    expect(r.fecha).toBe('2025-01-01')
    expect(r.municipios).toHaveLength(10)
    expect(r.municipios).toContainEqual({ codigo: '98002', nombre: 'Ávila de Mentira' })
    expect(r.municipios).toContainEqual({ codigo: '99001', nombre: 'Villaficticia' })
    expect(r.municipios).toContainEqual({ codigo: '99003', nombre: 'Rozas del Ensayo, Las' })
    for (const m of r.municipios) expect(m.codigo).toMatch(/^\d{5}$/)
  })

  it('encuentra la cabecera en cualquier fila y columna, sin importar mayúsculas ni espacios', () => {
    const r = extraerRelacion([['título sin fecha'], [], ['Nombre ', ' cmun', 'cpro'], ['Aldea de Prueba', '2', '99']], { fecha: '2025-01-01' })
    expect(r.municipios).toEqual([{ codigo: '99002', nombre: 'Aldea de Prueba' }])
  })

  it.each([
    ['Relación de municipios y códigos por provincias a 01-01-2025', '2025-01-01'],
    ['Relación … a 1 de enero de 2026', '2026-01-01'],
    ['Relación … a fecha 01/01/2024', '2024-01-01'],
    ['RELACIÓN … A 1 DE ENERO DE 2023', '2023-01-01'],
  ])('lee la fecha de la relación del título: «%s» → %s', (titulo, fecha) => {
    expect(extraerRelacion([[titulo], cab, ['99', '99', '1', '0', 'X']], {}).fecha).toBe(fecha)
  })

  it('sin fecha en el título exige --fecha; si el título y --fecha no coinciden, se detiene', () => {
    expect(() => extraerRelacion([cab, ['99', '99', '1', '0', 'X']], {})).toThrow(/--fecha/)
    expect(extraerRelacion([cab, ['99', '99', '1', '0', 'X']], { fecha: '2025-01-01' }).fecha).toBe('2025-01-01')
    expect(() => extraerRelacion([['… a 01-01-2025'], cab, ['99', '99', '1', '0', 'X']], { fecha: '2026-01-01' })).toThrow(/no coincide/)
    expect(() => extraerRelacion([cab, ['99', '99', '1', '0', 'X']], { fecha: '2025-02-30' })).toThrow(/fecha/)
  })

  it('si falta una columna necesaria se detiene y dice qué columnas ha encontrado (nunca adivina)', () => {
    expect(() => extraerRelacion([['CPRO', 'MUNICIPIO', 'NOMBRE'], ['99', '001', 'X']], { fecha: '2025-01-01' })).toThrow(/CMUN/)
  })

  it.each([
    [['99', '123', '1', '0', 'X'], /CPRO/],
    [['99', '99', '1234', '0', 'X'], /CMUN/],
    [['99', '9a', '1', '0', 'X'], /CPRO/],
    [['99', '99', '1', '0', '   '], /NOMBRE/],
  ])('fila inválida %j → error con el número de fila', (fila, motivo) => {
    expect(() => extraerRelacion([cab, fila], { fecha: '2025-01-01' })).toThrow(motivo)
    expect(() => extraerRelacion([cab, fila], { fecha: '2025-01-01' })).toThrow(/fila 2/)
  })

  it('un código repetido es un error; las filas vacías se ignoran; los nombres se recortan', () => {
    expect(() => extraerRelacion([cab, ['99', '99', '1', '0', 'X'], ['99', '99', '001', '0', 'Y']], { fecha: '2025-01-01' })).toThrow(/repetido/)
    const r = extraerRelacion([cab, [], ['', '', '', '', ''], ['99', '99', '1', '0', '  X  ']], { fecha: '2025-01-01' })
    expect(r.municipios).toEqual([{ codigo: '99001', nombre: 'X' }])
  })

  it('una relación sin ningún municipio es un error', () => {
    expect(() => extraerRelacion([cab], { fecha: '2025-01-01' })).toThrow(/ningún municipio/)
  })
})

describe('JSON compacto versionado y comparación entre relaciones (fusiones, altas, cambios de nombre)', () => {
  it('serializa de forma determinista (una provincia por línea) con fecha y huella del fichero de origen, y la app lo lee igual', async () => {
    const bytes = leer(XLSX_2025)
    const rel = extraerRelacion(await leerXlsx(bytes), {})
    const sha = await sha256Hex(bytes)
    expect(sha).toMatch(/^[0-9a-f]{64}$/)
    const json = serializarRelacion(rel, { fichero: XLSX_2025, sha256: sha, ficticia: true })
    expect(json).toBe(serializarRelacion({ ...rel, municipios: [...rel.municipios].reverse() }, { fichero: XLSX_2025, sha256: sha, ficticia: true }))
    expect(json.split('\n').filter((l) => /^\s+"9[89]": \[/.test(l))).toHaveLength(2)
    const datos = JSON.parse(json)
    expect(datos).toMatchObject({ formato: 1, fecha: '2025-01-01', ficticia: true, total: 10, origen: { fichero: XLSX_2025, sha256: sha } })

    const app = decodificarRelacion(datos)
    expect(app.fecha).toBe('2025-01-01')
    expect(app.ficticia).toBe(true)
    expect(app.municipios.map((m) => [m.codigo, m.nombre]).sort()).toEqual(rel.municipios.map((m) => [m.codigo, m.nombre]).sort())
  })

  it('compara dos relaciones: altas, bajas (p. ej. por fusión) y cambios de nombre', async () => {
    const a = extraerRelacion(await leerXlsx(leer(XLSX_2025)), {})
    const b = extraerRelacion(leerCsv(leer(CSV_2026)), {})
    const c = compararRelaciones(a, b)
    expect(c.altas.map((m) => m.codigo)).toEqual(['98011', '99901'])
    expect(c.bajas.map((m) => m.codigo)).toEqual(['99006', '99007'])
    expect(c.renombrados).toEqual([{ codigo: '98002', antes: 'Ávila de Mentira', despues: 'Ávila de Mentirijillas' }])
  })

  it('importar(): de los bytes al fichero de salida con la fecha en el nombre', async () => {
    const r = await importar(leer(CSV_2026), CSV_2026, { ficticia: true })
    expect(r.nombreSalida).toBe('municipios-2026-01-01.json')
    expect(r.relacion.municipios).toHaveLength(10)
    expect(JSON.parse(r.json).origen.fichero).toBe(CSV_2026)
  })
})
