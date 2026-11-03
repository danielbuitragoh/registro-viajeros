import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/AppContext'
import { useRuta } from '../app/ruta'
import type { Establecimiento, Reserva } from '../domain/tipos'
import { fechaPurga } from '../domain/plazos'
import { recordatorioCopia, TOTAL_PASOS } from '../domain/preferencias'
import { importarCodigo, MENSAJE_IMPORTAR } from '../huesped/importar'
import { hoyISO } from '../validators/fechas'
import { estadoParte } from '../validators/reserva'
import { Ajustes, esSeccionAjustes } from './Ajustes'
import { Asistente } from './Asistente'
import { Ayuda } from './Ayuda'
import { ChipEstado } from './Estado'
import { Exportar } from './Exportar'
import { Icono, Logo, type NombreIcono } from './Icono'
import { LectorQr } from './LectorQr'
import { ListaDia } from './ListaDia'
import { Migas } from './Migas'
import { ReservaDetalle } from './ReservaDetalle'
import { ReservaForm, reservaNueva } from './ReservaForm'
import { fechaCorta, fechaHoraCorta } from './formato'

/** Menú principal por frecuencia de uso: lo de cada día primero. */
const ENLACES: { ruta: string; texto: string; icono: NombreIcono }[] = [
  { ruta: '/', texto: 'Hoy', icono: 'hoy' },
  { ruta: '/reservas', texto: 'Reservas', icono: 'reservas' },
  { ruta: '/exportar', texto: 'Exportar', icono: 'exportar' },
  { ruta: '/ajustes', texto: 'Ajustes', icono: 'ajustes' },
  { ruta: '/ayuda', texto: 'Ayuda', icono: 'ayuda' },
]

const SIN_CONFIGURAR: Establecimiento = { codigoEstablecimiento: '', nombre: '(establecimiento sin configurar)', tipo: 'HOSTAL' }
const esDemo = import.meta.env.VITE_DEMO === 'true'

export function Recepcion() {
  const app = useApp()
  const { ruta, ir } = useRuta()
  const ahora = app.ahora()
  const [fecha, setFecha] = useState(() => hoyISO(ahora))
  const [filtro, setFiltro] = useState('')
  const [escaneando, setEscaneando] = useState(false)
  // Mensaje tras una acción. Con `ruta`, se muestra al llegar a esa pantalla y se borra al salir de ella.
  const [aviso, setAvisoEstado] = useState<{ ok: boolean; texto: string; ruta?: string }>()
  const avisoMostrado = useRef(false)
  const setAviso = (a?: { ok: boolean; texto: string; ruta?: string }) => {
    avisoMostrado.current = false
    setAvisoEstado(a)
  }

  // Al cambiar de pantalla: arriba del todo y foco en el contenido (WCAG 2.4.3). Sin esto, en el móvil la reserva
  // abierta desde una fila de abajo se mostraba con el desplazamiento de la lista y su título quedaba fuera de la vista.
  const primeraRuta = useRef(true)
  useEffect(() => {
    if (primeraRuta.current) {
      primeraRuta.current = false
      return
    }
    window.scrollTo(0, 0)
    document.getElementById('contenido')?.focus({ preventScroll: true })
  }, [ruta])

  const activa = (r: string) => (r === '/' ? ruta === '/' : ruta.startsWith(r))
  const partes = ruta.split('/').filter(Boolean)
  const reservaId = partes[0] === 'reservas' && partes[1] && partes[1] !== 'nueva' ? partes[1] : undefined
  const reserva = reservaId ? app.reservas.find((r) => r.id === reservaId) : undefined
  const enAjustes = partes[0] === 'ajustes'
  const seccionAjustes = enAjustes && esSeccionAjustes(partes[1]) ? partes[1] : undefined

  async function leido(codigo: string) {
    const r = await importarCodigo(app.reservas, codigo, new Date().toISOString())
    if (!r.ok) return setAviso({ ok: false, texto: MENSAJE_IMPORTAR[r.error] })
    await app.guardarReserva(r.reserva)
    setEscaneando(false)
    setAviso({ ok: true, ruta: `/reservas/${r.reserva.id}`, texto: `Se ${r.importadas === 1 ? 'ha importado 1 ficha' : `han importado ${r.importadas} fichas`} en la reserva ${r.reserva.referencia}. Revisa los avisos de cada viajero (p. ej. el código INE del municipio).` })
    ir(`/reservas/${r.reserva.id}`)
  }

  useEffect(() => {
    if (!aviso) return
    if (ruta === (aviso.ruta ?? ruta)) avisoMostrado.current = true
    else if (avisoMostrado.current) {
      avisoMostrado.current = false
      setAvisoEstado(undefined)
    }
  }, [ruta, aviso])
  const verAviso = aviso && ruta === (aviso.ruta ?? ruta)

  const asistente = app.preferencias.asistente
  const asistentePendiente = asistente && !asistente.terminado && !asistente.saltado
  const copia = recordatorioCopia(app.preferencias.copias, ahora, app.reservas.filter((r) => !r.prueba).length)

  return (
    <>
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      {esDemo && (
        <p className="banner-demo" role="note">
          DEMO con datos ficticios · Nada sale de tu navegador · Contraseña de la demo: <code>demo-hostal-2026</code>
        </p>
      )}
      <header className="cabecera">
        <div className="cabecera-dentro">
          <p className="marca-app">
            <Logo />
            <span>
              Registro de viajeros <span className="solo-lectores">—</span>
              <br />
              <span className="nombre-estab">{app.establecimiento?.nombre ?? 'Establecimiento sin configurar'}</span>
            </span>
          </p>
          <nav aria-label="Principal" className="nav-principal">
            <ul className="nav">
              {ENLACES.map((e) => (
                <li key={e.ruta}>
                  <a href={`#${e.ruta}`} aria-current={activa(e.ruta) ? 'page' : undefined}>
                    <Icono nombre={e.icono} />
                    {e.texto}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <button type="button" className="discreto bloquear" onClick={app.bloquear}>
            <Icono nombre="candado" />
            Bloquear
          </button>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        {!app.establecimiento && seccionAjustes !== 'establecimiento' && ruta !== '/primeros-pasos' && (
          <p className="aviso-plazo aviso-plazo-proximo" role="status">
            <strong>Configura tu establecimiento</strong> (nombre y código) en <a href="#/ajustes/establecimiento">Ajustes → Establecimiento</a> antes de generar enlaces o exportar.
          </p>
        )}
        {aviso && verAviso && (
          <p role={aviso.ok ? 'status' : 'alert'} className={`mensaje ${aviso.ok ? 'mensaje-ok' : 'mensaje-error'}`}>
            <span aria-hidden="true">{aviso.ok ? '✔ ' : '✖ '}</span>
            {aviso.texto}
          </p>
        )}

        {ruta === '/' && (
          <>
            {app.purga && app.purga.eliminadas.length > 0 && (
              <p className="mensaje mensaje-ok" role="status">
                Se {app.purga.eliminadas.length === 1 ? 'ha eliminado 1 reserva' : `han eliminado ${app.purga.eliminadas.length} reservas`} con más de 3 años desde su salida.
              </p>
            )}
            {app.purga && app.purga.conAviso.length > 0 && (
              <p className="ayuda" role="status">
                <Icono nombre="aviso" /> {app.purga.conAviso.length} {app.purga.conAviso.length === 1 ? 'reserva cumple' : 'reservas cumplen'} 3 años pronto (la primera, el {app.purga.proximaPurga ? fechaCorta(app.purga.proximaPurga) : ''}) y se eliminará automáticamente. <a href="#/ajustes/conservacion">Ver cuáles</a>.
              </p>
            )}
            {asistentePendiente && (
              <div className="tarjeta tarjeta-info">
                <p>
                  <Icono nombre="bandera" /> <strong>Te quedan pasos de la puesta en marcha.</strong> El asistente te guía con una reserva de prueba.
                </p>
                <div className="acciones">
                  <button type="button" className="primario" onClick={() => ir('/primeros-pasos')}>
                    {`Continuar los primeros pasos (paso ${Math.max(asistente.paso, 2)} de ${TOTAL_PASOS})`}
                  </button>
                </div>
              </div>
            )}
            {copia && (
              <p className="tarjeta tarjeta-aviso recordatorio-copia" role="status">
                <Icono nombre="copia" />{' '}
                {copia.tipo === 'nunca' ? <strong>Todavía no has hecho ninguna copia de seguridad.</strong> : <strong>{`Hace ${copia.dias} días de tu última copia de seguridad.`}</strong>} Los datos solo están en este dispositivo. <a href="#/ajustes/copias">Hacer una copia ahora</a>
              </p>
            )}
            {escaneando && (
              <section className="tarjeta" aria-labelledby="t-escanear">
                <h2 id="t-escanear">Escanear el QR de un huésped</h2>
                <p className="ayuda">La app reconoce sola a qué reserva pertenece el código y añade las fichas.</p>
                <LectorQr onLeido={leido} />
                <PegarCodigo onImportar={leido} />
                <div className="acciones">
                  <button type="button" className="secundario" onClick={() => setEscaneando(false)}>
                    Cerrar el escáner
                  </button>
                </div>
              </section>
            )}
            <ListaDia
              reservas={app.reservas}
              fecha={fecha}
              ahora={ahora}
              onFecha={setFecha}
              onAbrir={(id) => ir(`/reservas/${id}`)}
              onNueva={() => ir('/reservas/nueva')}
              onEscanear={() => {
                setAviso(undefined)
                setEscaneando(true)
              }}
              onExportar={() => ir('/exportar')}
            />
          </>
        )}

        {ruta === '/reservas' && <TodasLasReservas reservas={app.reservas} filtro={filtro} onFiltro={setFiltro} onAbrir={(id) => ir(`/reservas/${id}`)} onNueva={() => ir('/reservas/nueva')} />}

        {ruta === '/reservas/nueva' && (
          <section aria-labelledby="t-nueva">
            <Migas items={[{ texto: 'Reservas', ruta: '/reservas' }, { texto: 'Nueva reserva' }]} />
            <h1 id="t-nueva">Nueva reserva</h1>
            <ReservaForm
              inicial={reservaNueva(ahora)}
              ahora={ahora}
              onGuardar={async (r) => {
                await app.guardarReserva(r)
                ir(`/reservas/${r.id}`)
              }}
              onCancelar={() => ir('/')}
            />
          </section>
        )}

        {reservaId && !reserva && (
          <p role="alert">
            No se encuentra la reserva. <a href="#/reservas">Ver todas</a>
          </p>
        )}
        {reserva && (
          <ReservaDetalle
            reserva={reserva}
            establecimiento={app.establecimiento ?? SIN_CONFIGURAR}
            ahora={ahora}
            onGuardar={app.guardarReserva}
            onBorrar={async (id) => {
              await app.borrarReserva(id)
              ir('/')
            }}
            onVolver={() => ir('/')}
            onExportar={() => ir('/exportar')}
          />
        )}

        {ruta === '/exportar' && (
          <Exportar
            reservas={app.reservas}
            establecimiento={app.establecimiento}
            ahora={ahora}
            onIrAjustes={() => ir('/ajustes/establecimiento')}
            onExportadas={async (ids, cuando) => {
              for (const r of app.reservas.filter((x) => ids.includes(x.id))) await app.guardarReserva({ ...r, exportadaEn: cuando, modificadaEn: r.modificadaEn })
            }}
          />
        )}

        {enAjustes && <Ajustes key={seccionAjustes ?? 'indice'} seccion={seccionAjustes} />}
        {ruta === '/ayuda' && <Ayuda />}
        {ruta === '/primeros-pasos' && (
          <Asistente
            onSalir={(texto) => {
              setAviso({ ok: true, texto, ruta: '/' })
              ir('/')
            }}
            onAbrirReserva={(id) => ir(`/reservas/${id}`)}
          />
        )}
      </main>

      <footer className="pie">
        <p>
          Herramienta <strong>no oficial</strong>, sin afiliación con el Ministerio del Interior. El establecimiento es el responsable de comunicar los datos a tiempo y de su exactitud. Datos cifrados y guardados solo en este dispositivo.
        </p>
      </footer>
    </>
  )
}

function PegarCodigo({ onImportar }: { onImportar: (c: string) => void }) {
  const [codigo, setCodigo] = useState('')
  return (
    <>
      <div className="campo">
        <label htmlFor="codigo-hoy">O pega aquí el código que te ha enviado (empieza por RV1.)</label>
        <textarea id="codigo-hoy" rows={3} value={codigo} onChange={(e) => setCodigo(e.target.value)} spellCheck={false} autoComplete="off" />
      </div>
      <div className="acciones">
        <button type="button" className="secundario" disabled={codigo.trim() === ''} onClick={() => onImportar(codigo)}>
          Importar fichas
        </button>
      </div>
    </>
  )
}

function TodasLasReservas({ reservas, filtro, onFiltro, onAbrir, onNueva }: { reservas: Reserva[]; filtro: string; onFiltro: (f: string) => void; onAbrir: (id: string) => void; onNueva: () => void }) {
  const q = filtro.trim().toLowerCase()
  const lista = [...reservas]
    .sort((a, b) => b.entrada.localeCompare(a.entrada))
    .filter((r) => !q || [r.referencia, r.habitacion, ...r.viajeros.map((v) => `${v.nombre} ${v.apellido1} ${v.apellido2 ?? ''}`)].join(' ').toLowerCase().includes(q))
  return (
    <section aria-labelledby="t-reservas">
      <h1 id="t-reservas">Reservas</h1>
      {reservas.length === 0 ? (
        <div className="vacio">
          <Icono nombre="reservas" />
          <p>
            <strong>Todavía no hay reservas.</strong>
          </p>
          <p>Crea una por cada estancia: referencia, fechas y número de personas. Después envía el enlace al huésped para que rellene su ficha.</p>
          <div className="acciones">
            <button type="button" className="primario" onClick={onNueva}>
              <Icono nombre="mas" />
              Crear la primera reserva
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="barra-herramientas">
            <div className="campo campo-corto">
              <label htmlFor="filtro">Buscar (referencia, habitación o nombre)</label>
              <input id="filtro" type="search" value={filtro} onChange={(e) => onFiltro(e.target.value)} autoComplete="off" />
            </div>
            <button type="button" className="primario" onClick={onNueva}>
              <Icono nombre="mas" />
              Nueva reserva
            </button>
          </div>
          <p aria-live="polite">
            {lista.length} {lista.length === 1 ? 'reserva' : 'reservas'}
          </p>
          {lista.length === 0 && <p>Ninguna reserva coincide con «{filtro}». Prueba con otra referencia, habitación o nombre.</p>}
          <ul className="lista-tarjetas">
            {lista.map((r) => (
              <li key={r.id} className="tarjeta tarjeta-reserva">
                <p className="cabeza">
                  <span className="quien">{r.referencia}</span> <ChipEstado estado={estadoParte(r)} />
                  {r.prueba && <span className="chip chip-prueba">Prueba</span>}
                </p>
                <p className="detalle">
                  Entrada {fechaHoraCorta(r.entrada)} · Hab. {r.habitacion || '—'} · {r.viajeros.length}/{r.numPersonas} fichas · se conserva hasta {fechaCorta(fechaPurga(r.salida))}
                </p>
                <button type="button" className="secundario accion" onClick={() => onAbrir(r.id)}>
                  Abrir<span className="solo-lectores"> reserva {r.referencia}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
