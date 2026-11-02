import type { Incidencia } from '../domain/tipos'
import type { Idioma } from '../huesped/enlace'
import { t, TEXTOS, type ClaveTexto } from './textos'

export function etiquetaCampo(campo: string, idioma: Idioma): string {
  const clave = `c.${campo}` as ClaveTexto
  return clave in TEXTOS.es ? t(idioma, clave) : campo
}

/** Texto de un error para el usuario. Para códigos desconocidos devuelve el propio código (nunca rompe). */
export function mensajeIncidencia(i: Pick<Incidencia, 'codigo' | 'params'>, idioma: Idioma): string {
  const clave = `e.${i.codigo}` as ClaveTexto
  return clave in TEXTOS.es ? t(idioma, clave, i.params) : i.codigo
}
