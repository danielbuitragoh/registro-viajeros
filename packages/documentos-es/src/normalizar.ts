/** Mayúsculas y sin espacios (incluidos los duros), tabuladores, puntos, guiones ni guiones bajos. */
export function normalizarDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[\s.\-_]/g, '')
}
