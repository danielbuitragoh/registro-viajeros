/**
 * Módulo aislado "exportador": genera el fichero de alta masiva (docs/oficial/Instrucciones.pdf) y lo valida
 * ANTES de entregarlo. Dos barreras: (1) reglas del modelo, (2) validación del XML ya generado.
 * PENDIENTE-OFICIAL (P14): la subida al portal y los errores que devuelva el sistema quedan fuera del documento.
 */
import type { Establecimiento, Incidencia, Reserva, TipoComunicacion } from '../domain/tipos'
import { TIPO_ESTABLECIMIENTO, esCodigo } from '../oficial/codigos'
import { validarDireccion } from '../validators/direccion'
import { validarReserva } from '../validators/reserva'
import { construirXml, nombreFichero } from './construir'
import { validarXml } from './validarXml'

export { construirXml, nombreFichero } from './construir'
export { validarXml } from './validarXml'

export type ResultadoExportacion =
  | { ok: true; xml: string; nombreFichero: string; reservasIncluidas: string[]; avisos: Incidencia[] }
  | { ok: false; errores: Incidencia[]; avisos: Incidencia[] }

const vacio = (s: string | undefined) => s === undefined || s.trim() === ''
const err = (campo: string, codigo: string, params?: Incidencia['params']): Incidencia => ({
  campo,
  codigo,
  gravedad: 'error',
  ...(params ? { params } : {}),
})

export function validarEstablecimiento(e: Establecimiento, tipo: TipoComunicacion): Incidencia[] {
  const out: Incidencia[] = []
  const conCodigo = !vacio(e.codigoEstablecimiento)
  if (conCodigo) {
    if (e.codigoEstablecimiento.length > 10 || /\s/.test(e.codigoEstablecimiento)) out.push(err('codigoEstablecimiento', 'longitud_max', { max: 10 }))
  } else if (tipo === 'partes') {
    out.push(err('codigoEstablecimiento', 'requerido'))
  } else {
    // §4: sin código, datosEstablecimiento es obligatorio (tipo, nombre, dirección)
    if (vacio(e.nombre)) out.push(err('nombre', 'requerido'))
    else if (e.nombre.length > 50) out.push(err('nombre', 'longitud_max', { max: 50 }))
    if (!esCodigo(TIPO_ESTABLECIMIENTO, e.tipo)) out.push(err('tipo', 'codigo_invalido'))
    if (!e.direccion) out.push(err('direccion', 'requerido'))
    else for (const i of validarDireccion(e.direccion)) out.push({ ...i, campo: `direccion.${i.campo}` })
  }
  return out
}

export function generarFichero(
  establecimiento: Establecimiento,
  reservas: Reserva[],
  tipo: TipoComunicacion,
  ahora: Date = new Date(),
): ResultadoExportacion {
  if (reservas.length === 0) return { ok: false, errores: [err('reservas', 'sin_reservas')], avisos: [] }

  // Barrera 1: reglas del modelo
  const incidencias: Incidencia[] = [...validarEstablecimiento(establecimiento, tipo)]
  for (const r of reservas) for (const i of validarReserva(r, tipo)) incidencias.push({ ...i, reservaId: r.id })
  const errores = incidencias.filter((i) => i.gravedad === 'error')
  const avisos = incidencias.filter((i) => i.gravedad === 'aviso')
  if (errores.length > 0) return { ok: false, errores, avisos }

  // Barrera 2: validación independiente del XML generado
  const xml = construirXml(establecimiento, reservas, tipo)
  const erroresXml = validarXml(xml, tipo)
  if (erroresXml.length > 0) return { ok: false, errores: erroresXml, avisos }

  return { ok: true, xml, nombreFichero: nombreFichero(tipo, ahora), reservasIncluidas: reservas.map((r) => r.id), avisos }
}
