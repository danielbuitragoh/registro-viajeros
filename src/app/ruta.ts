import { useCallback, useEffect, useState } from 'react'

/** Enrutador mínimo por hash (#/ruta): funciona en GitHub Pages y sin servidor, y el fragmento no se envía a ningún sitio. */
export function useRuta(): { ruta: string; ir: (r: string) => void } {
  const leer = () => window.location.hash.replace(/^#/, '') || '/'
  const [ruta, setRuta] = useState(leer)
  useEffect(() => {
    const f = () => setRuta(leer())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  const ir = useCallback((r: string) => {
    window.location.hash = r
  }, [])
  return { ruta, ir }
}
