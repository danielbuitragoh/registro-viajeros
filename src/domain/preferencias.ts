import type { Viajero } from './tipos'

/**
 * Preferencias de recepción en este dispositivo. Se guardan CIFRADAS en el almacén (config/preferencias) y no forman
 * parte de las copias de seguridad (son del dispositivo, no del establecimiento).
 */
export interface Preferencias {
  asistente?: {
    /** Paso en el que va (2..6; el 1, la contraseña, ya está hecho si hay almacén). */
    paso: number
    terminado?: boolean
    saltado?: boolean
    reservaPruebaId?: string
  }
  copias?: PreferenciasCopia
}

export interface PreferenciasCopia {
  /** Cada cuántos días recordar la copia (0 = no recordar). */
  cadaDias: number
  /** ISO de la última copia descargada en este dispositivo. */
  ultima?: string
}

export const PASOS_ASISTENTE = ['Contraseña', 'Establecimiento', 'Reserva de prueba', 'Enlace al huésped', 'Primer fichero', 'Copia de seguridad'] as const
export const TOTAL_PASOS = PASOS_ASISTENTE.length

export const FRECUENCIAS_COPIA = [
  { dias: 7, texto: 'Cada semana (recomendado)' },
  { dias: 14, texto: 'Cada 2 semanas' },
  { dias: 30, texto: 'Cada mes' },
  { dias: 0, texto: 'No recordármelo' },
] as const

export const COPIA_POR_DEFECTO: PreferenciasCopia = { cadaDias: 7 }

export type Recordatorio = { tipo: 'nunca' } | { tipo: 'vencida'; dias: number }

/** ¿Hay que recordar la copia de seguridad? `reservasReales` no cuenta la reserva de prueba. */
export function recordatorioCopia(p: PreferenciasCopia | undefined, ahora: Date, reservasReales: number): Recordatorio | undefined {
  const { cadaDias, ultima } = p ?? COPIA_POR_DEFECTO
  if (cadaDias <= 0 || reservasReales === 0) return undefined
  if (!ultima) return { tipo: 'nunca' }
  const dias = Math.floor((ahora.getTime() - new Date(ultima).getTime()) / 86_400_000)
  return dias >= cadaDias ? { tipo: 'vencida', dias } : undefined
}

/**
 * Viajero 100 % ficticio para practicar en el asistente sin móvil. Domicilio fuera de España: así no hace falta ningún
 * código INE (nunca se presenta un código inventado como real) y el parte es válido.
 */
export function viajeroEjemplo(id: string): Viajero {
  return {
    id,
    nombre: 'Ana',
    apellido1: 'Ejemplo',
    apellido2: 'Ficticia',
    tipoDocumento: 'PAS',
    numeroDocumento: 'EJEMPLO01',
    fechaNacimiento: '1980-01-01',
    direccion: { direccion: 'Calle de Ejemplo 1', nombreMunicipio: 'Ciudad de Ejemplo', codigoPostal: '00000', pais: 'FRA' },
    correo: 'ana.ejemplo@example.com',
    origen: 'recepcion',
  }
}
