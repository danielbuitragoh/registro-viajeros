/** Mayúsculas y sin espacios (incluidos los duros), tabuladores, puntos, guiones ni guiones bajos. */
export function normalizarDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[\s.\-_]/g, '')
}

/** Como `normalizarDocumento`, pero tolera lo que no es texto (`null`, números…): da la cadena vacía. Uso interno. */
export function normalizarEntrada(entrada: unknown): string {
  return typeof entrada === 'string' ? normalizarDocumento(entrada) : ''
}
