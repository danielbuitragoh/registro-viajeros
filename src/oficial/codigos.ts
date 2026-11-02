/**
 * Tablas de códigos transcritas del apartado 8 de docs/oficial/Instrucciones.pdf
 * ("Alta masiva de comunicaciones – Hospedajes", v1.1.0, 08-01-2024).
 * NO añadir códigos que no estén en ese documento.
 */

export interface Etiqueta {
  es: string
  en: string
}

/** 8.3 Relación de parentesco */
export const PARENTESCO = {
  AB: { es: 'Abuelo/a', en: 'Grandparent' },
  BA: { es: 'Bisabuelo/a', en: 'Great-grandparent' },
  BN: { es: 'Bisnieto/a', en: 'Great-grandchild' },
  CD: { es: 'Cuñado/a', en: 'Brother/sister-in-law' },
  CY: { es: 'Cónyuge', en: 'Spouse' },
  HJ: { es: 'Hijo/a', en: 'Son/daughter' },
  HR: { es: 'Hermano/a', en: 'Brother/sister' },
  NI: { es: 'Nieto/a', en: 'Grandchild' },
  PM: { es: 'Padre o madre', en: 'Father or mother' },
  SB: { es: 'Sobrino/a', en: 'Nephew/niece' },
  SG: { es: 'Suegro/a', en: 'Parent-in-law' },
  TI: { es: 'Tío/a', en: 'Uncle/aunt' },
  YN: { es: 'Yerno o nuera', en: 'Son/daughter-in-law' },
  TU: { es: 'Tutor/a', en: 'Legal guardian' },
  OT: { es: 'Otro', en: 'Other' },
} as const satisfies Record<string, Etiqueta>
export type CodigoParentesco = keyof typeof PARENTESCO

/** 8.4 Sexo */
export const SEXO = {
  H: { es: 'Hombre', en: 'Male' },
  M: { es: 'Mujer', en: 'Female' },
  O: { es: 'Otro', en: 'Other' },
} as const satisfies Record<string, Etiqueta>
export type CodigoSexo = keyof typeof SEXO

/** 8.5 Tipos de documento */
export const TIPO_DOCUMENTO = {
  NIF: { es: 'DNI / NIF', en: 'Spanish ID (DNI / NIF)' },
  NIE: { es: 'NIE (extranjero residente)', en: 'Spanish foreigner ID (NIE)' },
  PAS: { es: 'Pasaporte', en: 'Passport' },
  OTRO: { es: 'Otro documento', en: 'Other document' },
} as const satisfies Record<string, Etiqueta>
export type CodigoTipoDocumento = keyof typeof TIPO_DOCUMENTO

/** 8.6 Tipos de establecimiento */
export const TIPO_ESTABLECIMIENTO = {
  ALBERGUE: { es: 'Albergue', en: 'Hostel (albergue)' },
  APART: { es: 'Apartamento', en: 'Apartment' },
  APARTHOTEL: { es: 'Apartahotel', en: 'Aparthotel' },
  AP_RURAL: { es: 'Apartamento rural', en: 'Rural apartment' },
  BALNEARIO: { es: 'Balneario', en: 'Spa resort' },
  CAMPING: { es: 'Camping', en: 'Campsite' },
  CASA_HUESP: { es: 'Casa de huéspedes', en: 'Guest house' },
  CASA_RURAL: { es: 'Casa rural', en: 'Rural house' },
  HOSTAL: { es: 'Hostal', en: 'Hostal' },
  HOTEL: { es: 'Hotel', en: 'Hotel' },
  H_RURAL: { es: 'Hotel rural', en: 'Rural hotel' },
  MOTEL: { es: 'Motel', en: 'Motel' },
  OFIC_VEHIC: { es: 'Oficina de alquiler de vehículos', en: 'Vehicle rental office' },
  OTROS: { es: 'Otro', en: 'Other' },
  PARADOR: { es: 'Parador de turismo', en: 'Parador' },
  PENSION: { es: 'Pensión', en: 'Pension' },
  RESIDENCIA: { es: 'Residencia', en: 'Residence' },
} as const satisfies Record<string, Etiqueta>
export type CodigoTipoEstablecimiento = keyof typeof TIPO_ESTABLECIMIENTO

/** 8.7 Tipos de pago */
export const TIPO_PAGO = {
  EFECT: { es: 'Efectivo', en: 'Cash' },
  TARJT: { es: 'Tarjeta de crédito', en: 'Credit card' },
  PLATF: { es: 'Plataforma de pago', en: 'Payment platform' },
  TRANS: { es: 'Transferencia', en: 'Bank transfer' },
  MOVIL: { es: 'Pago por móvil', en: 'Mobile payment' },
  TREG: { es: 'Tarjeta regalo', en: 'Gift card' },
  DESTI: { es: 'Pago en destino', en: 'Pay at destination' },
  OTRO: { es: 'Otros medios de pago', en: 'Other' },
} as const satisfies Record<string, Etiqueta>
export type CodigoTipoPago = keyof typeof TIPO_PAGO

/** §3 y §4: rol de la persona en el contrato (hospedaje). */
export const ROL_PERSONA = {
  TI: { es: 'Titular del contrato', en: 'Contract holder' },
  VI: { es: 'Viajero', en: 'Traveller' },
} as const satisfies Record<string, Etiqueta>
export type CodigoRol = keyof typeof ROL_PERSONA

/** Comprueba que un valor es una clave exacta (sensible a mayúsculas) de una tabla. */
export function esCodigo<T extends Record<string, unknown>>(tabla: T, valor: unknown): valor is keyof T & string {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(tabla, valor)
}
