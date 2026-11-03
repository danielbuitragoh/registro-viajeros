import { useId, useRef, useState } from 'react'
import { LONGITUD_MINIMA_PASSWORD } from '../storage/almacen'
import { Entrada } from './campos'

export interface AccesoProps {
  modo: 'crear' | 'abrir'
  onCrear: (password: string) => Promise<void>
  onAbrir: (password: string) => Promise<boolean>
  /** Texto de ayuda para la demo (contraseña de ejemplo). */
  pistaDemo?: string
}

/**
 * Crear o abrir el almacén cifrado. WCAG 3.3.8: no se bloquea pegar ni los gestores de contraseñas (autocomplete correcto).
 */
export function Acceso({ modo, onCrear, onAbrir, pistaDemo }: AccesoProps) {
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [entiendo, setEntiendo] = useState(false)
  const [error, setError] = useState<string>()
  const [trabajando, setTrabajando] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const idCheck = useId()

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    if (modo === 'crear') {
      if (pass.length < LONGITUD_MINIMA_PASSWORD) return fallo(`La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`)
      if (pass !== pass2) return fallo('Las dos contraseñas no coinciden.')
      if (!entiendo) return fallo('Marca la casilla para confirmar que entiendes que no hay recuperación de contraseña.')
    }
    setTrabajando(true)
    try {
      if (modo === 'crear') await onCrear(pass)
      else if (!(await onAbrir(pass))) fallo('Contraseña incorrecta.')
    } catch (err) {
      fallo(err instanceof Error ? err.message : String(err))
    } finally {
      setTrabajando(false)
    }
  }
  function fallo(m: string) {
    setError(m)
    setTimeout(() => errorRef.current?.focus(), 0)
  }

  return (
    <main id="contenido" tabIndex={-1} className="pagina-acceso">
      <h1>{modo === 'crear' ? 'Crea la contraseña del establecimiento' : 'Desbloquea el registro'}</h1>
      {modo === 'crear' ? (
        <p>
          Todos los datos se guardan <strong>cifrados en este dispositivo</strong> con esta contraseña. No hay servidor ni cuenta: si la olvidas, nadie puede recuperar los datos (podrás restaurar desde una copia de seguridad).
        </p>
      ) : (
        <p>Introduce la contraseña del establecimiento para descifrar los datos de este dispositivo.</p>
      )}
      {pistaDemo && <p className="tarjeta tarjeta-info">{pistaDemo}</p>}
      <form onSubmit={enviar} noValidate>
        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="mensaje mensaje-error">
            <span aria-hidden="true">✖ </span>
            <span className="solo-lectores">Error: </span>
            {error}
          </p>
        )}
        <Entrada id="password" tipo="password" etiqueta="Contraseña" valor={pass} onCambio={setPass} autoComplete={modo === 'crear' ? 'new-password' : 'current-password'} obligatorio ayuda={modo === 'crear' ? `Mínimo ${LONGITUD_MINIMA_PASSWORD} caracteres. Una frase larga es mejor que una palabra con símbolos.` : undefined} />
        {modo === 'crear' && (
          <>
            <Entrada id="password2" tipo="password" etiqueta="Repite la contraseña" valor={pass2} onCambio={setPass2} autoComplete="new-password" obligatorio />
            <div className="campo campo-check">
              <input id={idCheck} type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
              <label htmlFor={idCheck}>Entiendo que, si olvido la contraseña, los datos no se pueden recuperar.</label>
            </div>
          </>
        )}
        <div className="acciones">
          <button type="submit" className="primario" disabled={trabajando} aria-busy={trabajando}>
            {trabajando ? 'Trabajando…' : modo === 'crear' ? 'Crear y entrar' : 'Desbloquear'}
          </button>
        </div>
      </form>
      <p>
        <a href="presentacion/">¿Qué es y qué no es esta app? Presentación para alojamientos</a>
      </p>
    </main>
  )
}
