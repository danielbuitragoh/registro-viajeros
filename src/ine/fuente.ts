import { decodificarRelacion, ordenarRelaciones, type RelacionIne } from './relacion'

/**
 * De dónde salen las relaciones de municipios: SOLO de src/oficial/ine/municipios-*.json, generadas con
 * scripts/importar-ine.ts desde el fichero OFICIAL del INE guardado en docs/oficial/ine/.
 * Cada JSON es un trozo aparte que se carga al usarlo (carga diferida: no pesa en la primera pantalla) y que el
 * service worker deja disponible sin conexión.
 */
const OFICIALES = import.meta.glob<unknown>('../oficial/ine/municipios-*.json', { import: 'default' })

export type OrigenRelacion = 'oficial' | 'ninguna'

/** Devuelve las relaciones oficiales, la más reciente primero. Sin ninguna, la app deja el código INE a mano (nunca inventa uno). */
export function elegirFuente<T>(oficiales: Record<string, T>): { origen: OrigenRelacion; cargadores: T[] } {
  const cargadores = Object.keys(oficiales)
    .sort()
    .reverse()
    .map((k) => oficiales[k] as T)
  return { origen: cargadores.length > 0 ? 'oficial' : 'ninguna', cargadores }
}

let cache: Promise<RelacionIne[]> | undefined

export function cargarRelaciones(): Promise<RelacionIne[]> {
  cache ??= (async () => {
    const { cargadores } = elegirFuente(OFICIALES)
    const rs = await Promise.all(cargadores.map(async (c) => decodificarRelacion(await c())))
    return ordenarRelaciones(rs)
  })().catch((e: unknown) => {
    console.error('No se pudo cargar la relación de municipios del INE', e)
    cache = undefined
    return []
  })
  return cache
}
