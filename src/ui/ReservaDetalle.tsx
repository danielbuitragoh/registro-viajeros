import { useMemo, useState } from 'react'
import type { Establecimiento, Reserva, Viajero } from '../domain/tipos'
import { plazo24h } from '../domain/plazos'
import { mensajeIncidencia, etiquetaCampo } from '../i18n/mensajes'
import { edadEn, esFechaValida, soloFecha } from '../validators/fechas'
import { estadoParte, validarReserva } from '../validators/reserva'
import { EnlaceHuesped } from './EnlaceHuesped'
import { ChipEstado, TextoPlazo } from './Estado'
import { FormularioViajero, viajeroVacio } from './FormularioViajero'
import { ReservaForm } from './ReservaForm'
import { fechaCorta, fechaHoraCorta, nuevoId } from './formato'
import { useRelacionesIne } from '../ine/useIne'
import { siguientePaso, type SiguientePaso } from '../domain/siguientePaso'
import { TIPO_PAGO, esCodigo } from '../oficial/codigos'
import { Icono } from './Icono'
import { Migas } from './Migas'

export interface ReservaDetalleProps {
  reserva: Reserva
  establecimiento: Establecimiento
  ahora: Date
  onGuardar: (r: Reserva) => Promise<void>
  onBorrar: (id: string) => Promise<void>
  onVolver: () => void
  /** Ir a Exportar (desde el «siguiente paso»). */
  onExportar?: () => void
}

const nombre = (v: Viajero) => `${v.nombre} ${v.apellido1}`.trim() || '(sin nombre)'

export function ReservaDetalle({ reserva, establecimiento, ahora, onGuardar, onBorrar, onExportar }: ReservaDetalleProps) {
  const [editandoReserva, setEditandoReserva] = useState(false)
  const [editandoViajero, setEditandoViajero] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const estado = estadoParte(reserva)
  const plazo = plazo24h(reserva.entrada, ahora)
  // Avisos del código INE (si esta versión incluye la relación de municipios); no cambian el estado del parte
  const ine = useRelacionesIne(reserva.viajeros.some((v) => v.direccion?.pais === 'ESP'))
  const incidencias = useMemo(() => validarReserva(reserva, 'partes', { ine: ine.consulta }), [reserva, ine.consulta])
  const fechaEntrada = soloFecha(reserva.entrada)
  const esAdulto = (v: Viajero) => esFechaValida(v.fechaNacimiento) && edadEn(v.fechaNacimiento, fechaEntrada) >= 18

  async function guardarViajero(v: Viajero) {
    const existe = reserva.viajeros.some((x) => x.id === v.id)
    const viajeros = existe ? reserva.viajeros.map((x) => (x.id === v.id ? v : x)) : [...reserva.viajeros, v]
    await onGuardar({ ...reserva, viajeros, modificadaEn: new Date().toISOString() })
    setEditandoViajero(null)
  }

  if (editandoViajero) {
    const existente = reserva.viajeros.find((v) => v.id === editandoViajero)
    const numero = existente ? reserva.viajeros.indexOf(existente) + 1 : reserva.viajeros.length + 1
    return (
      <FormularioViajero
        key={editandoViajero}
        inicial={existente ?? { ...viajeroVacio(editandoViajero), origen: 'recepcion' }}
        idioma="es"
        modo="recepcion"
        fechaEntrada={fechaEntrada}
        adultos={reserva.viajeros.filter((v) => v.id !== editandoViajero && esAdulto(v)).map((v) => ({ id: v.id, nombre: nombre(v) }))}
        numero={numero}
        direccionCopiable={reserva.viajeros[0]?.direccion}
        permitirTitular
        onGuardar={guardarViajero}
        onCancelar={() => setEditandoViajero(null)}
      />
    )
  }

  return (
    <div>
      <Migas items={[{ texto: 'Reservas', ruta: '/reservas' }, { texto: `Reserva ${reserva.referencia || '(sin referencia)'}` }]} />
      <h1>Reserva {reserva.referencia || '(sin referencia)'}</h1>
      <p className="fila-estado">
        <ChipEstado estado={estado} /> <span className="sep">·</span> Plazo 24 h: <TextoPlazo plazo={plazo} exportado={estado === 'exportado'} />
        {reserva.prueba && <span className="chip chip-prueba">Reserva de prueba: no la subas al portal</span>}
      </p>

      <TarjetaSiguientePaso paso={siguientePaso(reserva)} exportadaEn={reserva.exportadaEn} onExportar={onExportar} />

      <section aria-labelledby="t-viajeros">
        <h2 id="t-viajeros">Viajeros ({reserva.viajeros.length}/{reserva.numPersonas})</h2>
        {reserva.viajeros.length === 0 ? (
          <div className="vacio">
            <Icono nombre="persona" />
            <p>
              <strong>Todavía no hay fichas.</strong>
            </p>
            <p>Envía el enlace al huésped (más abajo, «Ficha rellenada por el huésped») o rellénalas aquí.</p>
          </div>
        ) : (
          <ul className="lista-tarjetas">
            {reserva.viajeros.map((v, i) => {
              const nErr = incidencias.filter((x) => x.viajeroId === v.id && x.gravedad === 'error').length
              return (
                <li key={v.id} className="tarjeta">
                  <p className="nombre-viajero">
                    {i + 1}. {nombre(v)} {v.esTitular && <span className="chip chip-info">Titular</span>} {v.origen === 'huesped' && <span className="chip chip-info">Rellenada por el huésped</span>}
                  </p>
                  <p className={nErr > 0 ? 'mensaje mensaje-error' : 'mensaje mensaje-ok'}>
                    <span aria-hidden="true">{nErr > 0 ? '✖ ' : '✔ '}</span>
                    {nErr > 0 ? `${nErr} ${nErr === 1 ? 'dato por revisar' : 'datos por revisar'}` : 'Ficha completa'}
                  </p>
                  <div className="acciones">
                    <button type="button" className="secundario" onClick={() => setEditandoViajero(v.id)}>
                      Editar<span className="solo-lectores"> {nombre(v)}</span>
                    </button>
                    <button
                      type="button"
                      className="peligro"
                      onClick={() => onGuardar({ ...reserva, viajeros: reserva.viajeros.filter((x) => x.id !== v.id), modificadaEn: new Date().toISOString() })}
                    >
                      Quitar<span className="solo-lectores"> {nombre(v)}</span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="acciones">
          <button type="button" className="secundario" onClick={() => setEditandoViajero(nuevoId())}>
            <Icono nombre="mas" />
            Añadir viajero (rellenar en recepción)
          </button>
        </div>
      </section>

      <EnlaceHuesped reserva={reserva} establecimiento={establecimiento} onGuardar={onGuardar} />

      <section aria-labelledby="t-revision">
        <h2 id="t-revision" tabIndex={-1}>Revisión del parte</h2>
        {incidencias.length === 0 ? (
          <p className="mensaje mensaje-ok">
            <span aria-hidden="true">✔ </span>Sin incidencias: el parte está listo para exportar.
          </p>
        ) : (
          <ul className="lista-incidencias">
            {incidencias.map((i, k) => {
              const v = i.viajeroId ? reserva.viajeros.find((x) => x.id === i.viajeroId) : undefined
              return (
                <li key={k} className={i.gravedad === 'error' ? 'mensaje-error' : 'mensaje-aviso'}>
                  <span aria-hidden="true">{i.gravedad === 'error' ? '✖ ' : '⚠ '}</span>
                  <span className="solo-lectores">{i.gravedad === 'error' ? 'Error' : 'Aviso'}: </span>
                  {v && <strong>{nombre(v)} — </strong>}
                  {etiquetaCampo(i.campo, 'es')}: {mensajeIncidencia(i, 'es')}
                  {v && (
                    <>
                      {' '}
                      <button type="button" className="enlace" onClick={() => setEditandoViajero(v.id)}>
                        Corregir<span className="solo-lectores"> la ficha de {nombre(v)}</span>
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {editandoReserva ? (
        <ReservaForm
          inicial={reserva}
          ahora={ahora}
          onGuardar={async (r) => {
            await onGuardar(r)
            setEditandoReserva(false)
          }}
          onCancelar={() => setEditandoReserva(false)}
        />
      ) : (
        <section aria-labelledby="t-datos">
          <h2 id="t-datos">Datos de la reserva</h2>
          <dl className="datos">
            <dt>Entrada</dt>
            <dd>{fechaHoraCorta(reserva.entrada)}</dd>
            <dt>Salida</dt>
            <dd>{fechaHoraCorta(reserva.salida)}</dd>
            <dt>Personas</dt>
            <dd>{reserva.numPersonas}</dd>
            <dt>Habitación</dt>
            <dd>{reserva.habitacion || '—'}</dd>
            <dt>Canal</dt>
            <dd>{reserva.canal || '—'}</dd>
            <dt>Pago</dt>
            <dd>{esCodigo(TIPO_PAGO, reserva.pago.tipoPago) ? TIPO_PAGO[reserva.pago.tipoPago].es : reserva.pago.tipoPago}</dd>
          </dl>
          <button type="button" className="secundario" onClick={() => setEditandoReserva(true)}>
            Editar datos de la reserva
          </button>
        </section>
      )}


      <section aria-labelledby="t-borrar">
        <h2 id="t-borrar">Eliminar reserva</h2>
        {!confirmarBorrado ? (
          <button type="button" className="peligro" onClick={() => setConfirmarBorrado(true)}>
            Eliminar esta reserva…
          </button>
        ) : (
          <div role="alert" className="tarjeta">
            <p>
              Se borrarán la reserva y todas sus fichas de este dispositivo. <strong>Recuerda que debes conservar los datos 3 años.</strong>
            </p>
            <div className="acciones">
              <button type="button" className="peligro" onClick={() => onBorrar(reserva.id)}>
                Sí, eliminar definitivamente
              </button>
              <button type="button" className="secundario" onClick={() => setConfirmarBorrado(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

const enfocar = (id: string) => {
  const el = document.getElementById(id)
  el?.scrollIntoView?.({ block: 'start' })
  el?.focus()
}

/** Qué hacer ahora con esta reserva, en una frase y con su botón. */
function TarjetaSiguientePaso({ paso, exportadaEn, onExportar }: { paso: SiguientePaso; exportadaEn?: string; onExportar?: () => void }) {
  const contenido: Record<SiguientePaso['tipo'], { texto: string; boton?: { texto: string; accion: () => void } }> = {
    enlace: { texto: 'Crea el enlace y envíaselo al huésped por WhatsApp o correo, o enséñale el QR en el mostrador. También puedes rellenar las fichas aquí.', boton: { texto: 'Ir al enlace del huésped', accion: () => enfocar('t-enlace') } },
    esperar: { texto: 'El huésped ya tiene el enlace. Cuando te enseñe su QR, escanéalo con la cámara (o pega el código que te envíe).', boton: { texto: 'Ir al escáner', accion: () => enfocar('t-importar') } },
    revisar: { texto: paso.tipo === 'revisar' ? `Hay ${paso.errores} ${paso.errores === 1 ? 'dato' : 'datos'} por revisar antes de exportar.` : '', boton: { texto: 'Ver la revisión', accion: () => enfocar('t-revision') } },
    faltan: { texto: paso.tipo === 'faltan' ? `Faltan fichas: hay ${paso.fichas} de ${paso.personas}. Pide al resto que rellene su ficha o añádelas aquí.` : '' },
    exportar: { texto: 'El parte está completo. Genera el fichero en Exportar y súbelo al portal SES.Hospedajes.', boton: onExportar ? { texto: 'Ir a Exportar', accion: onExportar } : undefined },
    subir: { texto: `Fichero generado${exportadaEn ? ` el ${fechaCorta(exportadaEn)}` : ''}. Si aún no lo has subido al portal SES.Hospedajes, hazlo: hasta entonces la comunicación no está hecha.` },
  }
  const c = contenido[paso.tipo]
  return (
    <section className="siguiente-paso" aria-labelledby="t-siguiente">
      <h2 id="t-siguiente">
        <Icono nombre={paso.tipo === 'subir' ? 'hecho' : 'adelante'} />
        Siguiente paso
      </h2>
      <p>{c.texto}</p>
      {c.boton && (
        <button type="button" className="primario" onClick={c.boton.accion}>
          {c.boton.texto}
        </button>
      )}
    </section>
  )
}
