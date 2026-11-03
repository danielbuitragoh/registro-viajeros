import type { Incidencia, Viajero } from '../domain/tipos'
import { PARENTESCO, SEXO, TIPO_DOCUMENTO, esCodigo } from '../oficial/codigos'
import { alfa3Espana, esPaisAlfa3 } from '../oficial/paises'
import { fechaLegible, nombreCoincide, type ConsultaIne } from '../ine/relacion'
import { validarDireccion } from './direccion'
import { validarCorreo, validarTelefono } from './contacto'
import { normalizarDocumento, validarDNI, validarNIE } from './documentos'
import { edadEn, esFechaValida, esMayorDeEdad } from './fechas'
import { validarPasaporte } from './pasaporte'

export interface ContextoViajero {
  /** AAAA-MM-DD: fecha de entrada de la reserva (referencia para calcular la edad). */
  fechaEntrada: string
  /** `parte` = §3 (parte de viajeros, casi todo obligatorio). `reserva` = §4 (casi todo opcional). */
  modo: 'parte' | 'reserva'
  /** Ids de los viajeros adultos de la reserva (para validar al responsable de un menor). */
  adultosIds?: string[]
  /** Relación de municipios del INE ya cargada (si la hay): solo genera avisos, nunca errores. */
  ine?: ConsultaIne
}

const vacio = (s: string | undefined | null) => s === undefined || s === null || s.trim() === ''
const err = (campo: string, codigo: string, params?: Incidencia['params']): Incidencia => ({
  campo,
  codigo,
  gravedad: 'error',
  ...(params ? { params } : {}),
})
const aviso = (campo: string, codigo: string): Incidencia => ({ campo, codigo, gravedad: 'aviso' })

const EDAD_MAXIMA = 120

export function validarViajero(v: Viajero, ctx: ContextoViajero): Incidencia[] {
  const out: Incidencia[] = []
  const parte = ctx.modo === 'parte'

  // --- Nombre y apellidos (String(50)) ---
  if (vacio(v.nombre)) out.push(err('nombre', 'requerido'))
  else if (v.nombre.length > 50) out.push(err('nombre', 'longitud_max', { max: 50 }))
  if (vacio(v.apellido1)) out.push(err('apellido1', 'requerido'))
  else if (v.apellido1.length > 50) out.push(err('apellido1', 'longitud_max', { max: 50 }))
  if (v.apellido2 && v.apellido2.length > 50) out.push(err('apellido2', 'longitud_max', { max: 50 }))
  if (parte && v.tipoDocumento === 'NIF' && vacio(v.apellido2)) out.push(err('apellido2', 'apellido2_requerido_nif'))

  // --- Fecha de nacimiento y edad ---
  let edad: number | undefined
  if (vacio(v.fechaNacimiento)) {
    if (parte) out.push(err('fechaNacimiento', 'requerido'))
  } else if (!esFechaValida(v.fechaNacimiento)) {
    out.push(err('fechaNacimiento', 'fecha_invalida'))
  } else if (v.fechaNacimiento > ctx.fechaEntrada) {
    out.push(err('fechaNacimiento', 'fecha_futura'))
  } else {
    edad = edadEn(v.fechaNacimiento, ctx.fechaEntrada)
    if (edad > EDAD_MAXIMA) out.push(err('fechaNacimiento', 'fecha_muy_antigua'))
  }
  const mayor = edad === undefined ? undefined : esMayorDeEdad(v.fechaNacimiento, ctx.fechaEntrada)

  // --- Documento ---
  const tipoValido = esCodigo(TIPO_DOCUMENTO, v.tipoDocumento)
  if (!vacio(v.tipoDocumento) && !tipoValido) out.push(err('tipoDocumento', 'codigo_invalido'))
  if (parte && mayor === true) {
    if (vacio(v.tipoDocumento)) out.push(err('tipoDocumento', 'requerido'))
    if (vacio(v.numeroDocumento)) out.push(err('numeroDocumento', 'requerido'))
  }
  if (!vacio(v.numeroDocumento)) {
    if (vacio(v.tipoDocumento)) out.push(err('tipoDocumento', 'requerido'))
    else if (tipoValido) out.push(...validarNumeroDocumento(v))
  }
  if (parte && (v.tipoDocumento === 'NIF' || v.tipoDocumento === 'NIE')) {
    if (vacio(v.soporteDocumento)) out.push(err('soporteDocumento', 'requerido'))
    else if (!/^[A-Z0-9]{1,9}$/.test(normalizarDocumento(v.soporteDocumento as string))) {
      // PENDIENTE-OFICIAL (P10): solo se conoce la longitud (String(9)); el formato exacto no está en el documento.
      out.push(err('soporteDocumento', 'soporte_formato'))
    }
  }

  // --- Nacionalidad y sexo (opcionales) ---
  if (!vacio(v.nacionalidad) && !esPaisAlfa3(v.nacionalidad)) out.push(err('nacionalidad', 'pais_invalido'))
  if (!vacio(v.sexo) && !esCodigo(SEXO, v.sexo)) out.push(err('sexo', 'codigo_invalido'))

  // --- Dirección ---
  const d = v.direccion
  const hayDireccion = !!d && [d.direccion, d.direccionComplementaria, d.codigoMunicipio, d.nombreMunicipio, d.codigoPostal, d.pais].some((x) => !vacio(x))
  if (parte || hayDireccion) {
    const inc = d ? validarDireccion(d) : [err('direccion', 'requerido')]
    for (const i of inc) out.push({ ...i, campo: d ? `direccion.${i.campo}` : i.campo })
    if (d && ctx.ine) out.push(...avisosIne(d, ctx.ine))
  }

  // --- Contacto: al menos uno de telefono, telefono2 o correo ---
  if (vacio(v.telefono) && vacio(v.telefono2) && vacio(v.correo)) out.push(err('telefono', 'contacto_requerido'))
  if (!vacio(v.telefono) && !validarTelefono(v.telefono as string).ok) out.push(err('telefono', 'telefono_formato'))
  if (!vacio(v.telefono2) && !validarTelefono(v.telefono2 as string).ok) out.push(err('telefono2', 'telefono_formato'))
  if (!vacio(v.correo) && !validarCorreo(v.correo as string).ok) out.push(err('correo', 'correo_formato'))

  // --- Menores: adulto responsable y parentesco (P7) ---
  if (parte && mayor === false) {
    if (!v.responsable) out.push(err('responsable', 'responsable_requerido'))
    else {
      if (ctx.adultosIds && !ctx.adultosIds.includes(v.responsable.adultoId)) out.push(err('responsable', 'responsable_invalido'))
      if (!esCodigo(PARENTESCO, v.responsable.parentesco)) out.push(err('responsable.parentesco', 'codigo_invalido'))
    }
  }

  return out
}

/**
 * Código INE contra la relación de municipios cargada. Solo AVISOS: un municipio dado de alta después de la fecha
 * de la relación es válido, y la relación puede estar desactualizada.
 */
function avisosIne(d: NonNullable<Viajero['direccion']>, ine: ConsultaIne): Incidencia[] {
  const codigo = d.codigoMunicipio?.trim() ?? ''
  if (d.pais !== alfa3Espana || !/^\d{5}$/.test(codigo)) return []
  const e = ine(codigo)
  const campo = 'direccion.codigoMunicipio'
  const av = (c: string, params: Record<string, string>): Incidencia => ({ campo, codigo: c, gravedad: 'aviso', params })
  if (!e) return []
  if (e.tipo === 'no_figura') return [av('municipio_ine_no_figura', { codigo, fecha: fechaLegible(e.fecha) })]
  if (e.tipo === 'baja') return [av('municipio_ine_baja', { codigo, nombre: e.municipio.nombre, fechaAnterior: fechaLegible(e.fechaAnterior), fecha: fechaLegible(e.fecha) })]
  if (!vacio(d.nombreMunicipio) && !nombreCoincide(e.municipio, d.nombreMunicipio as string)) return [av('municipio_ine_nombre', { codigo, nombre: e.municipio.nombre })]
  return []
}

function validarNumeroDocumento(v: Viajero): Incidencia[] {
  const num = v.numeroDocumento as string
  const campo = 'numeroDocumento'
  switch (v.tipoDocumento) {
    case 'NIF':
    case 'NIE': {
      const r = v.tipoDocumento === 'NIF' ? validarDNI(num) : validarNIE(num)
      if (r.ok) return r.aviso ? [aviso(campo, 'nif_especial_control_no_verificado')] : []
      const base = r.codigo === 'letra' ? 'doc_letra' : r.codigo === 'parece_nie' ? 'doc_parece_nie' : r.codigo === 'parece_dni' ? 'doc_parece_dni' : 'doc_formato'
      return [err(campo, base, v.tipoDocumento === 'NIF' ? { esperada: r.esperada ?? '', tipo: 'DNI' } : { esperada: r.esperada ?? '', tipo: 'NIE' })]
    }
    case 'PAS': {
      const r = validarPasaporte(num, v.nacionalidad)
      if (!r.ok) return [err(campo, r.codigo === 'caracteres' ? 'pasaporte_caracteres' : 'pasaporte_longitud')]
      if (r.aviso) return [aviso(campo, r.aviso === 'formato_pais' ? 'pasaporte_formato_pais' : 'pasaporte_longitud_inusual')]
      return []
    }
    case 'OTRO':
      return num.trim().length > 15 ? [err(campo, 'longitud_max', { max: 15 })] : []
    default:
      return []
  }
}
