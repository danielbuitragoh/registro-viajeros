import { useEffect, useMemo, useState } from 'react'
import { buscarMunicipios, normalizar, type MunicipioIne, type RelacionIne } from '../ine/relacion'
import { t, type Idioma } from '../i18n/textos'
import { describedBy, Mensajes } from './campos'

export interface CampoMunicipioProps {
  id: string
  etiqueta: string
  idioma: Idioma
  /** Nombre escrito (se guarda en nombreMunicipio). */
  valor: string
  onCambio: (nombre: string) => void
  /** Al elegir un municipio de la lista: rellena nombre y código. */
  onElegir: (m: MunicipioIne) => void
  relacion: RelacionIne
  /** CPRO sugerido (p. ej. por el código postal): esos municipios salen primero. Solo ordena, no valida. */
  provincia?: string
  ayuda?: string
  error?: string
  aviso?: string
  marca?: string
  autoComplete?: string
  onBlur?: () => void
  etiquetaError?: string
  etiquetaAviso?: string
}

/**
 * Autocompletado municipio → código INE con el patrón «combobox con lista» de ARIA (APG):
 * el foco se queda en el campo, las flechas recorren la lista (aria-activedescendant), Intro elige, Escape cierra,
 * y una región de estado anuncia cuántos resultados hay. Funciona sin red: la relación ya está en el dispositivo.
 */
export function CampoMunicipio(p: CampoMunicipioProps) {
  const tr = (k: Parameters<typeof t>[1], params?: Record<string, string | number>) => t(p.idioma, k, params)
  const [abierta, setAbierta] = useState(false)
  const [activo, setActivo] = useState(-1)
  const resultados = useMemo(() => buscarMunicipios(p.relacion, p.valor, { provincia: p.provincia }), [p.relacion, p.valor, p.provincia])
  const n = resultados.length
  const visible = abierta && n > 0
  const idLista = `${p.id}-lista`
  const idOpcion = (i: number) => `${p.id}-op-${i}`

  useEffect(() => {
    if (visible && activo >= 0) document.getElementById(idOpcion(activo))?.scrollIntoView?.({ block: 'nearest' })
  })

  const buscando = abierta && normalizar(p.valor).length >= 2
  const estado = !buscando ? '' : n === 0 ? tr('f.municipio_sin_resultados') : n === 1 ? tr('f.municipio_un_resultado') : tr('f.municipio_resultados', { n })

  function elegir(m: MunicipioIne) {
    p.onElegir(m)
    setAbierta(false)
    setActivo(-1)
  }

  function teclas(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (n === 0) return
      e.preventDefault()
      setAbierta(true)
      if (e.key === 'ArrowDown') setActivo((a) => (a < 0 || !visible ? 0 : (a + 1) % n))
      else setActivo((a) => (a <= 0 || !visible ? n - 1 : a - 1))
    } else if (e.key === 'Enter' && visible) {
      // Con la lista abierta, Intro elige (o cierra la lista); nunca envía el formulario por sorpresa
      e.preventDefault()
      const m = resultados[activo]
      if (m) elegir(m)
      else setAbierta(false)
    } else if (e.key === 'Escape' && visible) {
      e.preventDefault()
      setAbierta(false)
      setActivo(-1)
    }
  }

  const etiquetaId = `${p.id}-etiqueta`
  return (
    <div className="campo campo-combo">
      <label id={etiquetaId} htmlFor={p.id}>
        {p.etiqueta}
        {p.marca && <span className="marca"> ({p.marca})</span>}
      </label>
      <div className="combo">
        <input
          id={p.id}
          name={p.id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={idLista}
          aria-activedescendant={visible && activo >= 0 ? idOpcion(activo) : undefined}
          value={p.valor}
          onChange={(e) => {
            p.onCambio(e.target.value)
            setAbierta(true)
            setActivo(-1)
          }}
          onKeyDown={teclas}
          onBlur={() => {
            setAbierta(false)
            setActivo(-1)
            p.onBlur?.()
          }}
          autoComplete={p.autoComplete ?? 'off'}
          spellCheck={false}
          aria-invalid={p.error ? true : undefined}
          aria-describedby={describedBy(p.id, p)}
        />
        <ul id={idLista} role="listbox" aria-labelledby={etiquetaId} className="combo-lista" hidden={!visible}>
          {visible &&
            resultados.map((m, i) => (
              // El teclado se atiende en el campo (patrón APG: las opciones nunca reciben el foco; aria-activedescendant)
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={m.codigo}
                id={idOpcion(i)}
                role="option"
                aria-selected={i === activo}
                // El foco se queda en el campo al tocar una opción
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(m)}
              >
                {m.nombre} — {m.codigo}
              </li>
            ))}
        </ul>
      </div>
      <p role="status" className="solo-lectores">
        {estado}
      </p>
      {buscando && n === 0 && (
        <p className="ayuda" aria-hidden="true">
          {estado}
        </p>
      )}
      <Mensajes id={p.id} ayuda={p.ayuda} error={p.error} aviso={p.aviso} etiquetaError={p.etiquetaError ?? 'Error'} etiquetaAviso={p.etiquetaAviso ?? 'Aviso'} />
    </div>
  )
}
