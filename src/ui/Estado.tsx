import type { EstadoParte } from '../validators/reserva'
import type { Plazo } from '../domain/plazos'
import { formatoHoras } from './formato'

const ICONO: Record<EstadoParte, string> = { pendiente: '◔', completo: '●', exportado: '✔' }
const TEXTO: Record<EstadoParte, string> = { pendiente: 'Pendiente', completo: 'Completo', exportado: 'Exportado' }

/** El estado nunca depende solo del color: lleva icono y texto (WCAG 1.4.1). */
export function ChipEstado({ estado }: { estado: EstadoParte }) {
  return (
    <span className={`chip chip-${estado}`}>
      <span aria-hidden="true">{ICONO[estado]} </span>
      {TEXTO[estado]}
    </span>
  )
}

export function TextoPlazo({ plazo, exportado }: { plazo: Plazo; exportado: boolean }) {
  if (exportado) return <span className="plazo plazo-ok">—</span>
  if (plazo.estado === 'vencido') {
    return (
      <span className="plazo plazo-vencido">
        <span aria-hidden="true">⛔ </span>Vencido hace {formatoHoras(plazo.horasRestantes)}
      </span>
    )
  }
  if (plazo.estado === 'proximo') {
    return (
      <span className="plazo plazo-proximo">
        <span aria-hidden="true">⚠ </span>Quedan {formatoHoras(plazo.horasRestantes)}
      </span>
    )
  }
  return <span className="plazo plazo-ok">Quedan {formatoHoras(plazo.horasRestantes)}</span>
}
