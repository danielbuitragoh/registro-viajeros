/**
 * Relación de municipios del INE en la app: búsqueda por nombre y estado de un código según la fecha de la relación.
 * Los datos los genera scripts/importar-ine.ts a partir del fichero oficial (ver README). Aquí no hay ningún código.
 */

export interface MunicipioIne {
  /** 5 dígitos: CPRO (2) + CMUN (3). */
  codigo: string
  /** Nombre tal cual figura en la relación del INE (p. ej. «Rozas de Madrid, Las»). */
  nombre: string
  /** CPRO, 2 dígitos. */
  provincia: string
}

export interface RelacionIne {
  /** AAAA-MM-DD */
  fecha: string
  /** Muestra ficticia (solo demo y pruebas). */
  ficticia: boolean
  municipios: MunicipioIne[]
  porCodigo: Map<string, MunicipioIne>
  /** Nombres normalizados de cada municipio (todas sus variantes), para buscar. */
  indice: { m: MunicipioIne; variantes: string[] }[]
}

export type EstadoCodigo =
  | { tipo: 'vigente'; municipio: MunicipioIne; fecha: string }
  | { tipo: 'baja'; municipio: MunicipioIne; fechaAnterior: string; fecha: string }
  | { tipo: 'no_figura'; fecha: string }

/** Consulta síncrona que reciben los validadores (puros) cuando la relación ya está cargada. */
export type ConsultaIne = (codigo: string) => EstadoCodigo | undefined

const fechaValida = (s: unknown): s is string => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function decodificarRelacion(datos: unknown): RelacionIne {
  if (!datos || typeof datos !== 'object') throw new Error('Relación INE: no es un objeto')
  const d = datos as { formato?: unknown; fecha?: unknown; ficticia?: unknown; provincias?: unknown }
  if (d.formato !== 1) throw new Error('Relación INE: formato desconocido')
  if (!fechaValida(d.fecha)) throw new Error('Relación INE: fecha no válida')
  if (!d.provincias || typeof d.provincias !== 'object') throw new Error('Relación INE: faltan las provincias')
  const municipios: MunicipioIne[] = []
  for (const [provincia, lista] of Object.entries(d.provincias as Record<string, unknown>)) {
    if (!/^\d{2}$/.test(provincia) || !Array.isArray(lista)) throw new Error(`Relación INE: provincia no válida (${provincia})`)
    for (const x of lista) {
      if (typeof x !== 'string' || !/^\d{3}\S/.test(x)) throw new Error(`Relación INE: municipio no válido (${String(x)})`)
      municipios.push({ codigo: provincia + x.slice(0, 3), nombre: x.slice(3), provincia })
    }
  }
  return {
    fecha: d.fecha,
    ficticia: d.ficticia === true,
    municipios,
    porCodigo: new Map(municipios.map((m) => [m.codigo, m])),
    indice: municipios.map((m) => ({ m, variantes: [...new Set(variantesNombre(m.nombre).map(normalizar))] })),
  }
}

/** Sin tildes ni mayúsculas ni signos: «Peña-Simulada» → «pena simulada». */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** «X, Las» → «Las X»; «L'…» sin espacio. Partículas cortas pospuestas, como las escribe el INE. */
function conArticuloDelante(nombre: string): string | undefined {
  const m = /^(.+),\s*([^\s,]{1,4})$/.exec(nombre)
  if (!m) return undefined
  const [, resto, art] = m as unknown as [string, string, string]
  return art.endsWith("'") || art.endsWith('’') ? `${art}${resto}` : `${art} ${resto}`
}

/** Formas en que alguien puede escribir un municipio: el nombre oficial, con el artículo delante y cada parte de un nombre bilingüe. */
export function variantesNombre(nombre: string): string[] {
  const out: string[] = []
  const anadir = (n: string) => {
    for (const x of [n, conArticuloDelante(n)]) if (x && !out.includes(x)) out.push(x)
  }
  anadir(nombre)
  if (nombre.includes('/')) for (const parte of nombre.split('/')) anadir(parte.trim())
  return out
}

/** ¿El nombre escrito es el de este municipio? Admite las variantes y el nombre sin el artículo pospuesto («Rozas de X»). */
export function nombreCoincide(m: MunicipioIne, nombre: string): boolean {
  const q = normalizar(nombre)
  return variantesNombre(m.nombre).some((v) => normalizar(v) === q || normalizar(v.replace(/,\s*[^\s,]{1,4}$/, '')) === q)
}

export function ordenarRelaciones(rs: RelacionIne[]): RelacionIne[] {
  return [...rs].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * Busca municipios por nombre (o por código si se escriben cifras).
 * Orden: coincidencia exacta, «empieza por», una palabra que empieza por, «contiene»; dentro de cada grupo,
 * primero los de `provincia` (la que sugiere el código postal), luego alfabético.
 */
export function buscarMunicipios(rel: RelacionIne, texto: string, opciones: { provincia?: string; max?: number } = {}): MunicipioIne[] {
  const max = opciones.max ?? 8
  const q = normalizar(texto)
  if (q.length < 2) return []
  if (/^\d+$/.test(q.replace(/ /g, ''))) {
    const cifras = q.replace(/ /g, '')
    return rel.municipios.filter((m) => m.codigo.startsWith(cifras)).sort((a, b) => a.codigo.localeCompare(b.codigo)).slice(0, max)
  }
  const puntos: { m: MunicipioIne; p: number }[] = []
  for (const { m, variantes } of rel.indice) {
    let p = 9
    for (const v of variantes) {
      if (v === q) p = Math.min(p, 0)
      else if (v.startsWith(q)) p = Math.min(p, 1)
      else if (` ${v}`.includes(` ${q}`)) p = Math.min(p, 2)
      else if (v.includes(q)) p = Math.min(p, 3)
    }
    if (p < 9) puntos.push({ m, p })
  }
  const pref = (m: MunicipioIne) => (opciones.provincia && m.provincia === opciones.provincia ? 0 : 1)
  return puntos
    .sort((a, b) => a.p - b.p || pref(a.m) - pref(b.m) || a.m.nombre.localeCompare(b.m.nombre, 'es') || a.m.codigo.localeCompare(b.m.codigo))
    .slice(0, max)
    .map((x) => x.m)
}

/**
 * Estado de un código según las relaciones disponibles (la más reciente manda).
 * Una «baja» es un código que figuraba en una relación anterior y ya no (p. ej. por fusión): el INE no dice el motivo.
 */
export function estadoCodigo(relaciones: RelacionIne[], codigo: string): EstadoCodigo | undefined {
  if (relaciones.length === 0 || !/^\d{5}$/.test(codigo)) return undefined
  const [activa, ...anteriores] = ordenarRelaciones(relaciones) as [RelacionIne, ...RelacionIne[]]
  const m = activa.porCodigo.get(codigo)
  if (m) return { tipo: 'vigente', municipio: m, fecha: activa.fecha }
  for (const r of anteriores) {
    const viejo = r.porCodigo.get(codigo)
    if (viejo) return { tipo: 'baja', municipio: viejo, fechaAnterior: r.fecha, fecha: activa.fecha }
  }
  return { tipo: 'no_figura', fecha: activa.fecha }
}

export function consultaIne(relaciones: RelacionIne[]): ConsultaIne | undefined {
  if (relaciones.length === 0) return undefined
  const rs = ordenarRelaciones(relaciones)
  return (codigo) => estadoCodigo(rs, codigo)
}

/** AAAA-MM-DD → DD/MM/AAAA */
export const fechaLegible = (iso: string) => iso.split('-').reverse().join('/')
