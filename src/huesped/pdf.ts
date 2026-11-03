/**
 * Escritor de PDF mínimo (PDF 1.4), sin librerías ni red: texto con las fuentes estándar Helvetica / Helvetica-Bold
 * (codificación WinAnsi), rectángulos rellenos y líneas. Suficiente para una ficha legible con un QR vectorial.
 * Los caracteres que WinAnsi no tiene (cirílico, griego, CJK…) se sustituyen por «?» y se avisa: para esos casos,
 * la vista de impresión del navegador conserva cualquier alfabeto.
 */

export const A4 = { ancho: 595.28, alto: 841.89 }

/** Bytes 0x80–0x9F de Windows-1252 (el resto de Latin-1, 0xA0–0xFF, coincide con Unicode). */
const CP1252: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e,
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
}

/** Pasa un texto a WinAnsi como «cadena binaria» (un carácter por byte). */
export function aWinAnsi(s: string): { texto: string; sustituidos: boolean } {
  let texto = ''
  let sustituidos = false
  for (const ch of s.normalize('NFC')) {
    const c = ch.codePointAt(0) as number
    if (c === 9 || c === 10 || c === 13) texto += ' '
    else if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff)) texto += ch
    else if (CP1252[ch] !== undefined) texto += String.fromCharCode(CP1252[ch])
    else {
      texto += '?'
      sustituidos = true
    }
  }
  return { texto, sustituidos }
}

const escapar = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`)
const num = (n: number) => (Math.round(n * 100) / 100).toString()

// Anchos de Helvetica (AFM de Adobe, en milésimas de em) para ASCII 32–126.
const ANCHOS =
  '278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584'
    .split(',')
    .map(Number)

/** Ancho aproximado en puntos (las letras acentuadas miden como su letra base; la negrita, un 8 % más). */
export function anchoTexto(s: string, tam: number, negrita = false): number {
  let total = 0
  for (const ch of s.normalize('NFD').replace(/[̀-ͯ]/g, '')) {
    const c = ch.charCodeAt(0)
    total += c >= 32 && c <= 126 ? (ANCHOS[c - 32] as number) : 556
  }
  return (total / 1000) * tam * (negrita ? 1.08 : 1)
}

/** Parte un texto en líneas que caben en `ancho` (por palabras; una palabra demasiado larga se corta). */
export function partirLineas(s: string, ancho: number, tam: number, negrita = false): string[] {
  const lineas: string[] = []
  let actual = ''
  const cabe = (x: string) => anchoTexto(x, tam, negrita) <= ancho
  for (const palabra of s.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (cabe(prueba)) {
      actual = prueba
      continue
    }
    if (actual) lineas.push(actual)
    actual = ''
    let resto = palabra
    while (!cabe(resto)) {
      let i = resto.length - 1
      while (i > 1 && !cabe(resto.slice(0, i))) i--
      lineas.push(resto.slice(0, i))
      resto = resto.slice(i)
    }
    actual = resto
  }
  if (actual) lineas.push(actual)
  return lineas.length ? lineas : ['']
}

export interface OpcionesTexto {
  tam?: number
  negrita?: boolean
  /** gris (0 = negro, 1 = blanco) */
  gris?: number
}

export class DocumentoPdf {
  private paginas: string[][] = [[]]
  /** ¿Algún texto tenía caracteres que no se han podido representar? */
  sustituidos = false

  constructor(private readonly titulo: string) {}

  get numPaginas(): number {
    return this.paginas.length
  }
  get paginaActual(): number {
    return this.paginas.length - 1
  }

  nuevaPagina(): void {
    this.paginas.push([])
  }

  private ops(pagina: number): string[] {
    return this.paginas[pagina] as string[]
  }

  texto(x: number, y: number, s: string, o: OpcionesTexto = {}, pagina = this.paginaActual): void {
    const { texto, sustituidos } = aWinAnsi(s)
    this.sustituidos ||= sustituidos
    const gris = o.gris ?? 0
    this.ops(pagina).push(`BT ${num(gris)} g /${o.negrita ? 'F2' : 'F1'} ${num(o.tam ?? 10)} Tf ${num(x)} ${num(y)} Td (${escapar(texto)}) Tj ET`)
  }

  /** Varios rectángulos rellenos (negros) con un solo relleno: así se dibuja un QR. */
  rectangulos(rs: { x: number; y: number; ancho: number; alto: number }[], pagina = this.paginaActual): void {
    if (!rs.length) return
    this.ops(pagina).push('0 g', ...rs.map((r) => `${num(r.x)} ${num(r.y)} ${num(r.ancho)} ${num(r.alto)} re`), 'f')
  }

  linea(x1: number, y1: number, x2: number, y2: number, gris = 0.6, grosor = 0.5, pagina = this.paginaActual): void {
    this.ops(pagina).push(`${num(gris)} G ${num(grosor)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`)
  }

  /** El PDF completo. Las cadenas son «binarias» (un carácter = un byte), así los offsets de la tabla xref son exactos. */
  bytes(): Uint8Array {
    const n = this.paginas.length
    const idPagina = (i: number) => 5 + i * 2
    const idInfo = 5 + n * 2
    const cuerpos: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${this.paginas.map((_, i) => `${idPagina(i)} 0 R`).join(' ')}] /Count ${n} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ]
    this.paginas.forEach((ops, i) => {
      const contenido = ops.join('\n')
      cuerpos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(A4.ancho)} ${num(A4.alto)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idPagina(i) + 1} 0 R >>`,
        `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
      )
    })
    cuerpos.push(`<< /Title (${escapar(aWinAnsi(this.titulo).texto)}) /Producer (Registro de viajeros) >>`)

    let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
    const offsets: number[] = []
    cuerpos.forEach((c, i) => {
      offsets.push(out.length)
      out += `${i + 1} 0 obj\n${c}\nendobj\n`
    })
    const xref = out.length
    out += `xref\n0 ${cuerpos.length + 1}\n0000000000 65535 f \n`
    out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
    out += `trailer\n<< /Size ${cuerpos.length + 1} /Root 1 0 R /Info ${idInfo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`

    const bytes = new Uint8Array(out.length)
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i)
    return bytes
  }
}
