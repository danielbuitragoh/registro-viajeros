/** Maquetación de la ficha del huésped en PDF (A4): cabecera, una sección por viajero, QR del código cifrado y pie. */
import QRCode from 'qrcode'
import type { ContenidoFicha, FilaFicha } from './fichaImprimible'
import { A4, DocumentoPdf, partirLineas } from './pdf'

const MARGEN = 50
const ANCHO_UTIL = A4.ancho - MARGEN * 2
const COL_ETIQUETA = 190
const X_VALOR = MARGEN + COL_ETIQUETA + 10
const ANCHO_VALOR = A4.ancho - MARGEN - X_VALOR
const ABAJO = 60 // por encima del pie
const INTERLINEA = 13

export function pdfFicha(c: ContenidoFicha, codigo: string): { bytes: Uint8Array; sustituidos: boolean } {
  const d = new DocumentoPdf(c.titulo)
  let y = A4.alto - MARGEN

  const asegurar = (alto: number) => {
    if (y - alto < ABAJO) {
      d.nuevaPagina()
      y = A4.alto - MARGEN
    }
  }
  const parrafo = (texto: string, tam: number, negrita = false, gris = 0) => {
    for (const l of partirLineas(texto, ANCHO_UTIL, tam, negrita)) {
      asegurar(tam + 4)
      d.texto(MARGEN, y - tam, l, { tam, negrita, gris })
      y -= tam + 4
    }
  }
  const filas = (fs: FilaFicha[]) => {
    for (const f of fs) {
      const et = partirLineas(f.etiqueta, COL_ETIQUETA, 9, true)
      const va = partirLineas(f.valor, ANCHO_VALOR, 10)
      const alto = Math.max(et.length, va.length) * INTERLINEA + 4
      asegurar(alto)
      et.forEach((l, i) => d.texto(MARGEN, y - 10 - i * INTERLINEA, l, { tam: 9, negrita: true, gris: 0.25 }))
      va.forEach((l, i) => d.texto(X_VALOR, y - 10 - i * INTERLINEA, l, { tam: 10 }))
      y -= alto
      d.linea(MARGEN, y + 1, A4.ancho - MARGEN, y + 1, 0.85, 0.4)
    }
  }
  const seccion = (titulo: string) => {
    asegurar(40)
    y -= 12
    parrafo(titulo, 12, true)
    d.linea(MARGEN, y, A4.ancho - MARGEN, y, 0.2, 1)
    y -= 2
  }

  parrafo(c.titulo, 15, true)
  y -= 4
  filas(c.cabecera)
  c.viajeros.forEach((v) => {
    seccion(v.titulo)
    filas(v.filas)
  })

  // QR del código cifrado (el mismo que muestra la pantalla): módulos de al menos ~0,7 mm para que se pueda escanear del papel
  const { modules } = QRCode.create(codigo, { errorCorrectionLevel: 'L' })
  const lado = Math.min(260, Math.max(170, modules.size * 2.2))
  if (y - (lado + 70) < ABAJO) {
    d.nuevaPagina()
    y = A4.alto - MARGEN
  }
  seccion(c.tituloQr)
  parrafo(c.ayudaQr, 9, false, 0.25)
  y -= 8
  const modulo = lado / modules.size
  const rects: { x: number; y: number; ancho: number; alto: number }[] = []
  for (let fila = 0; fila < modules.size; fila++) {
    let inicio = -1
    for (let col = 0; col <= modules.size; col++) {
      const negro = col < modules.size && modules.get(fila, col)
      if (negro && inicio < 0) inicio = col
      if (!negro && inicio >= 0) {
        rects.push({ x: MARGEN + inicio * modulo, y: y - (fila + 1) * modulo, ancho: (col - inicio) * modulo, alto: modulo })
        inicio = -1
      }
    }
  }
  d.rectangulos(rects)

  // pie en todas las páginas
  const total = d.numPaginas
  for (let p = 0; p < total; p++) {
    const pagina = c.pagina.replace(/\{n\}/g, String(p + 1)).replace(/\{total\}/g, String(total))
    d.linea(MARGEN, 45, A4.ancho - MARGEN, 45, 0.7, 0.5, p)
    partirLineas(c.pie, ANCHO_UTIL - 110, 8).forEach((l, i) => d.texto(MARGEN, 34 - i * 10, l, { tam: 8, gris: 0.35 }, p))
    d.texto(A4.ancho - MARGEN - 100, 34, pagina, { tam: 8, gris: 0.35 }, p)
  }
  return { bytes: d.bytes(), sustituidos: d.sustituidos }
}
