/**
 * Importador de la «Relación de municipios y sus códigos por provincias» del INE (xlsx o csv) a un JSON compacto
 * y versionado con la fecha de la relación. Sin dependencias y solo con APIs web estándar.
 *
 * Reglas (ver README → «Códigos de municipio INE»):
 *  - Los datos salen SOLO del fichero oficial. Si algo no cuadra (faltan columnas, filas raras, fecha dudosa),
 *    el importador se detiene y lo explica: nunca adivina.
 *  - Código de municipio = CPRO (2 cifras) + CMUN (3 cifras) = los «5 dígitos INE» del documento oficial (§7.1).
 *    El dígito de control (DC) del INE no forma parte de esos 5 dígitos y no se guarda.
 *    PENDIENTE-OFICIAL (P15): confirmar con el portal que espera CPRO+CMUN sin DC (el PDF solo dice «5 dígitos»).
 */
import { ErrorImportacion, leerCsv, leerTabla, leerXlsx } from './tabla.ts'

export { ErrorImportacion, leerCsv, leerTabla, leerXlsx }

export interface MunicipioImportado {
  codigo: string
  nombre: string
}

export interface RelacionImportada {
  /** AAAA-MM-DD: fecha a la que se refiere la relación (p. ej. 1 de enero). */
  fecha: string
  municipios: MunicipioImportado[]
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fechaISO(a: number, m: number, d: number): string | undefined {
  const f = new Date(Date.UTC(a, m - 1, d))
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return undefined
  return `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Fecha de la relación escrita en el título («… a 01-01-2025», «… a 1 de enero de 2025», «01/01/2025»). */
export function fechaDelTitulo(texto: string): string | undefined {
  const num = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(texto)
  if (num) return fechaISO(Number(num[3]), Number(num[2]), Number(num[1]))
  const txt = new RegExp(`(\\d{1,2})\\s+de\\s+(${MESES.join('|')})\\s+(?:de\\s+)?(\\d{4})`, 'i').exec(texto)
  if (txt) return fechaISO(Number(txt[3]), MESES.indexOf((txt[2] as string).toLowerCase()) + 1, Number(txt[1]))
  return undefined
}

const COLUMNAS = ['CPRO', 'CMUN', 'NOMBRE'] as const

export function extraerRelacion(filas: string[][], opciones: { fecha?: string }): RelacionImportada {
  const limpia = (c: string | undefined) => (c ?? '').trim().toUpperCase()
  const iCab = filas.slice(0, 30).findIndex((f) => COLUMNAS.every((c) => f.some((x) => limpia(x) === c)))
  if (iCab < 0) {
    const vistas = [...new Set(filas.slice(0, 30).flat().map(limpia).filter((x) => x && x.length <= 20))].join(', ')
    throw new ErrorImportacion(
      `No encuentro la fila de cabecera con las columnas ${COLUMNAS.join(', ')} (las del fichero del INE). Columnas vistas: ${vistas || '(ninguna)'}. ` +
        'Si el INE ha cambiado el formato, no se importa nada: revisa el fichero.',
    )
  }
  const cab = (filas[iCab] as string[]).map(limpia)
  const col = { cpro: cab.indexOf('CPRO'), cmun: cab.indexOf('CMUN'), nombre: cab.indexOf('NOMBRE') }

  // --- fecha de la relación ---
  const delTitulo = filas
    .slice(0, iCab)
    .flat()
    .map((c) => fechaDelTitulo(c))
    .find(Boolean)
  let fecha = delTitulo
  if (opciones.fecha !== undefined) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opciones.fecha)
    const indicada = m ? fechaISO(Number(m[1]), Number(m[2]), Number(m[3])) : undefined
    if (!indicada) throw new ErrorImportacion(`La fecha indicada (${opciones.fecha}) no es válida: usa --fecha AAAA-MM-DD.`)
    if (delTitulo && delTitulo !== indicada) throw new ErrorImportacion(`La fecha indicada (${indicada}) no coincide con la del título del fichero (${delTitulo}).`)
    fecha = indicada
  }
  if (!fecha) throw new ErrorImportacion('No encuentro la fecha de la relación en el título del fichero: indícala con --fecha AAAA-MM-DD (la que figure en la página del INE).')

  // --- filas ---
  const municipios: MunicipioImportado[] = []
  const filaDe = new Map<string, number>()
  for (let i = iCab + 1; i < filas.length; i++) {
    const f = filas[i] as string[]
    if (!f.some((c) => (c ?? '').trim() !== '')) continue
    const n = i + 1
    const cpro = (f[col.cpro] ?? '').trim()
    const cmun = (f[col.cmun] ?? '').trim()
    const nombre = (f[col.nombre] ?? '').trim()
    if (!/^\d{1,2}$/.test(cpro)) throw new ErrorImportacion(`fila ${n}: CPRO «${cpro}» no es un código de provincia de 1 o 2 cifras.`)
    if (!/^\d{1,3}$/.test(cmun)) throw new ErrorImportacion(`fila ${n}: CMUN «${cmun}» no es un código de municipio de 1 a 3 cifras.`)
    if (!nombre) throw new ErrorImportacion(`fila ${n}: falta el NOMBRE del municipio.`)
    const codigo = cpro.padStart(2, '0') + cmun.padStart(3, '0')
    const previa = filaDe.get(codigo)
    if (previa) throw new ErrorImportacion(`fila ${n}: el código ${codigo} está repetido (ya estaba en la fila ${previa}).`)
    filaDe.set(codigo, n)
    municipios.push({ codigo, nombre })
  }
  if (municipios.length === 0) throw new ErrorImportacion('El fichero no contiene ningún municipio debajo de la cabecera.')
  municipios.sort((a, b) => a.codigo.localeCompare(b.codigo))
  return { fecha, municipios }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))
  return [...h].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export interface Origen {
  fichero: string
  sha256: string
  ficticia: boolean
}

/**
 * JSON compacto y determinista (sin marcas de tiempo): una provincia por línea, municipios como «CMUN + nombre».
 * Formato 1: { formato, descripcion, fecha, ficticia, origen: {fichero, sha256}, total, provincias: { CPRO: ["CMUNNombre", …] } }
 */
export function serializarRelacion(rel: RelacionImportada, origen: Origen): string {
  const provincias = new Map<string, string[]>()
  for (const m of [...rel.municipios].sort((a, b) => a.codigo.localeCompare(b.codigo))) {
    const p = m.codigo.slice(0, 2)
    provincias.set(p, [...(provincias.get(p) ?? []), m.codigo.slice(2) + m.nombre])
  }
  const j = JSON.stringify
  const descripcion = origen.ficticia
    ? 'MUESTRA FICTICIA para pruebas y demo: NO son códigos del INE.'
    : 'Relación de municipios y sus códigos por provincias (INE). Generado con scripts/importar-ine.ts: no editar a mano.'
  return [
    '{',
    `  "formato": 1,`,
    `  "descripcion": ${j(descripcion)},`,
    `  "fecha": ${j(rel.fecha)},`,
    `  "ficticia": ${j(origen.ficticia)},`,
    `  "origen": { "fichero": ${j(origen.fichero)}, "sha256": ${j(origen.sha256)} },`,
    `  "total": ${rel.municipios.length},`,
    `  "provincias": {`,
    [...provincias].map(([p, ms]) => `    ${j(p)}: ${j(ms)}`).join(',\n'),
    '  }',
    '}',
    '',
  ].join('\n')
}

export interface Comparacion {
  altas: MunicipioImportado[]
  bajas: MunicipioImportado[]
  renombrados: { codigo: string; antes: string; despues: string }[]
}

/** Cambios entre dos relaciones (la nueva, posterior). Una baja suele ser una fusión: el INE no dice el motivo. */
export function compararRelaciones(antigua: RelacionImportada, nueva: RelacionImportada): Comparacion {
  const a = new Map(antigua.municipios.map((m) => [m.codigo, m.nombre]))
  const b = new Map(nueva.municipios.map((m) => [m.codigo, m.nombre]))
  const orden = (x: MunicipioImportado, y: MunicipioImportado) => x.codigo.localeCompare(y.codigo)
  return {
    altas: nueva.municipios.filter((m) => !a.has(m.codigo)).sort(orden),
    bajas: antigua.municipios.filter((m) => !b.has(m.codigo)).sort(orden),
    renombrados: nueva.municipios
      .filter((m) => a.has(m.codigo) && a.get(m.codigo) !== m.nombre)
      .sort(orden)
      .map((m) => ({ codigo: m.codigo, antes: a.get(m.codigo) as string, despues: m.nombre })),
  }
}

export async function importar(bytes: Uint8Array, nombreFichero: string, opciones: { fecha?: string; ficticia?: boolean }) {
  const relacion = extraerRelacion(await leerTabla(bytes, nombreFichero), { fecha: opciones.fecha })
  const sha256 = await sha256Hex(bytes)
  const fichero = nombreFichero.split(/[\\/]/).pop() as string
  const json = serializarRelacion(relacion, { fichero, sha256, ficticia: !!opciones.ficticia })
  return { relacion, json, sha256, nombreSalida: `municipios-${relacion.fecha}.json` }
}
