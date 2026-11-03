import { es, type ClaveTexto } from './idiomas/es'
import { en } from './idiomas/en'
import { fr } from './idiomas/fr'
import { de } from './idiomas/de'
import { it } from './idiomas/it'
import { pt } from './idiomas/pt'

export type { ClaveTexto }

/** Idiomas del formulario del huésped (la recepción está en español). */
export const IDIOMAS = ['es', 'en', 'fr', 'de', 'it', 'pt'] as const
export type Idioma = (typeof IDIOMAS)[number]

export const esIdioma = (x: unknown): x is Idioma => typeof x === 'string' && (IDIOMAS as readonly string[]).includes(x)

/** Textos del formulario del huésped y mensajes de validación. Todos los idiomas tienen exactamente las claves de ES. */
export const TEXTOS: Record<Idioma, Record<ClaveTexto, string>> = { es, en, fr, de, it, pt }

export function t(idioma: Idioma, clave: ClaveTexto, params?: Record<string, string | number>): string {
  const plantilla = TEXTOS[idioma][clave] ?? TEXTOS.es[clave]
  return params ? plantilla.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`)) : plantilla
}

/** Idioma preferido del navegador entre los disponibles (por defecto, inglés para turistas). */
export function idiomaDelNavegador(lista: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []): Idioma {
  for (const l of lista) {
    const base = l.toLowerCase().slice(0, 2)
    if (esIdioma(base)) return base
  }
  return 'en'
}
