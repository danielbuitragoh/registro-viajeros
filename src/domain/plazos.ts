import { sumarAnios, soloFecha } from '../validators/fechas'

/**
 * PENDIENTE-OFICIAL (P12): el plazo de 24 h y el de conservación de 3 años proceden del RD 933/2021, no del documento
 * de alta masiva. Se cuentan desde la entrada prevista (24 h) y desde la fecha de salida (3 años). Confirmar con asesoría.
 */
export const HORAS_PLAZO_COMUNICACION = 24
export const HORAS_AVISO_PROXIMO = 6
export const ANIOS_CONSERVACION = 3
export const DIAS_AVISO_PURGA = 30

export type EstadoPlazo = 'ok' | 'proximo' | 'vencido'

export interface Plazo {
  vence: Date
  horasRestantes: number
  estado: EstadoPlazo
}

export function plazo24h(entrada: string, ahora: Date = new Date()): Plazo {
  const vence = new Date(new Date(entrada).getTime() + HORAS_PLAZO_COMUNICACION * 3_600_000)
  const horasRestantes = (vence.getTime() - ahora.getTime()) / 3_600_000
  const estado: EstadoPlazo = horasRestantes < 0 ? 'vencido' : horasRestantes <= HORAS_AVISO_PROXIMO ? 'proximo' : 'ok'
  return { vence, horasRestantes, estado }
}

/** Fecha (AAAA-MM-DD) a partir de la cual los datos de una reserva deben eliminarse. */
export function fechaPurga(salida: string): string {
  return sumarAnios(soloFecha(salida), ANIOS_CONSERVACION)
}

export type EstadoPurga = 'vigente' | 'aviso' | 'purgable'

export function estadoPurga(salida: string, ahora: Date = new Date()): EstadoPurga {
  const purga = new Date(`${fechaPurga(salida)}T00:00:00`)
  if (ahora.getTime() >= purga.getTime()) return 'purgable'
  const inicioAviso = purga.getTime() - DIAS_AVISO_PURGA * 86_400_000
  return ahora.getTime() >= inicioAviso ? 'aviso' : 'vigente'
}
