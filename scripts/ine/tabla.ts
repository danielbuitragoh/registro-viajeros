/**
 * Lectura de tablas (xlsx y csv) sin dependencias y solo con APIs web estándar
 * (DecompressionStream, TextDecoder), para que funcione igual en Node y en el navegador.
 */

export class ErrorImportacion extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorImportacion'
  }
}

// ---------------------------------------------------------------- zip (xlsx) ----

const u16 = (b: Uint8Array, o: number) => (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8)
const u32 = (b: Uint8Array, o: number) => (u16(b, o) | (u16(b, o + 2) << 16)) >>> 0

async function inflarRaw(datos: Uint8Array): Promise<Uint8Array> {
  const entrada = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(datos)
      c.close()
    },
  })
  const lector = entrada.pipeThrough(new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>).getReader()
  const trozos: Uint8Array[] = []
  for (let r = await lector.read(); !r.done; r = await lector.read()) trozos.push(r.value)
  const out = new Uint8Array(trozos.reduce((n, t) => n + t.length, 0))
  let o = 0
  for (const t of trozos) {
    out.set(t, o)
    o += t.length
  }
  return out
}

/** Lee las entradas de un zip (solo métodos 0 y 8, sin zip64: suficiente para un xlsx). */
async function leerZip(b: Uint8Array): Promise<Map<string, () => Promise<Uint8Array>>> {
  let fin = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (u32(b, i) === 0x06054b50) {
      fin = i
      break
    }
  }
  if (fin < 0) throw new ErrorImportacion('El fichero no es un xlsx válido (no es un archivo zip).')
  const total = u16(b, fin + 10)
  let p = u32(b, fin + 16)
  const nombres = new TextDecoder()
  const entradas = new Map<string, () => Promise<Uint8Array>>()
  for (let n = 0; n < total; n++) {
    if (u32(b, p) !== 0x02014b50) throw new ErrorImportacion('El xlsx está dañado (directorio central del zip).')
    const metodo = u16(b, p + 10)
    const tam = u32(b, p + 20)
    const lnom = u16(b, p + 28)
    const lext = u16(b, p + 30)
    const lcom = u16(b, p + 32)
    const local = u32(b, p + 42)
    const nombre = nombres.decode(b.subarray(p + 46, p + 46 + lnom))
    p += 46 + lnom + lext + lcom
    entradas.set(nombre, async () => {
      if (u32(b, local) !== 0x04034b50) throw new ErrorImportacion(`El xlsx está dañado (${nombre}).`)
      const ini = local + 30 + u16(b, local + 26) + u16(b, local + 28)
      const datos = b.subarray(ini, ini + tam)
      if (metodo === 0) return datos
      if (metodo === 8) return inflarRaw(datos)
      throw new ErrorImportacion(`El xlsx usa una compresión no admitida (${metodo}).`)
    })
  }
  return entradas
}

// ---------------------------------------------------------------- xml mínimo ----

const ENTIDADES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
const desescapar = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTIDADES[e.toLowerCase()] ?? ''),
  )
const atributo = (attrs: string, nombre: string) => new RegExp(`(?:^|\\s)${nombre}="([^"]*)"`).exec(attrs)?.[1]
/** Texto de un <si> o <is>: concatena los <t> (runs con formato), sin la guía fonética <rPh>. */
const textoRico = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g)].map((m) => desescapar(m[1] ?? '')).join('')

const columna = (ref: string) => {
  let n = 0
  for (const c of ref.replace(/\d+$/, '').toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

/** Primera hoja de un xlsx como matriz de textos. `filas[i]` es la fila i+1 de la hoja. */
export async function leerXlsx(bytes: Uint8Array): Promise<string[][]> {
  const zip = await leerZip(bytes)
  const texto = async (ruta: string) => {
    const e = zip.get(ruta)
    return e ? new TextDecoder().decode(await e()) : undefined
  }
  const libro = await texto('xl/workbook.xml')
  if (!libro) throw new ErrorImportacion('El fichero no es un xlsx de Excel (falta xl/workbook.xml).')

  // Primera hoja según el libro y sus relaciones
  let ruta = 'xl/worksheets/sheet1.xml'
  const rid = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(libro)?.[1]
  const rels = await texto('xl/_rels/workbook.xml.rels')
  if (rid && rels) {
    const rel = [...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => m[1] ?? '').find((a) => atributo(a, 'Id') === rid)
    const destino = rel && atributo(rel, 'Target')
    if (destino) ruta = destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`
  }
  const hoja = await texto(ruta)
  if (!hoja) throw new ErrorImportacion(`El xlsx no tiene la hoja ${ruta}.`)

  const compartidos = [...((await texto('xl/sharedStrings.xml')) ?? '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)].map((m) => textoRico(m[1] ?? ''))

  const filas: string[][] = []
  for (const mf of hoja.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(atributo(mf[1] ?? '', 'r') ?? filas.length + 1)
    const fila: string[] = []
    for (const mc of (mf[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = mc[1] ?? ''
      const cuerpo = mc[2] ?? ''
      const ref = atributo(attrs, 'r')
      const col = ref ? columna(ref) : fila.length
      const tipo = atributo(attrs, 't')
      const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1]
      let valor = ''
      if (tipo === 's') valor = compartidos[Number(v)] ?? ''
      else if (tipo === 'inlineStr') valor = textoRico(/<is\b[^>]*>([\s\S]*?)<\/is>/.exec(cuerpo)?.[1] ?? '')
      else if (v !== undefined) {
        valor = desescapar(v)
        // Números enteros guardados como 98 o 98.0 → «98»
        if ((tipo === undefined || tipo === 'n') && /^-?\d+\.0+$/.test(valor)) valor = valor.replace(/\.0+$/, '')
      }
      while (fila.length < col) fila.push('')
      fila[col] = valor
    }
    while (filas.length < r - 1) filas.push([])
    filas[r - 1] = fila
  }
  return filas
}

// ---------------------------------------------------------------- csv ----

/** Decodifica UTF-8 (con o sin BOM) y, si no es UTF-8 válido, Windows-1252 (lo habitual al guardar desde Excel). */
function decodificar(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3))
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

function partirCsv(texto: string, sep: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i] as string
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        celda += '"'
        i++
      } else if (c === '"') comillas = false
      else celda += c
    } else if (c === '"' && celda === '') comillas = true
    else if (c === sep) {
      fila.push(celda)
      celda = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ''
    } else celda += c
  }
  if (celda !== '' || fila.length > 0) {
    fila.push(celda)
    filas.push(fila)
  }
  return filas.map((f) => (f.length === 1 && f[0] === '' ? [] : f))
}

export function leerCsv(bytes: Uint8Array): string[][] {
  const texto = decodificar(bytes)
  const lineas = texto.split(/\r?\n/).slice(0, 30)
  // El separador se deduce de la línea de cabecera (la del título puede llevar comas)
  const cabecera = lineas.find((l) => /nombre/i.test(l) && /cmun/i.test(l)) ?? lineas.join('\n')
  const cuenta = (s: string) => cabecera.split(s).length - 1
  const sep = [';', ',', '\t'].sort((a, b) => cuenta(b) - cuenta(a))[0] as string
  return partirCsv(texto, sep)
}

export async function leerTabla(bytes: Uint8Array, nombreFichero: string): Promise<string[][]> {
  const ext = /\.([a-z0-9]+)$/i.exec(nombreFichero)?.[1]?.toLowerCase()
  if (ext === 'xlsx') return leerXlsx(bytes)
  if (ext === 'csv' || ext === 'txt') return leerCsv(bytes)
  if (ext === 'xls') throw new ErrorImportacion('El formato .xls antiguo no se admite: ábrelo con Excel o LibreOffice y guárdalo como xlsx o csv, sin cambiar nada más.')
  throw new ErrorImportacion(`Formato no admitido (${nombreFichero}): usa el fichero del INE en xlsx o csv.`)
}
