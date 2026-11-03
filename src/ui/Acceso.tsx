import { useId, useRef, useState } from 'react'
import { LONGITUD_MINIMA_PASSWORD } from '../storage/almacen'
import { Entrada } from './campos'
import { PasosAsistente } from './PasosAsistente'
import { Icono, Logo } from './Icono'

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
      <p className="marca-app">
        <Logo />
        Registro de viajeros
      </p>
      {modo === 'crear' && (
        <>
          <p className="ayuda">Primeros pasos: en unos minutos dejas la app lista, con una reserva de prueba. Puedes saltarlos.</p>
          <PasosAsistente actual={1} />
        </>
      )}
      <h1>{modo === 'crear' ? 'Crea la contraseña del establecimiento' : 'Desbloquea el registro'}</h1>
      {modo === 'crear' ? (
        <>
          <p>
            Todos los datos se guardan <strong>cifrados en este dispositivo</strong> con esta contraseña. Te la pediré al abrir la app y cada vez que se bloquee (tras 15 minutos sin uso).
          </p>
          <section className="tarjeta tarjeta-aviso" aria-labelledby="t-perder">
            <h2 id="t-perder">
              <Icono nombre="aviso" /> ¿Qué pasa si la pierdo?
            </h2>
            <ul>
              <li>
                <strong>Nadie puede recuperarla</strong>: no hay servidor ni cuenta, ni siquiera quien hizo la app puede abrir tus datos.
              </li>
              <li>Sin ella, los datos de este dispositivo quedan ilegibles para siempre.</li>
              <li>
                La única salida es una <strong>copia de seguridad</strong> (la harás en el último paso), que tiene su propia contraseña.
              </li>
            </ul>
            <p>
              <strong>Consejo:</strong> usa una frase de 4 o 5 palabras que recuerdes (por ejemplo, algo sobre tu casa) y apúntala en papel en un sitio seguro, fuera del ordenador.
            </p>
          </section>
        </>
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
            {trabajando ? 'Trabajando…' : modo === 'crear' ? 'Crear y seguir' : 'Desbloquear'}
          </button>
        </div>
      </form>
      {modo === 'abrir' && (
        <details className="pista">
          <summary>
            <Icono nombre="ayuda" />
            ¿Has olvidado la contraseña?
          </summary>
          <div className="pista-contenido">
            <p>No se puede recuperar. Si tienes una copia de seguridad (y recuerdas la contraseña de la copia), borra los datos de este sitio en los ajustes del navegador, vuelve a abrir la app, crea una contraseña nueva y restaura la copia en Ajustes → Copia de seguridad.</p>
          </div>
        </details>
      )}
      <p>
        <a href="presentacion/">¿Qué es y qué no es esta app? Presentación para alojamientos</a>
      </p>
    </main>
  )
}
