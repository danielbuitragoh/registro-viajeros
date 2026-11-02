import { useMemo } from 'react'
import type { Reserva } from '../domain/tipos'
import { plazo24h } from '../domain/plazos'
import { estadoParte } from '../validators/reserva'
import { hoyISO, soloFecha } from '../validators/fechas'
import { ChipEstado, TextoPlazo } from './Estado'
import { fechaCorta } from './formato'

export interface ListaDiaProps {
  reservas: Reserva[]
  /** AAAA-MM-DD */
  fecha: string
  ahora: Date
  onFecha: (f: string) => void
  onAbrir: (id: string) => void
  onNueva: () => void
}

const nombrePrincipal = (r: Reserva) => {
  const v = r.viajeros.find((x) => x.esTitular) ?? r.viajeros[0]
  return v ? `${v.nombre} ${v.apellido1}`.trim() : '— sin fichas —'
}

export function ListaDia({ reservas, fecha, ahora, onFecha, onAbrir, onNueva }: ListaDiaProps) {
  const filas = useMemo(
    () =>
      reservas.map((r) => ({ r, estado: estadoParte(r), plazo: plazo24h(r.entrada, ahora) })).sort((a, b) => a.r.entrada.localeCompare(b.r.entrada)),
    [reservas, ahora],
  )
  const delDia = filas.filter((f) => soloFecha(f.r.entrada) === fecha)
  const anteriores = filas.filter((f) => soloFecha(f.r.entrada) < fecha && f.estado !== 'exportado')

  // Aviso de 24 h sobre TODAS las reservas sin exportar (da igual el día)
  const sinExportar = filas.filter((f) => f.estado !== 'exportado' && soloFecha(f.r.entrada) <= hoyISO(ahora))
  const vencidos = sinExportar.filter((f) => f.plazo.estado === 'vencido').length
  const proximos = sinExportar.filter((f) => f.plazo.estado === 'proximo').length

  const cuenta = (e: string) => delDia.filter((f) => f.estado === e).length

  return (
    <section aria-labelledby="t-hoy">
      <h1 id="t-hoy">Lista del día</h1>

      {(vencidos > 0 || proximos > 0) && (
        <div className={`aviso-plazo ${vencidos > 0 ? 'aviso-plazo-vencido' : 'aviso-plazo-proximo'}`} role="status">
          <strong>
            <span aria-hidden="true">{vencidos > 0 ? '⛔ ' : '⚠ '}</span>Aviso de las 24 h
          </strong>
          <ul>
            {vencidos > 0 && (
              <li>
                {vencidos} {vencidos === 1 ? 'parte sin exportar ha superado' : 'partes sin exportar han superado'} el plazo de 24 h desde la entrada.
              </li>
            )}
            {proximos > 0 && (
              <li>
                {proximos} {proximos === 1 ? 'parte vence' : 'partes vencen'} en menos de 6 h.
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
        <button type="button" className="secundario" onClick={() => onFecha(hoyISO(ahora))}>
          Hoy
        </button>
        <button type="button" className="primario" onClick={onNueva}>
          Nueva reserva
        </button>
      </div>

      <p className="resumen-dia" aria-live="polite">
        {fechaCorta(fecha)}: {delDia.length} {delDia.length === 1 ? 'entrada' : 'entradas'} · {cuenta('pendiente')} pendientes · {cuenta('completo')} completas · {cuenta('exportado')} exportadas
      </p>

      <TablaReservas titulo="Entradas del día" filas={delDia} onAbrir={onAbrir} vacio="No hay entradas previstas este día." />

      {anteriores.length > 0 && (
        <>
          <h2>Pendientes de días anteriores</h2>
          <TablaReservas titulo="Reservas de días anteriores sin exportar" filas={anteriores} onAbrir={onAbrir} vacio="" mostrarDia />
        </>
      )}
    </section>
  )
}

interface Fila {
  r: Reserva
  estado: ReturnType<typeof estadoParte>
  plazo: ReturnType<typeof plazo24h>
}

function TablaReservas({ titulo, filas, onAbrir, vacio, mostrarDia }: { titulo: string; filas: Fila[]; onAbrir: (id: string) => void; vacio: string; mostrarDia?: boolean }) {
  if (filas.length === 0) return vacio ? <p>{vacio}</p> : null
  return (
    // Región con scroll horizontal: debe ser enfocable por teclado (WCAG 2.1.1)
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="tabla-scroll" role="region" aria-label={titulo} tabIndex={0}>
      <table>
        <caption className="solo-lectores">{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">{mostrarDia ? 'Entrada' : 'Hora'}</th>
            <th scope="col">Hab.</th>
            <th scope="col">Viajero principal</th>
            <th scope="col">Fichas</th>
            <th scope="col">Parte</th>
            <th scope="col">Plazo 24 h</th>
            <th scope="col">
              <span className="solo-lectores">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ r, estado, plazo }) => (
            <tr key={r.id}>
              <td>{mostrarDia ? new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(r.entrada)) : r.entrada.slice(11, 16)}</td>
              <td>{r.habitacion || '—'}</td>
              <td>{nombrePrincipal(r)}</td>
              <td>
                {r.viajeros.length}/{r.numPersonas}
              </td>
              <td>
                <ChipEstado estado={estado} />
              </td>
              <td>
                <TextoPlazo plazo={plazo} exportado={estado === 'exportado'} />
              </td>
              <td>
                <button type="button" className="secundario" onClick={() => onAbrir(r.id)}>
                  Abrir<span className="solo-lectores"> reserva {r.referencia}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
