/** Utilidades mínimas para generar XML bien formado (sin dependencias). */

export interface Nodo {
  tag: string
  /** Texto (hoja) o hijos (bloque). */
  contenido: string | Nodo[]
}

// Caracteres permitidos en XML 1.0: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
// eslint-disable-next-line no-control-regex
const NO_PERMITIDOS = /[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu

export function limpiarTexto(s: string): string {
  return s.replace(NO_PERMITIDOS, '').trim()
}

export function escaparXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Hoja con texto; devuelve null si el valor está vacío (no se emiten elementos vacíos). */
export function hoja(tag: string, valor: string | number | undefined | null): Nodo | null {
  if (valor === undefined || valor === null) return null
  const t = limpiarTexto(String(valor))
  return t === '' ? null : { tag, contenido: t }
}

export function bloque(tag: string, hijos: (Nodo | null)[]): Nodo {
  return { tag, contenido: hijos.filter((h): h is Nodo => h !== null) }
}

export function renderizar(n: Nodo, nivel = 0): string {
  const sangria = '  '.repeat(nivel)
  if (typeof n.contenido === 'string') return `${sangria}<${n.tag}>${escaparXml(n.contenido)}</${n.tag}>`
  const hijos = n.contenido.map((h) => renderizar(h, nivel + 1)).join('\n')
  return `${sangria}<${n.tag}>\n${hijos}\n${sangria}</${n.tag}>`
}

export const CABECERA_XML = '<?xml version="1.0" encoding="UTF-8"?>'
