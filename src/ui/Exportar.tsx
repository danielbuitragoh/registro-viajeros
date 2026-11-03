import { useMemo, useState } from 'react'
import type { Establecimiento, Incidencia, Reserva, TipoComunicacion } from '../domain/tipos'
import { generarFichero, type ResultadoExportacion } from '../exportador'
import { etiquetaCampo, mensajeIncidencia } from '../i18n/mensajes'
import { estadoParte } from '../validators/reserva'
import { ChipEstado } from './Estado'
import { fechaHoraCorta } from './formato'
import { Icono } from './Icono'

export interface ExportarProps {
  reservas: Reserva[]
  establecimiento?: Establecimiento
  ahora: Date
  /** Se llama al descargar un fichero de partes de viajeros, con los ids incluidos. */
  onExportadas: (ids: string[], cuando: string) => Promise<void>
  onIrAjustes: () => void
}

const nombrePrincipal = (r: Reserva) => {
  const v = r.viajeros.find((x) => x.esTitular) ?? r.viajeros[0]
  return v ? `${v.nombre} ${v.apellido1}`.trim() : 'sin fichas'
}

export function Exportar({ reservas, establecimiento, ahora, onExportadas, onIrAjustes }: ExportarProps) {
  const [tipo, setTipo] = useState<TipoComunicacion>('partes')
  const ordenadas = useMemo(() => [...reservas].sort((a, b) => b.entrada.localeCompare(a.entrada)), [reservas])
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(reservas.filter((r) => estadoParte(r) === 'completo' && !r.prueba).map((r) => r.id)))
  const [resultado, setResultado] = useState<ResultadoExportacion>()
  const [descargado, setDescargado] = useState(false)

  function alternar(id: string) {
    setResultado(undefined)
    setDescargado(false)
    setSeleccion((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function generar() {
    if (!establecimiento) return
    setDescargado(false)
    setResultado(generarFichero(establecimiento, ordenadas.filter((r) => seleccion.has(r.id)), tipo, ahora))
  }

  async function descargar(r: Extract<ResultadoExportacion, { ok: true }>) {
    const url = URL.createObjectURL(new Blob([r.xml], { type: 'application/xml;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = r.nombreFichero
    a.click()
    URL.revokeObjectURL(url)
    if (tipo === 'partes') await onExportadas(r.reservasIncluidas, ahora.toISOString())
    setDescargado(true)
  }

  const pruebasIncluidas = resultado?.ok ? reservas.filter((r) => r.prueba && resultado.reservasIncluidas.includes(r.id)) : []

  const nombreReserva = (id?: string) => {
    const r = reservas.find((x) => x.id === id)
    return r ? `Reserva ${r.referencia}` : 'Establecimiento'
  }
  const quien = (i: Incidencia) => {
    const r = reservas.find((x) => x.id === i.reservaId)
    const v = r?.viajeros.find((x) => x.id === i.viajeroId)
    return [nombreReserva(i.reservaId), v ? `${v.nombre} ${v.apellido1}`.trim() : undefined].filter(Boolean).join(' › ')
  }

  return (
    <section aria-labelledby="t-exportar">
      <h1 id="t-exportar">Exportar fichero de alta masiva</h1>
      <div className="tarjeta tarjeta-info" role="note">
        <p>
          <strong>Esta aplicación no envía nada al Ministerio del Interior.</strong> Genera y valida el fichero XML según el documento «Alta masiva de comunicaciones Hospedajes v1.1.0»; tú debes subirlo en el portal SES.Hospedajes dentro del plazo. Un fichero solo puede contener comunicaciones de un mismo tipo.
        </p>
      </div>

      {!establecimiento && (
        <p className="mensaje mensaje-error" role="alert">
          Falta configurar el establecimiento.{' '}
          <button type="button" className="enlace" onClick={onIrAjustes}>
            Ir a Ajustes
          </button>
        </p>
      )}

      <fieldset>
        <legend>Tipo de comunicación</legend>
        <div className="campo campo-check">
          <input id="tipo-partes" type="radio" name="tipo" checked={tipo === 'partes'} onChange={() => { setTipo('partes'); setResultado(undefined) }} />
          <label htmlFor="tipo-partes">Partes de viajeros (apartado 3): datos completos de cada viajero</label>
        </div>
        <div className="campo campo-check">
          <input id="tipo-reservas" type="radio" name="tipo" checked={tipo === 'reservas'} onChange={() => { setTipo('reservas'); setResultado(undefined) }} />
          <label htmlFor="tipo-reservas">Reservas de hospedaje (apartado 4): datos de la reserva y del titular</label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Reservas a incluir ({seleccion.size} seleccionadas)</legend>
        {ordenadas.length === 0 && (
          <div className="vacio">
            <Icono nombre="exportar" />
            <p>
              <strong>Todavía no hay reservas que exportar.</strong>
            </p>
            <p>Cuando una reserva tenga sus fichas completas, aparecerá aquí ya marcada.</p>
          </div>
        )}
        <ul className="lista-seleccion">
          {ordenadas.map((r) => {
            const estado = estadoParte(r)
            return (
              <li key={r.id} className="campo campo-check">
                <input id={`sel-${r.id}`} type="checkbox" checked={seleccion.has(r.id)} onChange={() => alternar(r.id)} />
                <label htmlFor={`sel-${r.id}`}>
                  <strong>{r.referencia || '(sin referencia)'}</strong> · {fechaHoraCorta(r.entrada)} · {nombrePrincipal(r)} <ChipEstado estado={estado} />
                  {r.prueba && <span className="chip chip-prueba">Prueba</span>}
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div className="acciones">
        <button type="button" className="primario" onClick={generar} disabled={!establecimiento || seleccion.size === 0}>
          Validar y generar fichero
        </button>
      </div>

      {resultado && !resultado.ok && (
        <div role="alert" className="tarjeta tarjeta-error">
          <h2>No se puede generar el fichero: {resultado.errores.length} {resultado.errores.length === 1 ? 'error' : 'errores'}</h2>
          <p>Corrige estos datos y vuelve a intentarlo. No se ha creado ningún fichero.</p>
          <ul className="lista-incidencias">
            {resultado.errores.map((e, k) => (
              <li key={k} className="mensaje-error">
                <span aria-hidden="true">✖ </span>
                <span className="solo-lectores">Error: </span>
                <strong>{quien(e)}</strong> — {e.codigo.startsWith('xml_') ? e.campo : etiquetaCampo(e.campo, 'es')}: {mensajeIncidencia(e, 'es')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultado?.ok && (
        <div role="status" className="tarjeta tarjeta-ok">
          <h2>Fichero validado</h2>
          <p>
            <span aria-hidden="true">✔ </span>
            {resultado.reservasIncluidas.length} {resultado.reservasIncluidas.length === 1 ? 'comunicación' : 'comunicaciones'} superan la validación contra el documento oficial. Nombre: <code>{resultado.nombreFichero}</code>
          </p>
          {pruebasIncluidas.length > 0 && (
            <p className="tarjeta tarjeta-aviso" role="alert">
              <Icono nombre="aviso" /> <strong>{`El fichero incluye la reserva de prueba ${pruebasIncluidas.map((r) => r.referencia).join(', ')}: NO subas este fichero al portal.`}</strong> Quítala de la selección y vuelve a generarlo.
            </p>
          )}
          {resultado.avisos.length > 0 && (
            <>
              <h3>Avisos (no bloquean)</h3>
              <ul className="lista-incidencias">
                {resultado.avisos.map((a, k) => (
                  <li key={k} className="mensaje-aviso">
                    <span aria-hidden="true">⚠ </span>
                    <span className="solo-lectores">Aviso: </span>
                    <strong>{quien(a)}</strong> — {etiquetaCampo(a.campo, 'es')}: {mensajeIncidencia(a, 'es')}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="ayuda">
            Pendiente de confirmar con el portal real (ver README): espacio de nombres/plantilla XML, formato del campo «internet» y códigos de municipio INE.
          </p>
          <div className="acciones">
            <button type="button" className="primario" onClick={() => descargar(resultado)}>
              Descargar XML
            </button>
          </div>
          {descargado && (
            <section className="siguiente-paso" aria-labelledby="t-subir" role="status">
              <h2 id="t-subir">
                <Icono nombre="adelante" />
                Último paso: súbelo tú al portal SES.Hospedajes
              </h2>
              <p>
                <span aria-hidden="true">✔ </span>
                Fichero descargado{tipo === 'partes' ? ' y partes marcados como «exportados»' : ''}. Entra en el portal SES.Hospedajes y súbelo en el alta masiva de comunicaciones: hasta entonces, la comunicación NO está hecha.
              </p>
              <p className="ayuda">Si tu programa de gestión ya comunica los partes, no lo subas: se comunicarían dos veces. ¿El portal lo rechaza? Mira la <a href="#/ayuda">Ayuda</a>.</p>
            </section>
          )}
          <details>
            <summary>Ver el contenido del XML</summary>
            {/* Región con scroll: debe ser enfocable por teclado (WCAG 2.1.1) */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <pre tabIndex={0}>{resultado.xml}</pre>
          </details>
        </div>
      )}
    </section>
  )
}
