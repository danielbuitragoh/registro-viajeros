import { useState } from 'react'
import { t, type Idioma } from '../i18n/textos'

export interface AvisoActualizacionProps {
  hayNuevaVersion: boolean
  idioma: Idioma
  /** En recepción, recargar bloquea la app (la clave solo vive en memoria): se avisa de que pedirá la contraseña. */
  recepcion: boolean
  actualizar: () => void
}

/**
 * Aviso de nueva versión. La región de estado está siempre montada (vacía) para que el anuncio llegue a los lectores
 * de pantalla; el aviso visible va arriba, en el flujo de la página, sin tapar nada (WCAG 2.4.11).
 */
export function AvisoActualizacion({ hayNuevaVersion, idioma, recepcion, actualizar }: AvisoActualizacionProps) {
  const [cerrado, setCerrado] = useState(false)
  const visible = hayNuevaVersion && !cerrado
  return (
    <>
      <p role="status" className="solo-lectores" lang={idioma}>
        {visible ? t(idioma, 'pwa.nueva_version') : ''}
      </p>
      {visible && (
        <section className="aviso-version" aria-label={t(idioma, 'pwa.titulo')} lang={idioma}>
          <p>
            <strong>{t(idioma, 'pwa.nueva_version')}</strong> {t(idioma, 'pwa.recargar')}
            {recepcion && ' Después tendrás que volver a escribir la contraseña del establecimiento.'}
          </p>
          <div className="acciones">
            <button type="button" className="primario" onClick={actualizar}>
              {t(idioma, 'pwa.actualizar')}
            </button>
            <button type="button" className="secundario" onClick={() => setCerrado(true)}>
              {t(idioma, 'pwa.mas_tarde')}
            </button>
          </div>
        </section>
      )}
    </>
  )
}
