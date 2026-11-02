/**
 * Purga automática: los datos de cada reserva se eliminan al cumplirse 3 años desde su fecha de salida, con aviso
 * 30 días antes. PENDIENTE-OFICIAL (P12): el plazo procede del RD 933/2021, no del documento de alta masiva; confirmar
 * el criterio exacto (inicio del cómputo) con asesoría. Solo puede ejecutarse con el almacén desbloqueado (todo va cifrado).
 */
import type { Reserva } from '../domain/tipos'
import { estadoPurga, fechaPurga } from '../domain/plazos'
import type { Almacen } from './almacen'

export interface PlanPurga {
  purgables: Reserva[]
  conAviso: Reserva[]
  /** Fecha (AAAA-MM-DD) de la próxima purga entre las que tienen aviso. */
  proximaPurga: string | undefined
}

export function planificarPurga(reservas: Reserva[], ahora: Date = new Date()): PlanPurga {
  const purgables: Reserva[] = []
  const conAviso: Reserva[] = []
  for (const r of reservas) {
    const e = estadoPurga(r.salida, ahora)
    if (e === 'purgable') purgables.push(r)
    else if (e === 'aviso') conAviso.push(r)
  }
  const proximaPurga = conAviso.map((r) => fechaPurga(r.salida)).sort()[0]
  return { purgables, conAviso, proximaPurga }
}

export interface ResultadoPurga {
  eliminadas: string[]
  conAviso: Reserva[]
  proximaPurga: string | undefined
}

export async function ejecutarPurga(almacen: Almacen, ahora: Date = new Date()): Promise<ResultadoPurga> {
  const plan = planificarPurga(await almacen.listar<Reserva>('reservas'), ahora)
  for (const r of plan.purgables) await almacen.borrar('reservas', r.id)
  return { eliminadas: plan.purgables.map((r) => r.id), conAviso: plan.conAviso, proximaPurga: plan.proximaPurga }
}
