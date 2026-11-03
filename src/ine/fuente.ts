import { decodificarRelacion, ordenarRelaciones, type RelacionIne } from './relacion'

/**
 * De dónde salen las relaciones de municipios:
 *  - src/oficial/ine/municipios-*.json → generadas con scripts/importar-ine.ts desde el fichero OFICIAL del INE;
 *  - src/demo/ine/municipios-*.json   → muestra FICTICIA, solo en el build de la demo y solo si no hay oficiales.
 * Cada JSON es un trozo aparte que se carga al usarlo (y que el service worker deja disponible sin conexión).
 */
const OFICIALES = import.meta.glob<unknown>('../oficial/ine/municipios-*.json', { import: 'default' })
const DEMO = import.meta.env.VITE_DEMO === 'true' ? import.meta.glob<unknown>('../demo/ine/municipios-*.json', { import: 'default' }) : {}

export type OrigenRelacion = 'oficial' | 'ficticia' | 'ninguna'

/** Nunca mezcla: si hay alguna relación oficial se usan solo las oficiales. Devuelve la más reciente primero. */
export function elegirFuente<T>(oficiales: Record<string, T>, demo: Record<string, T>, esDemo: boolean): { origen: OrigenRelacion; cargadores: T[] } {
  const ordenados = (r: Record<string, T>) =>
    Object.keys(r)
      .sort()
      .reverse()
      .map((k) => r[k] as T)
  if (Object.keys(oficiales).length > 0) return { origen: 'oficial', cargadores: ordenados(oficiales) }
  if (esDemo && Object.keys(demo).length > 0) return { origen: 'ficticia', cargadores: ordenados(demo) }
  return { origen: 'ninguna', cargadores: [] }
}

let cache: Promise<RelacionIne[]> | undefined

export function cargarRelaciones(): Promise<RelacionIne[]> {
  cache ??= (async () => {
    const { cargadores } = elegirFuente(OFICIALES, DEMO, import.meta.env.VITE_DEMO === 'true')
    const rs = await Promise.all(cargadores.map(async (c) => decodificarRelacion(await c())))
    return ordenarRelaciones(rs)
  })().catch((e: unknown) => {
    console.error('No se pudo cargar la relación de municipios del INE', e)
    cache = undefined
    return []
  })
  return cache
}
