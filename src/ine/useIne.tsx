import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cargarRelaciones } from './fuente'
import { consultaIne, type ConsultaIne, type RelacionIne } from './relacion'

const Contexto = createContext<() => Promise<RelacionIne[]>>(cargarRelaciones)

/** Permite cambiar de dónde se cargan las relaciones (pruebas). Sin proveedor: cargarRelaciones(). */
export function ProveedorIne({ cargar, children }: { cargar: () => Promise<RelacionIne[]>; children: ReactNode }) {
  return <Contexto.Provider value={cargar}>{children}</Contexto.Provider>
}

export interface EstadoIne {
  /** undefined mientras carga; [] si esta versión no incluye ninguna relación. Más reciente primero. */
  relaciones: RelacionIne[] | undefined
  /** La relación que manda (la más reciente). */
  activa: RelacionIne | undefined
  /** Para los validadores (solo avisos). */
  consulta: ConsultaIne | undefined
}

/** Carga las relaciones solo cuando hacen falta (`activo`): p. ej. si el país es España. */
export function useRelacionesIne(activo = true): EstadoIne {
  const cargar = useContext(Contexto)
  const [relaciones, setRelaciones] = useState<RelacionIne[]>()
  useEffect(() => {
    if (!activo) return
    let vivo = true
    void cargar().then((r) => {
      if (vivo) setRelaciones(r)
    })
    return () => {
      vivo = false
    }
  }, [cargar, activo])
  return useMemo(() => ({ relaciones, activa: relaciones?.[0], consulta: relaciones ? consultaIne(relaciones) : undefined }), [relaciones])
}
