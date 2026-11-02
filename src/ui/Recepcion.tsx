import { useState } from 'react'
import { useApp } from '../app/AppContext'
import { useRuta } from '../app/ruta'
import type { Establecimiento, Reserva } from '../domain/tipos'
import { fechaPurga } from '../domain/plazos'
import { hoyISO } from '../validators/fechas'
import { estadoParte } from '../validators/reserva'
import { Ajustes } from './Ajustes'
import { ChipEstado } from './Estado'
import { Exportar } from './Exportar'
import { ListaDia } from './ListaDia'
import { ReservaDetalle } from './ReservaDetalle'
import { ReservaForm, reservaNueva } from './ReservaForm'
import { fechaCorta, fechaHoraCorta } from './formato'

const ENLACES = [
  { ruta: '/', texto: 'Hoy' },
  { ruta: '/reservas', texto: 'Reservas' },
  { ruta: '/exportar', texto: 'Exportar' },
  { ruta: '/ajustes', texto: 'Ajustes' },
]

const SIN_CONFIGURAR: Establecimiento = { codigoEstablecimiento: '', nombre: '(establecimiento sin configurar)', tipo: 'HOSTAL' }
const esDemo = import.meta.env.VITE_DEMO === 'true'

export function Recepcion() {
  const app = useApp()
  const { ruta, ir } = useRuta()
  const ahora = app.ahora()
  const [fecha, setFecha] = useState(() => hoyISO(ahora))
  const [filtro, setFiltro] = useState('')

  const activa = (r: string) => (r === '/' ? ruta === '/' : ruta.startsWith(r))
  const partes = ruta.split('/').filter(Boolean)
  const reservaId = partes[0] === 'reservas' && partes[1] && partes[1] !== 'nueva' ? partes[1] : undefined
  const reserva = reservaId ? app.reservas.find((r) => r.id === reservaId) : undefined

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
        <p className="marca-app">
          Registro de viajeros <span className="solo-lectores">—</span> <span className="nombre-estab">{app.establecimiento?.nombre ?? ''}</span>
        </p>
        <nav aria-label="Principal">
          <ul className="nav">
            {ENLACES.map((e) => (
              <li key={e.ruta}>
                <a href={`#${e.ruta}`} aria-current={activa(e.ruta) ? 'page' : undefined}>
                  {e.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className="secundario" onClick={app.bloquear}>
          Bloquear
        </button>
      </header>

      <main id="contenido" tabIndex={-1}>
        {!app.establecimiento && ruta !== '/ajustes' && (
          <p className="aviso-plazo aviso-plazo-proximo" role="status">
            <strong>Configura tu establecimiento</strong> (nombre y código) en{' '}
            <a href="#/ajustes">Ajustes</a> antes de generar enlaces o exportar.
          </p>
        )}
        {app.purga && app.purga.eliminadas.length > 0 && (
          <p className="mensaje mensaje-ok" role="status">
            Se {app.purga.eliminadas.length === 1 ? 'ha eliminado 1 reserva' : `han eliminado ${app.purga.eliminadas.length} reservas`} con más de 3 años desde su salida.
          </p>
        )}
        {app.purga && app.purga.conAviso.length > 0 && ruta !== '/ajustes' && (
          <p className="aviso-plazo aviso-plazo-proximo" role="status">
            <strong>Aviso de purga:</strong> {app.purga.conAviso.length} {app.purga.conAviso.length === 1 ? 'reserva cumple' : 'reservas cumplen'} 3 años pronto (la primera, el {app.purga.proximaPurga ? fechaCorta(app.purga.proximaPurga) : ''}) y se eliminarán automáticamente. Más información en <a href="#/ajustes">Ajustes</a>.
          </p>
        )}

        {ruta === '/' && <ListaDia reservas={app.reservas} fecha={fecha} ahora={ahora} onFecha={setFecha} onAbrir={(id) => ir(`/reservas/${id}`)} onNueva={() => ir('/reservas/nueva')} />}

        {ruta === '/reservas' && <TodasLasReservas reservas={app.reservas} filtro={filtro} onFiltro={setFiltro} onAbrir={(id) => ir(`/reservas/${id}`)} onNueva={() => ir('/reservas/nueva')} />}

        {ruta === '/reservas/nueva' && (
          <section aria-labelledby="t-nueva">
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
          <ReservaDetalle reserva={reserva} establecimiento={app.establecimiento ?? SIN_CONFIGURAR} ahora={ahora} onGuardar={app.guardarReserva} onBorrar={async (id) => { await app.borrarReserva(id); ir('/') }} onVolver={() => ir('/')} />
        )}

        {ruta === '/exportar' && (
          <Exportar
            reservas={app.reservas}
            establecimiento={app.establecimiento}
            ahora={ahora}
            onIrAjustes={() => ir('/ajustes')}
            onExportadas={async (ids, cuando) => {
              for (const r of app.reservas.filter((x) => ids.includes(x.id))) await app.guardarReserva({ ...r, exportadaEn: cuando, modificadaEn: r.modificadaEn })
            }}
          />
        )}

        {ruta === '/ajustes' && <Ajustes />}
      </main>

      <footer className="pie">
        <p>
          Herramienta <strong>no oficial</strong>, sin afiliación con el Ministerio del Interior. El establecimiento es el responsable de comunicar los datos a tiempo y de su exactitud. Datos cifrados y guardados solo en este dispositivo.
        </p>
      </footer>
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
      <div className="barra-herramientas">
        <div className="campo campo-corto">
          <label htmlFor="filtro">Buscar (referencia, habitación o nombre)</label>
          <input id="filtro" type="search" value={filtro} onChange={(e) => onFiltro(e.target.value)} autoComplete="off" />
        </div>
        <button type="button" className="primario" onClick={onNueva}>
          Nueva reserva
        </button>
      </div>
      <p aria-live="polite">{lista.length} {lista.length === 1 ? 'reserva' : 'reservas'}</p>
      <ul className="lista-tarjetas">
        {lista.map((r) => (
          <li key={r.id} className="tarjeta">
            <p className="nombre-viajero">
              {r.referencia} <ChipEstado estado={estadoParte(r)} />
            </p>
            <p>
              Entrada {fechaHoraCorta(r.entrada)} · Hab. {r.habitacion || '—'} · {r.viajeros.length}/{r.numPersonas} fichas · se conserva hasta {fechaCorta(fechaPurga(r.salida))}
            </p>
            <button type="button" className="secundario" onClick={() => onAbrir(r.id)}>
              Abrir<span className="solo-lectores"> reserva {r.referencia}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
