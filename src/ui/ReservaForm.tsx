import { useMemo, useRef, useState } from 'react'
import type { Incidencia, Reserva } from '../domain/tipos'
import { TIPO_PAGO } from '../oficial/codigos'
import { mensajeIncidencia, etiquetaCampo } from '../i18n/mensajes'
import { hoyISO } from '../validators/fechas'
import { validarReserva } from '../validators/reserva'
import { Entrada, Grupo, ResumenErrores, Selector } from './campos'
import { nuevoId } from './formato'
import { Pista } from './Pista'

const CANALES = ['Directo', 'Teléfono', 'Booking.com', 'Airbnb', 'Expedia', 'Otro']

export function reservaNueva(ahora: Date): Reserva {
  const hoy = hoyISO(ahora)
  const ts = ahora.toISOString()
  return {
    id: nuevoId(),
    referencia: '',
    fechaContrato: hoy,
    entrada: `${hoy}T14:00`,
    salida: '',
    numPersonas: 1,
    habitacion: '',
    canal: 'Directo',
    pago: { tipoPago: 'EFECT' },
    viajeros: [],
    creadaEn: ts,
    modificadaEn: ts,
  }
}

/** Solo las incidencias propias del contrato (las de viajeros se ven en la ficha de la reserva). */
const delContrato = (i: Incidencia) => !i.viajeroId && i.campo !== 'viajeros'

export function ReservaForm({ inicial, ahora, onGuardar, onCancelar }: { inicial: Reserva; ahora: Date; onGuardar: (r: Reserva) => void; onCancelar: () => void }) {
  const [r, setR] = useState<Reserva>(inicial)
  const [intentado, setIntentado] = useState(false)
  const [tocados, setTocados] = useState<Set<string>>(new Set())
  const resumenRef = useRef<HTMLDivElement>(null)
  const incidencias = useMemo(() => validarReserva({ ...r, viajeros: [] }, 'partes').filter(delContrato), [r])
  const fid = (c: string) => `r-${c.replace(/\./g, '-')}`
  const err = (c: string) => {
    const i = incidencias.find((x) => x.campo === c && x.gravedad === 'error')
    return i && (intentado || tocados.has(c)) ? mensajeIncidencia(i, 'es') : undefined
  }
  const p = (c: string) => ({ id: fid(c), etiqueta: etiquetaCampo(c, 'es'), error: err(c), onBlur: () => setTocados((s) => new Set(s).add(c)) })
  const items = intentado ? incidencias.filter((i) => i.gravedad === 'error').map((i) => ({ id: fid(i.campo), texto: `${etiquetaCampo(i.campo, 'es')}: ${mensajeIncidencia(i, 'es')}` })) : []

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (incidencias.some((i) => i.gravedad === 'error')) {
      setTimeout(() => resumenRef.current?.focus(), 0)
      return
    }
    onGuardar({ ...r, referencia: r.referencia.trim(), habitacion: r.habitacion.trim(), modificadaEn: ahora.toISOString() })
  }

  const tiposPago = Object.entries(TIPO_PAGO).map(([k, e]) => ({ valor: k, texto: e.es }))

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="t-reserva-form">
      <h2 id="t-reserva-form">Datos de la reserva</h2>
      <ResumenErrores refResumen={resumenRef} titulo={`Hay ${items.length} ${items.length === 1 ? 'dato' : 'datos'} por revisar`} items={items} />
      <Grupo leyenda="Contrato y estancia">
        <Entrada {...p('referencia')} valor={r.referencia} onCambio={(v) => setR({ ...r, referencia: v })} obligatorio ayuda="Número de referencia del contrato (máx. 50 caracteres)." maxLength={50} />
        <Entrada {...p('fechaContrato')} tipo="date" valor={r.fechaContrato} onCambio={(v) => setR({ ...r, fechaContrato: v })} obligatorio ayuda="Día en que se formalizó la reserva." />
        <Entrada
          {...p('entrada')}
          tipo="datetime-local"
          valor={r.entrada}
          onCambio={(v) => setR({ ...r, entrada: v })}
          obligatorio
          ayuda="Entrada prevista. Si no sabes la hora, deja las 00:00."
          pista={
            <Pista titulo="¿Desde cuándo cuentan las 24 h?">
              <p>
                La app cuenta las 24 h para comunicar el parte <strong>desde la entrada prevista</strong> que pongas aquí, y te avisa en «Hoy» cuando quedan menos de 6 h. El plazo viene del Real Decreto 933/2021, no del documento técnico; confirma con tu asesoría cómo se computa (pendiente P12).
              </p>
            </Pista>
          }
        />
        <Entrada {...p('salida')} tipo="datetime-local" valor={r.salida} onCambio={(v) => setR({ ...r, salida: v })} obligatorio />
        <Entrada {...p('numPersonas')} tipo="number" inputMode="numeric" min="1" valor={String(r.numPersonas)} onCambio={(v) => setR({ ...r, numPersonas: v === '' ? Number.NaN : Number(v) })} obligatorio />
        <Entrada {...p('numHabitaciones')} tipo="number" inputMode="numeric" min="1" valor={r.numHabitaciones === undefined ? '' : String(r.numHabitaciones)} onCambio={(v) => setR({ ...r, numHabitaciones: v === '' ? undefined : Number(v) })} marca="opcional" />
      </Grupo>
      <Grupo leyenda="Datos internos" ayuda="Solo para tu gestión: no se incluyen en el fichero para el Ministerio.">
        <Entrada id="r-habitacion" etiqueta="Habitación" valor={r.habitacion} onCambio={(v) => setR({ ...r, habitacion: v })} />
        <Selector id="r-canal" etiqueta="Canal de reserva" valor={CANALES.includes(r.canal) ? r.canal : 'Otro'} onCambio={(v) => setR({ ...r, canal: v })} opciones={CANALES.map((c) => ({ valor: c, texto: c }))} />
      </Grupo>
      <Grupo leyenda="Pago">
        <Selector
          {...p('pago.tipoPago')}
          valor={r.pago.tipoPago}
          onCambio={(v) => setR({ ...r, pago: { ...r.pago, tipoPago: v as Reserva['pago']['tipoPago'] } })}
          opciones={tiposPago}
          vacio="Elige una opción"
          obligatorio
          pista={
            <Pista titulo="¿Qué forma de pago elijo?">
              <p>
                Cómo se paga la estancia. Las opciones son exactamente las de la tabla oficial (apartado 8.7). Si se paga en el alojamiento al llegar, «Pago en destino»; si no sabes aún, la que tengas prevista. Es el único dato del pago que el documento exige (§7.2).
              </p>
            </Pista>
          }
        />
        <Entrada {...p('pago.fechaPago')} tipo="date" valor={r.pago.fechaPago ?? ''} onCambio={(v) => setR({ ...r, pago: { ...r.pago, fechaPago: v || undefined } })} marca="opcional" />
        <Entrada {...p('pago.medioPago')} valor={r.pago.medioPago ?? ''} onCambio={(v) => setR({ ...r, pago: { ...r.pago, medioPago: v || undefined } })} marca="opcional" ayuda="El documento oficial no lo exige. Evita guardar números completos de tarjeta." maxLength={50} />
      </Grupo>
      <div className="acciones">
        <button type="submit" className="primario">
          Guardar reserva
        </button>
        <button type="button" className="secundario" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
