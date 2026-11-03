import { esCodigo, TIPO_PAGO } from '../oficial/codigos'
import type { Incidencia, Reserva, TipoComunicacion } from '../domain/tipos'
import { aFechaHoraOficial, esFechaHoraValida, esFechaValida, esMayorDeEdad, hoyISO, soloFecha } from './fechas'
import { normalizarDocumento } from './documentos'
import { validarViajero } from './viajero'
import type { ConsultaIne } from '../ine/relacion'

const vacio = (s: string | undefined | null) => s === undefined || s === null || s.trim() === ''
const err = (campo: string, codigo: string, params?: Incidencia['params'], viajeroId?: string): Incidencia => ({
  campo,
  codigo,
  gravedad: 'error',
  ...(params ? { params } : {}),
  ...(viajeroId ? { viajeroId } : {}),
})
const aviso = (campo: string, codigo: string, params?: Incidencia['params'], viajeroId?: string): Incidencia => ({
  ...err(campo, codigo, params, viajeroId),
  gravedad: 'aviso',
})

/**
 * Valida una reserva con sus viajeros contra el documento oficial.
 * `partes` = §3 (parte de viajeros). `reservas` = §4 (reserva de hospedaje).
 */
export function validarReserva(r: Reserva, tipo: TipoComunicacion, opciones: { ine?: ConsultaIne } = {}): Incidencia[] {
  const out: Incidencia[] = []

  // --- contrato ---
  if (vacio(r.referencia)) out.push(err('referencia', 'requerido'))
  else if (r.referencia.length > 50) out.push(err('referencia', 'longitud_max', { max: 50 }))

  const entradaOk = !vacio(r.entrada) && esFechaHoraValida(r.entrada)
  const salidaOk = !vacio(r.salida) && esFechaHoraValida(r.salida)

  if (vacio(r.fechaContrato)) out.push(err('fechaContrato', 'requerido'))
  else if (!esFechaValida(r.fechaContrato)) out.push(err('fechaContrato', 'fecha_invalida'))
  else if (entradaOk && r.fechaContrato > soloFecha(r.entrada)) out.push(err('fechaContrato', 'contrato_posterior_entrada'))

  if (vacio(r.entrada)) out.push(err('entrada', 'requerido'))
  else if (!entradaOk) out.push(err('entrada', 'fecha_invalida'))
  if (vacio(r.salida)) out.push(err('salida', 'requerido'))
  else if (!salidaOk) out.push(err('salida', 'fecha_invalida'))
  if (entradaOk && salidaOk && aFechaHoraOficial(r.salida) <= aFechaHoraOficial(r.entrada)) {
    out.push(err('salida', 'salida_anterior_entrada'))
  }

  if (!Number.isInteger(r.numPersonas) || r.numPersonas < 1) out.push(err('numPersonas', 'numero_invalido'))
  if (r.numHabitaciones !== undefined && (!Number.isInteger(r.numHabitaciones) || r.numHabitaciones < 1)) {
    out.push(err('numHabitaciones', 'numero_invalido'))
  }

  // --- pago (§7.2) ---
  const p = r.pago
  if (vacio(p?.tipoPago)) out.push(err('pago.tipoPago', 'requerido'))
  else if (!esCodigo(TIPO_PAGO, p.tipoPago)) out.push(err('pago.tipoPago', 'codigo_invalido'))
  if (p && !vacio(p.fechaPago) && !esFechaValida(p.fechaPago as string)) out.push(err('pago.fechaPago', 'fecha_invalida'))
  if (p?.medioPago && p.medioPago.length > 50) out.push(err('pago.medioPago', 'longitud_max', { max: 50 }))
  if (p?.titular && p.titular.length > 100) out.push(err('pago.titular', 'longitud_max', { max: 100 }))
  if (p && !vacio(p.caducidadTarjeta) && !/^(0[1-9]|1[0-2])\/\d{4}$/.test(p.caducidadTarjeta as string)) {
    out.push(err('pago.caducidadTarjeta', 'caducidad_formato'))
  }

  // --- viajeros ---
  const fechaEntrada = entradaOk ? soloFecha(r.entrada) : hoyISO()
  const adultosIds = r.viajeros
    .filter((v) => esFechaValida(v.fechaNacimiento) && v.fechaNacimiento <= fechaEntrada && esMayorDeEdad(v.fechaNacimiento, fechaEntrada))
    .map((v) => v.id)
  const modo = tipo === 'partes' ? 'parte' : 'reserva'

  if (r.viajeros.length === 0) out.push(err('viajeros', 'viajeros_vacio'))
  else if (r.viajeros.length !== r.numPersonas) {
    out.push(aviso('viajeros', 'viajeros_cuenta', { fichas: r.viajeros.length, personas: r.numPersonas }))
  }

  for (const v of r.viajeros) {
    for (const i of validarViajero(v, { fechaEntrada, modo, adultosIds, ine: opciones.ine })) out.push({ ...i, viajeroId: v.id })
  }

  // Documentos repetidos (probable error de transcripción)
  const vistos = new Map<string, string>()
  for (const v of r.viajeros) {
    if (vacio(v.numeroDocumento)) continue
    const doc = normalizarDocumento(v.numeroDocumento as string)
    if (vistos.has(doc)) out.push(aviso('numeroDocumento', 'documento_duplicado', undefined, v.id))
    else vistos.set(doc, v.id)
  }

  if (tipo === 'partes') {
    // P7: un adulto con varios menores a su cargo con parentescos distintos → un solo campo `parentesco` en el XML
    const porAdulto = new Map<string, Set<string>>()
    for (const v of r.viajeros) {
      if (!v.responsable) continue
      const s = porAdulto.get(v.responsable.adultoId) ?? new Set<string>()
      s.add(v.responsable.parentesco)
      porAdulto.set(v.responsable.adultoId, s)
    }
    for (const [adultoId, codigos] of porAdulto) {
      if (codigos.size > 1) out.push(aviso('responsable', 'parentesco_multiple', undefined, adultoId))
    }
  } else {
    // P8: en reservas de hospedaje debe haber un titular (rol TI)
    const titulares = r.viajeros.filter((v) => v.esTitular).length
    if (r.viajeros.length > 0 && titulares === 0) out.push(err('viajeros', 'titular_requerido'))
    if (titulares > 1) out.push(err('viajeros', 'titular_multiple'))
  }

  return out
}

export type EstadoParte = 'pendiente' | 'completo' | 'exportado'

/** Estado del parte de viajeros de una reserva, para la lista del día. */
export function estadoParte(r: Reserva): EstadoParte {
  if (r.exportadaEn && r.exportadaEn >= r.modificadaEn) return 'exportado'
  const inc = validarReserva(r, 'partes')
  return inc.some((i) => i.gravedad === 'error' || i.codigo === 'viajeros_cuenta') ? 'pendiente' : 'completo'
}
