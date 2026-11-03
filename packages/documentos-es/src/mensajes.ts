import type { CodigoError, Idioma, ResultadoInvalido } from './tipos.js'

type Mensaje = (esperada: string | undefined) => string

const MENSAJES: Record<Idioma, Record<CodigoError, Mensaje>> = {
  es: {
    formato: () => 'El formato no es el de un DNI, NIE o CIF.',
    letra: (e) => `La letra de control no es correcta${e ? `: debería ser ${e}` : ''}.`,
    control: (e) => `El dígito o la letra de control del CIF no es correcto${e ? `: debería ser ${e}` : ''}.`,
    parece_nie: () => 'Es un NIE (empieza por X, Y o Z), no un DNI.',
    parece_dni: () => 'Es un DNI (8 cifras y una letra), no un NIE.',
  },
  en: {
    formato: () => 'The format is not that of a DNI, NIE or CIF.',
    letra: (e) => `The check letter is wrong${e ? `: it should be ${e}` : ''}.`,
    control: (e) => `The CIF check digit or letter is wrong${e ? `: it should be ${e}` : ''}.`,
    parece_nie: () => 'This is a NIE (it starts with X, Y or Z), not a DNI.',
    parece_dni: () => 'This is a DNI (8 digits and a letter), not a NIE.',
  },
}

/**
 * Mensaje legible de un resultado inválido (o de `{ codigo, esperada? }`), en español (por defecto) o inglés.
 * Un idioma desconocido cae en español.
 */
export function mensajeError(error: Pick<ResultadoInvalido, 'codigo' | 'esperada'>, idioma: Idioma = 'es'): string {
  return (MENSAJES[idioma] ?? MENSAJES.es)[error.codigo](error.esperada)
}
