import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { esIdioma, type Idioma } from '../i18n/textos'
import { AvisoActualizacion } from './AvisoActualizacion'

/** Cada cuánto se comprueba si hay versión nueva (la tablet de recepción puede pasar días sin recargar). */
const CADA_HORA = 60 * 60 * 1000

/** Idioma de la pantalla: el del formulario del huésped (que fija <html lang>) o español en recepción. */
function idiomaPantalla(): Idioma {
  const l = document.documentElement.lang.slice(0, 2)
  return esIdioma(l) ? l : 'es'
}

/** Registra el service worker y muestra el aviso cuando hay una versión nueva esperando. */
export function Actualizaciones() {
  const {
    needRefresh: [hayNuevaVersion],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return
      // Solo pide el sw.js al propio origen; sin conexión, simplemente falla y se reintenta a la hora siguiente
      setInterval(() => {
        if (navigator.onLine) registro.update().catch(() => undefined)
      }, CADA_HORA)
    },
  })
  const [idioma, setIdioma] = useState<Idioma>(idiomaPantalla)
  useEffect(() => {
    if (hayNuevaVersion) setIdioma(idiomaPantalla())
  }, [hayNuevaVersion])
  const recepcion = !window.location.hash.startsWith('#/huesped/')
  function actualizar() {
    // workbox-window no recarga si la versión nueva se detectó con registration.update() (la comprobación periódica):
    // la trata como «externa» y no emite «controlling». Se recarga aquí, una sola vez, cuando la nueva toma el control.
    let recargando = false
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (recargando) return
      recargando = true
      window.location.reload()
    })
    void updateServiceWorker(true)
  }
  return <AvisoActualizacion hayNuevaVersion={hayNuevaVersion} idioma={idioma} recepcion={recepcion} actualizar={actualizar} />
}
