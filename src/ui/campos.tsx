import { useId, type ReactNode } from 'react'

interface BaseProps {
  id: string
  etiqueta: string
  ayuda?: string
  error?: string
  aviso?: string
  obligatorio?: boolean
  /** Texto del indicador de obligatorio/opcional para lectores de pantalla y vista (p. ej. "obligatorio"). */
  marca?: string
}

function Mensajes({ id, ayuda, error, aviso, etiquetaError, etiquetaAviso }: { id: string; ayuda?: string; error?: string; aviso?: string; etiquetaError: string; etiquetaAviso: string }) {
  return (
    <>
      {ayuda && (
        <p id={`${id}-ayuda`} className="ayuda">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mensaje mensaje-error">
          <span aria-hidden="true">✖ </span>
          <span className="solo-lectores">{etiquetaError}: </span>
          {error}
        </p>
      )}
      {aviso && !error && (
        <p id={`${id}-aviso`} className="mensaje mensaje-aviso">
          <span aria-hidden="true">⚠ </span>
          <span className="solo-lectores">{etiquetaAviso}: </span>
          {aviso}
        </p>
      )}
    </>
  )
}

const describedBy = (id: string, p: { ayuda?: string; error?: string; aviso?: string }) =>
  [p.ayuda && `${id}-ayuda`, p.error && `${id}-error`, p.aviso && !p.error && `${id}-aviso`].filter(Boolean).join(' ') || undefined

export interface EntradaProps extends BaseProps {
  valor: string
  onCambio: (v: string) => void
  onBlur?: () => void
  tipo?: 'text' | 'date' | 'tel' | 'email' | 'number' | 'datetime-local' | 'password'
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  maxLength?: number
  min?: string
  max?: string
  mayusculas?: boolean
  etiquetaError?: string
  etiquetaAviso?: string
}

export function Entrada(p: EntradaProps) {
  return (
    <div className="campo">
      <label htmlFor={p.id}>
        {p.etiqueta}
        {p.marca && <span className="marca"> ({p.marca})</span>}
      </label>
      <input
        id={p.id}
        name={p.id}
        type={p.tipo ?? 'text'}
        value={p.valor}
        onChange={(e) => p.onCambio(e.target.value)}
        onBlur={p.onBlur}
        autoComplete={p.autoComplete ?? 'off'}
        inputMode={p.inputMode}
        maxLength={p.maxLength}
        min={p.min}
        max={p.max}
        required={p.obligatorio}
        aria-required={p.obligatorio || undefined}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(p.id, p)}
        autoCapitalize={p.mayusculas ? 'characters' : undefined}
        spellCheck={p.mayusculas ? false : undefined}
      />
      <Mensajes id={p.id} ayuda={p.ayuda} error={p.error} aviso={p.aviso} etiquetaError={p.etiquetaError ?? 'Error'} etiquetaAviso={p.etiquetaAviso ?? 'Aviso'} />
    </div>
  )
}

export interface SelectorProps extends BaseProps {
  valor: string
  onCambio: (v: string) => void
  onBlur?: () => void
  opciones: { valor: string; texto: string }[]
  vacio?: string
  autoComplete?: string
  etiquetaError?: string
  etiquetaAviso?: string
}

export function Selector(p: SelectorProps) {
  return (
    <div className="campo">
      <label htmlFor={p.id}>
        {p.etiqueta}
        {p.marca && <span className="marca"> ({p.marca})</span>}
      </label>
      <select
        id={p.id}
        name={p.id}
        value={p.valor}
        onChange={(e) => p.onCambio(e.target.value)}
        onBlur={p.onBlur}
        autoComplete={p.autoComplete ?? 'off'}
        required={p.obligatorio}
        aria-required={p.obligatorio || undefined}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(p.id, p)}
      >
        {p.vacio !== undefined && <option value="">{p.vacio}</option>}
        {p.opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      <Mensajes id={p.id} ayuda={p.ayuda} error={p.error} aviso={p.aviso} etiquetaError={p.etiquetaError ?? 'Error'} etiquetaAviso={p.etiquetaAviso ?? 'Aviso'} />
    </div>
  )
}

export function Grupo({ leyenda, ayuda, children }: { leyenda: string; ayuda?: string; children: ReactNode }) {
  const id = useId()
  return (
    <fieldset aria-describedby={ayuda ? `${id}-ayuda` : undefined}>
      <legend>{leyenda}</legend>
      {ayuda && (
        <p id={`${id}-ayuda`} className="ayuda">
          {ayuda}
        </p>
      )}
      {children}
    </fieldset>
  )
}

export interface ItemResumen {
  id: string
  texto: string
}

/** Resumen de errores enfocable: al enviar con errores, el foco va aquí y cada enlace lleva al campo (WCAG 3.3.1, 2.4.3). */
export function ResumenErrores({ titulo, items, refResumen }: { titulo: string; items: ItemResumen[]; refResumen: React.RefObject<HTMLDivElement | null> }) {
  if (items.length === 0) return null
  return (
    <div ref={refResumen} className="resumen-errores" role="alert" tabIndex={-1} aria-labelledby="resumen-errores-titulo">
      <h2 id="resumen-errores-titulo">{titulo}</h2>
      <ul>
        {items.map((it, i) => (
          <li key={`${it.id}-${i}`}>
            <a
              href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(it.id)?.focus()
              }}
            >
              {it.texto}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
