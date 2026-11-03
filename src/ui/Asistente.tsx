import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import type { Establecimiento, Reserva } from '../domain/tipos'
import { TOTAL_PASOS, viajeroEjemplo, type Preferencias } from '../domain/preferencias'
import { PasosAsistente } from './PasosAsistente'
import { generarFichero, type ResultadoExportacion } from '../exportador'
import { etiquetaCampo, mensajeIncidencia } from '../i18n/mensajes'
import { TIPO_ESTABLECIMIENTO } from '../oficial/codigos'
import { alfa3Espana } from '../oficial/paises'
import { hoyISO } from '../validators/fechas'
import { DescargarCopia, FrecuenciaCopia, PistaCodigoEstablecimiento, validarAjustesEstablecimiento } from './Ajustes'
import { Entrada, Selector } from './campos'
import { EnlaceHuesped } from './EnlaceHuesped'
import { Icono } from './Icono'
import { ReservaForm, reservaNueva } from './ReservaForm'
import { nuevoId } from './formato'

const TITULOS: Record<number, string> = {
  2: 'Datos del establecimiento',
  3: 'Reserva de prueba',
  4: 'Enviar el enlace a un huésped',
  5: 'Generar el primer fichero',
  6: 'Copia de seguridad',
}

/** Reserva de prueba: hoy a las 14:00, salida mañana a las 11:00, 1 persona. */
function reservaDePrueba(ahora: Date): Reserva {
  const r = reservaNueva(ahora)
  const manana = new Date(`${hoyISO(ahora)}T12:00:00`)
  manana.setDate(manana.getDate() + 1)
  return { ...r, referencia: 'PRUEBA-1', salida: `${hoyISO(manana)}T11:00`, habitacion: 'Prueba', prueba: true }
}

export interface AsistenteProps {
  /** Al terminar o saltar: vuelve a «Hoy» con un mensaje. */
  onSalir: (mensaje: string) => void
  onAbrirReserva: (id: string) => void
}

/**
 * Asistente de primeros pasos (el paso 1, la contraseña, es la pantalla de acceso). Guarda el paso en las preferencias
 * cifradas: se puede salir, saltar y retomar desde Ajustes → Primeros pasos.
 */
export function Asistente({ onSalir, onAbrirReserva }: AsistenteProps) {
  const app = useApp()
  const prefs = app.preferencias
  const asistente = prefs.asistente ?? { paso: 2 }
  // Si ya se terminó, al volver se empieza por el paso 2 (repaso)
  const [paso, setPasoLocal] = useState(() => (asistente.terminado ? 2 : Math.min(Math.max(asistente.paso, 2), TOTAL_PASOS)))
  const titulo = useRef<HTMLHeadingElement>(null)
  const prueba = app.reservas.find((r) => r.id === asistente.reservaPruebaId)

  const guardar = (p: Partial<NonNullable<Preferencias['asistente']>>) => app.guardarPreferencias({ ...app.preferencias, asistente: { ...asistente, paso, ...p } })
  async function ir(n: number) {
    setPasoLocal(n)
    await guardar({ paso: n })
  }

  const primera = useRef(true)
  useEffect(() => {
    if (primera.current) {
      primera.current = false
      return
    }
    titulo.current?.focus()
  }, [paso])

  async function saltar() {
    await guardar({ saltado: true })
    onSalir('Has saltado los primeros pasos. Puedes retomarlos cuando quieras en Ajustes → Primeros pasos, o leer la Ayuda.')
  }

  return (
    <section aria-labelledby="t-asistente">
      <h1 id="t-asistente">Primeros pasos</h1>
      <PasosAsistente actual={paso} />
      <h2 id="t-paso" ref={titulo} tabIndex={-1}>
        {TITULOS[paso]}
      </h2>

      {paso === 2 && <PasoEstablecimiento onHecho={() => ir(3)} />}
      {paso === 3 && (
        <PasoReserva
          prueba={prueba}
          onGuardada={async (r) => {
            // Primero se guarda todo; después se avanza (si no, el paso 4 se pintaría un instante sin la reserva)
            await app.guardarReserva(r)
            await app.guardarPreferencias({ ...app.preferencias, asistente: { ...asistente, paso: 4, reservaPruebaId: r.id } })
            setPasoLocal(4)
          }}
          onCancelar={() => ir(2)}
        />
      )}
      {paso === 4 && <PasoEnlace prueba={prueba} onIrPaso={ir} />}
      {paso === 5 && <PasoFichero prueba={prueba} establecimiento={app.establecimiento} onAbrirReserva={onAbrirReserva} />}
      {paso === 6 && (
        <PasoCopia
          prueba={prueba}
          onTerminar={async (borrarPrueba) => {
            if (borrarPrueba && prueba) await app.borrarReserva(prueba.id)
            await app.guardarPreferencias({ ...app.preferencias, asistente: { paso: TOTAL_PASOS, terminado: true } })
            onSalir('Todo listo. Ya puedes trabajar con reservas reales: empieza por «Nueva reserva». Si dudas, mira la Ayuda.')
          }}
        />
      )}

      <div className="asistente-pie">
        <div className="acciones">
          {paso > 2 && (
            <button type="button" className="secundario" onClick={() => ir(paso - 1)}>
              <Icono nombre="atras" />
              Atrás
            </button>
          )}
          {(paso === 4 || paso === 5 || (paso === 3 && prueba)) && (
            <button type="button" className="primario" onClick={() => ir(paso + 1)}>
              Siguiente
              <Icono nombre="adelante" />
            </button>
          )}
        </div>
        <button type="button" className="enlace" onClick={saltar}>
          Saltar los primeros pasos
        </button>
      </div>
    </section>
  )
}

function PasoEstablecimiento({ onHecho }: { onHecho: () => void }) {
  const app = useApp()
  const [e, setE] = useState<Establecimiento>(app.establecimiento ?? { codigoEstablecimiento: '', nombre: '', tipo: 'HOSTAL', direccion: { direccion: '', codigoPostal: '', pais: alfa3Espana } })
  const [intentado, setIntentado] = useState(false)
  const inc = useMemo(() => validarAjustesEstablecimiento(e).filter((i) => ['nombre_establecimiento', 'codigoEstablecimiento'].includes(i.campo)), [e])
  const error = (c: string) => {
    const i = inc.find((x) => x.campo === c)
    return intentado && i ? mensajeIncidencia(i, 'es') : undefined
  }
  async function guardar(ev: React.FormEvent) {
    ev.preventDefault()
    setIntentado(true)
    if (inc.some((i) => i.gravedad === 'error')) return
    await app.guardarEstablecimiento({ ...e, nombre: e.nombre.trim(), codigoEstablecimiento: e.codigoEstablecimiento.trim() })
    onHecho()
  }
  return (
    <form onSubmit={guardar} noValidate aria-labelledby="t-paso">
      <p>Lo justo para empezar. La dirección y el resto de datos puedes completarlos después en Ajustes → Establecimiento.</p>
      <Entrada id="a-nombre" etiqueta={etiquetaCampo('nombre_establecimiento', 'es')} valor={e.nombre} onCambio={(v) => setE({ ...e, nombre: v })} error={error('nombre_establecimiento')} obligatorio ayuda="El nombre con el que lo conocen tus huéspedes; sale en el enlace que les envías." />
      <Selector id="a-tipo" etiqueta={etiquetaCampo('tipo', 'es')} valor={e.tipo} onCambio={(v) => setE({ ...e, tipo: v as Establecimiento['tipo'] })} opciones={Object.entries(TIPO_ESTABLECIMIENTO).map(([k, x]) => ({ valor: k, texto: x.es }))} ayuda="Los tipos son los de la tabla oficial (apartado 8.6)." />
      <Entrada
        id="a-codigo"
        etiqueta="Código de establecimiento"
        valor={e.codigoEstablecimiento}
        onCambio={(v) => setE({ ...e, codigoEstablecimiento: v })}
        error={error('codigoEstablecimiento')}
        maxLength={10}
        mayusculas
        marca="si aún no lo tienes, déjalo en blanco"
        ayuda="Hasta 10 caracteres."
        pista={<PistaCodigoEstablecimiento />}
      />
      <div className="acciones">
        <button type="submit" className="primario grande">
          Guardar y seguir
          <Icono nombre="adelante" />
        </button>
      </div>
    </form>
  )
}

function PasoReserva({ prueba, onGuardada, onCancelar }: { prueba?: Reserva; onGuardada: (r: Reserva) => Promise<void>; onCancelar: () => void }) {
  const app = useApp()
  const inicial = useMemo(() => prueba ?? reservaDePrueba(app.ahora()), [prueba, app])
  return (
    <>
      <p>
        Practica con una reserva <strong>de prueba</strong>: lleva la marca «Prueba», no se preselecciona al exportar y al terminar te ofrezco borrarla. Ya está rellena; mira cada campo y pulsa <strong>Guardar reserva</strong>.
      </p>
      <ul>
        <li>
          <strong>Referencia:</strong> el número de la reserva (de Booking, de tu libreta…).
        </li>
        <li>
          <strong>Entrada:</strong> desde esa hora cuentan las 24 h para comunicar el parte.
        </li>
        <li>
          <strong>Nº de personas:</strong> cuántas fichas esperas recibir.
        </li>
      </ul>
      <ReservaForm inicial={inicial} ahora={app.ahora()} onGuardar={(r) => void onGuardada({ ...r, prueba: true })} onCancelar={onCancelar} />
    </>
  )
}

function SinPrueba({ onIrPaso }: { onIrPaso: (n: number) => void }) {
  return (
    <div className="vacio">
      <p>
        <strong>No hay reserva de prueba.</strong>
      </p>
      <div className="acciones">
        <button type="button" className="secundario" onClick={() => onIrPaso(3)}>
          Crear la reserva de prueba
        </button>
      </div>
    </div>
  )
}

function PasoEnlace({ prueba, onIrPaso }: { prueba?: Reserva; onIrPaso: (n: number) => void }) {
  const app = useApp()
  if (!prueba) return <SinPrueba onIrPaso={onIrPaso} />
  return (
    <>
      <p>
        Así recibes los datos sin teclearlos: creas un <strong>enlace</strong> y se lo envías al huésped por WhatsApp o correo (o le enseñas el QR). Él rellena su ficha en su móvil, en su idioma, y te enseña un QR que escaneas aquí.
      </p>
      <p>
        <strong>Pruébalo:</strong> crea el enlace y ábrelo en tu propio móvil para ver lo que verá el huésped. Si ahora no tienes el móvil a mano, añade un viajero de ejemplo y sigue.
      </p>
      <EnlaceHuesped reserva={prueba} establecimiento={app.establecimiento ?? { codigoEstablecimiento: '', nombre: '(sin nombre)', tipo: 'HOSTAL' }} onGuardar={app.guardarReserva} />
      <h3>Fichas de la reserva de prueba</h3>
      {prueba.viajeros.length === 0 ? (
        <p>Todavía ninguna.</p>
      ) : (
        <ul>
          {prueba.viajeros.map((v) => (
            <li key={v.id}>
              {v.nombre} {v.apellido1}
            </li>
          ))}
        </ul>
      )}
      {prueba.viajeros.length === 0 && (
        <div className="acciones">
          <button type="button" className="secundario" onClick={() => void app.guardarReserva({ ...prueba, viajeros: [viajeroEjemplo(nuevoId())], modificadaEn: new Date().toISOString() })}>
            <Icono nombre="persona" />
            Añadir un viajero de ejemplo (ficticio)
          </button>
        </div>
      )}
    </>
  )
}

function PasoFichero({ prueba, establecimiento, onAbrirReserva }: { prueba?: Reserva; establecimiento?: Establecimiento; onAbrirReserva: (id: string) => void }) {
  const app = useApp()
  const [res, setRes] = useState<ResultadoExportacion>()
  if (!prueba) return <p>No hay reserva de prueba: vuelve atrás para crearla.</p>
  const sinCodigo = !establecimiento?.codigoEstablecimiento.trim()
  function descargar(r: Extract<ResultadoExportacion, { ok: true }>) {
    const url = URL.createObjectURL(new Blob([r.xml], { type: 'application/xml;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `PRUEBA-${r.nombreFichero}`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <>
      <p>
        Cuando un parte está <strong>completo</strong>, en <strong>Exportar</strong> generas el fichero XML que pide SES.Hospedajes. La app lo valida dos veces contra el documento oficial y solo te deja descargarlo si es correcto. <strong>Después, lo subes tú al portal</strong>: la app no envía nada.
      </p>
      {sinCodigo ? (
        <div className="tarjeta tarjeta-aviso" role="note">
          <p>
            <strong>Sin código de establecimiento no se puede generar el fichero de partes de viajeros</strong> (el documento oficial lo exige, §3). Sigue sin problema y pruébalo cuando lo tengas: Ajustes → Establecimiento.
          </p>
        </div>
      ) : (
        <>
          <div className="acciones">
            <button type="button" className="primario" onClick={() => setRes(generarFichero(establecimiento as Establecimiento, [prueba], 'partes', app.ahora()))}>
              <Icono nombre="exportar" />
              Generar el fichero de prueba
            </button>
          </div>
          {res && !res.ok && (
            <div role="alert" className="tarjeta tarjeta-error">
              <p>
                <strong>El fichero no supera la validación</strong> ({res.errores.length} {res.errores.length === 1 ? 'error' : 'errores'}). Así es como te avisa la app de lo que falta:
              </p>
              <ul className="lista-incidencias">
                {res.errores.slice(0, 5).map((e, k) => (
                  <li key={k} className="mensaje-error">
                    {etiquetaCampo(e.campo, 'es')}: {mensajeIncidencia(e, 'es')}
                  </li>
                ))}
              </ul>
              <button type="button" className="secundario" onClick={() => onAbrirReserva(prueba.id)}>
                Abrir la reserva de prueba
              </button>
            </div>
          )}
          {res?.ok && (
            <div role="status" className="tarjeta tarjeta-ok">
              <p>
                <span aria-hidden="true">✔ </span>
                <strong>Fichero validado</strong> contra el documento oficial ({res.reservasIncluidas.length} comunicación).
              </p>
              <p>
                <strong>Es un fichero de prueba con datos ficticios: NO lo subas al portal.</strong> Puedes descargarlo para ver cómo es.
              </p>
              <div className="acciones">
                <button type="button" className="secundario" onClick={() => descargar(res)}>
                  Descargar el fichero de prueba
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function PasoCopia({ prueba, onTerminar }: { prueba?: Reserva; onTerminar: (borrarPrueba: boolean) => Promise<void> }) {
  const [borrar, setBorrar] = useState(true)
  return (
    <>
      <p>
        Tus datos <strong>solo viven en este dispositivo</strong>. Si se estropea o se pierde, o si olvidas la contraseña, la única forma de recuperarlos es una <strong>copia de seguridad</strong>. Haz la primera ahora y guárdala fuera de este equipo (una memoria USB, otro ordenador…).
      </p>
      <DescargarCopia />
      <FrecuenciaCopia />
      {prueba && (
        <div className="campo campo-check">
          <input id="a-borrar-prueba" type="checkbox" checked={borrar} onChange={(e) => setBorrar(e.target.checked)} />
          <label htmlFor="a-borrar-prueba">Borrar la reserva de prueba al terminar</label>
        </div>
      )}
      <div className="acciones">
        <button type="button" className="primario grande" onClick={() => void onTerminar(borrar)}>
          <Icono nombre="hecho" />
          Terminar
        </button>
      </div>
    </>
  )
}
