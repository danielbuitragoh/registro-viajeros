import { useMemo } from 'react'
import type { Reserva } from '../domain/tipos'
import { plazo24h } from '../domain/plazos'
import { siguientePaso, textoSiguientePaso } from '../domain/siguientePaso'
import { estadoParte } from '../validators/reserva'
import { hoyISO, soloFecha } from '../validators/fechas'
import { ChipEstado, TextoPlazo } from './Estado'
import { Icono } from './Icono'
import { fechaCorta } from './formato'

export interface ListaDiaProps {
  reservas: Reserva[]
  /** AAAA-MM-DD */
  fecha: string
  ahora: Date
  onFecha: (f: string) => void
  onAbrir: (id: string) => void
  onNueva: () => void
  /** Atajo: escanear el QR de un huésped (reconoce sola la reserva). */
  onEscanear?: () => void
  /** Atajo: ir a Exportar. */
  onExportar?: () => void
}

const nombrePrincipal = (r: Reserva) => {
  const v = r.viajeros.find((x) => x.esTitular) ?? r.viajeros[0]
  return v ? `${v.nombre} ${v.apellido1}`.trim() : 'Sin fichas todavía'
}

/** Orden total y estable (hora de entrada, referencia, id): no depende del orden en que llegan los datos. */
export const compararReservas = (a: Reserva, b: Reserva) =>
  a.entrada.localeCompare(b.entrada) || a.referencia.localeCompare(b.referencia, 'es') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

interface Fila {
  r: Reserva
  estado: ReturnType<typeof estadoParte>
  plazo: ReturnType<typeof plazo24h>
}

export function ListaDia({ reservas, fecha, ahora, onFecha, onAbrir, onNueva, onEscanear, onExportar }: ListaDiaProps) {
  const filas = useMemo<Fila[]>(
    () => reservas.map((r) => ({ r, estado: estadoParte(r), plazo: plazo24h(r.entrada, ahora) })).sort((a, b) => compararReservas(a.r, b.r)),
    [reservas, ahora],
  )
  const delDia = filas.filter((f) => soloFecha(f.r.entrada) === fecha)
  const anteriores = filas.filter((f) => soloFecha(f.r.entrada) < fecha && f.estado !== 'exportado')

  // Aviso de 24 h sobre TODAS las reservas sin exportar (da igual el día)
  const sinExportar = filas.filter((f) => f.estado !== 'exportado' && soloFecha(f.r.entrada) <= hoyISO(ahora))
  const vencidos = sinExportar.filter((f) => f.plazo.estado === 'vencido')
  const proximos = sinExportar.filter((f) => f.plazo.estado === 'proximo')
  const listos = filas.filter((f) => f.estado === 'completo' && !f.r.prueba).length

  const cuenta = (e: string) => delDia.filter((f) => f.estado === e).length
  const esHoy = fecha === hoyISO(ahora)

  return (
    <section aria-labelledby="t-hoy">
      <h1 id="t-hoy">Lista del día</h1>

      <nav aria-label="Atajos" className="atajos">
        <button type="button" className="primario" onClick={onNueva}>
          <Icono nombre="mas" />
          Nueva reserva
        </button>
        {onEscanear && (
          <button type="button" className="secundario" onClick={onEscanear}>
            <Icono nombre="qr" />
            Escanear el QR de un huésped
          </button>
        )}
        {onExportar && listos > 0 && (
          <button type="button" className="secundario" onClick={onExportar}>
            <Icono nombre="exportar" />
            {`Exportar ${listos} ${listos === 1 ? 'parte listo' : 'partes listos'}`}
          </button>
        )}
      </nav>

      {(vencidos.length > 0 || proximos.length > 0) && (
        <div className={`aviso-plazo ${vencidos.length > 0 ? 'aviso-plazo-vencido' : 'aviso-plazo-proximo'}`} role="status">
          <strong>
            <span aria-hidden="true">{vencidos.length > 0 ? '⛔ ' : '⚠ '}</span>Aviso de las 24 h
          </strong>
          <ul>
            {vencidos.length > 0 && (
              <li>
                {vencidos.length} {vencidos.length === 1 ? 'parte sin exportar ha superado' : 'partes sin exportar han superado'} el plazo de 24 h desde la entrada: <EnlacesReservas filas={vencidos} onAbrir={onAbrir} />
              </li>
            )}
            {proximos.length > 0 && (
              <li>
                {proximos.length} {proximos.length === 1 ? 'parte vence' : 'partes vencen'} en menos de 6 h: <EnlacesReservas filas={proximos} onAbrir={onAbrir} />
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="barra-herramientas">
        <div className="campo campo-corto">
          <label htmlFor="fecha-lista">Día</label>
          <input id="fecha-lista" type="date" value={fecha} onChange={(e) => e.target.value && onFecha(e.target.value)} />
        </div>
        {!esHoy && (
          <button type="button" className="secundario" onClick={() => onFecha(hoyISO(ahora))}>
            Volver a hoy
          </button>
        )}
      </div>

      <p className="resumen-dia" aria-live="polite">
        {fechaCorta(fecha)}: {delDia.length} {delDia.length === 1 ? 'entrada' : 'entradas'} · {cuenta('pendiente')} pendientes · {cuenta('completo')} completas · {cuenta('exportado')} exportadas
      </p>

      {delDia.length === 0 ? (
        <div className="vacio">
          <Icono nombre="hoy" />
          <p>
            <strong>No hay entradas previstas este día.</strong>
          </p>
          <p>Cuando llegue alguien, crea su reserva y envíale el enlace para que rellene su ficha.</p>
          <div className="acciones">
            <button type="button" className="secundario" onClick={onNueva}>
              <Icono nombre="mas" />
              Crear una reserva para este día
            </button>
          </div>
          {reservas.length === 0 && (
            <p>
              ¿Es la primera vez? <a href="#/primeros-pasos">Sigue los primeros pasos</a> o lee la <a href="#/ayuda">Ayuda</a>.
            </p>
          )}
        </div>
      ) : (
        <ListaTarjetas titulo="Entradas del día" filas={delDia} onAbrir={onAbrir} />
      )}

      {anteriores.length > 0 && (
        <>
          <h2>Pendientes de días anteriores</h2>
          <ListaTarjetas titulo="Reservas de días anteriores sin exportar" filas={anteriores} onAbrir={onAbrir} mostrarDia />
        </>
      )}
    </section>
  )
}

function EnlacesReservas({ filas, onAbrir }: { filas: Fila[]; onAbrir: (id: string) => void }) {
  return (
    <>
      {filas.map((f, i) => (
        <span key={f.r.id}>
          {i > 0 && ', '}
          <button type="button" className="enlace" onClick={() => onAbrir(f.r.id)}>
            {f.r.referencia || 'sin referencia'}
            {f.r.habitacion ? ` (hab. ${f.r.habitacion})` : ''}
          </button>
        </span>
      ))}
    </>
  )
}

const horaDe = (r: Reserva, mostrarDia?: boolean) =>
  mostrarDia ? new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(r.entrada)) : r.entrada.slice(11, 16)

function ListaTarjetas({ titulo, filas, onAbrir, mostrarDia }: { titulo: string; filas: Fila[]; onAbrir: (id: string) => void; mostrarDia?: boolean }) {
  return (
    <ul className="lista-tarjetas" aria-label={titulo}>
      {filas.map(({ r, estado, plazo }) => {
        const urgencia = estado === 'exportado' ? '' : plazo.estado === 'vencido' ? ' tarjeta-reserva-vencida' : plazo.estado === 'proximo' ? ' tarjeta-reserva-proxima' : ''
        return (
          <li key={r.id} className={`tarjeta tarjeta-reserva${urgencia}`}>
            <p className="cabeza">
              <span className="quien">{nombrePrincipal(r)}</span>
              {r.prueba && <span className="chip chip-prueba">Prueba</span>}
            </p>
            <p className="detalle">
              {horaDe(r, mostrarDia)} · Hab. {r.habitacion || '—'} · {r.viajeros.length}/{r.numPersonas} fichas · Ref. {r.referencia || '—'}
            </p>
            <p className="estado">
              <ChipEstado estado={estado} />
              <TextoPlazo plazo={plazo} exportado={estado === 'exportado'} />
              <span className="paso">Siguiente paso: {textoSiguientePaso(siguientePaso(r))}</span>
            </p>
            <button type="button" className="secundario accion" onClick={() => onAbrir(r.id)}>
              Abrir<span className="solo-lectores"> reserva {r.referencia}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
