const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE'

/**
 * Letra de control de un número de DNI: el resto de dividirlo entre 23 indexa la tabla `TRWAGMYFPDXBNJZSQVHLCKE`.
 * Acepta el número (`12345678`) o sus cifras como texto (`'12345678'`, con o sin ceros a la izquierda).
 * Lanza `RangeError` si no es un entero entre 0 y 99 999 999: no hay letra posible para otra cosa.
 */
export function letraDni(numero: string | number): string {
  const valido = typeof numero === 'number' ? Number.isInteger(numero) && numero >= 0 && numero <= 99_999_999 : /^\d{1,8}$/.test(numero)
  if (!valido) throw new RangeError(`letraDni: se esperaba un entero de 0 a 99999999 (o hasta 8 cifras en texto) y llegó ${JSON.stringify(numero)}`)
  return LETRAS_DNI.charAt(Number(numero) % 23)
}
