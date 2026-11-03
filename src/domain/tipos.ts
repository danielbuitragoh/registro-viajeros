import type {
  CodigoParentesco,
  CodigoSexo,
  CodigoTipoDocumento,
  CodigoTipoEstablecimiento,
  CodigoTipoPago,
} from '../oficial/codigos'

/** Bloque `direccion` (§7.1 del documento oficial). */
export interface Direccion {
  direccion: string
  direccionComplementaria?: string
  /** INE, 5 dígitos. Obligatorio si pais = ESP. */
  codigoMunicipio?: string
  /** Obligatorio si pais ≠ ESP. Para España se guarda como ayuda local pero no se exporta. */
  nombreMunicipio?: string
  codigoPostal: string
  /** ISO 3166-1 alfa-3 */
  pais: string
}

/** Menor: a qué adulto acompaña y qué parentesco tiene ese adulto con él (ver P7 en docs/oficial/NOTAS.md). */
export interface Responsable {
  adultoId: string
  parentesco: CodigoParentesco
}

export interface Viajero {
  id: string
  /** Marca al titular del contrato (solo se usa en reservas de hospedaje, rol TI). */
  esTitular?: boolean
  nombre: string
  apellido1: string
  apellido2?: string
  tipoDocumento?: CodigoTipoDocumento
  numeroDocumento?: string
  soporteDocumento?: string
  /** AAAA-MM-DD */
  fechaNacimiento: string
  /** ISO 3166-1 alfa-3 */
  nacionalidad?: string
  sexo?: CodigoSexo
  direccion: Direccion
  telefono?: string
  telefono2?: string
  correo?: string
  /** Solo menores. */
  responsable?: Responsable
  /** De dónde viene la ficha (informativo). */
  origen?: 'recepcion' | 'huesped'
}

/** Bloque `pago` (§7.2). */
export interface Pago {
  tipoPago: CodigoTipoPago
  /** AAAA-MM-DD */
  fechaPago?: string
  medioPago?: string
  titular?: string
  /** MM/AAAA */
  caducidadTarjeta?: string
}

export interface Reserva {
  id: string
  /** `contrato.referencia` ≤50 */
  referencia: string
  /** AAAA-MM-DD */
  fechaContrato: string
  /** AAAA-MM-DDThh:mm (hora local del alojamiento) */
  entrada: string
  /** AAAA-MM-DDThh:mm */
  salida: string
  numPersonas: number
  numHabitaciones?: number
  /** Interno: no se exporta (P13). */
  habitacion: string
  /** Interno: no se exporta (P13). */
  canal: string
  pago: Pago
  viajeros: Viajero[]
  creadaEn: string
  modificadaEn: string
  /** ISO datetime de la última exportación en la que se incluyó esta reserva. */
  exportadaEn?: string
  /** Clave (base64url, 256 bits) del enlace de huésped de esta reserva. Se guarda cifrada en el almacén. */
  claveEnlace?: string
  /** Interno: reserva de prueba creada por el asistente de primeros pasos. No se exporta como campo; no se preselecciona al exportar. */
  prueba?: boolean
}

export interface Establecimiento {
  /** `codigoEstablecimiento` ≤10 (asignado por el Sistema de Hospedajes). */
  codigoEstablecimiento: string
  /** Interno: el documento oficial no lo incluye (P5). No se exporta. */
  codigoArrendador?: string
  nombre: string
  tipo: CodigoTipoEstablecimiento
  /** NIF/CIF del titular: solo informativo, se valida pero no se exporta. */
  nifCif?: string
  direccion?: Direccion
}

export type Gravedad = 'error' | 'aviso'

/** Un problema detectado. `codigo` es una clave de i18n; `campo` es una ruta tipo `direccion.pais`. */
export interface Incidencia {
  campo: string
  codigo: string
  gravedad: Gravedad
  params?: Record<string, string | number>
  /** Si procede de la ficha de un viajero concreto. */
  viajeroId?: string
  /** Si procede de una reserva concreta (se rellena al exportar varias a la vez). */
  reservaId?: string
}

export type TipoComunicacion = 'partes' | 'reservas'
