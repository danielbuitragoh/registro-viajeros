/**
 * Construcción del XML de alta masiva de comunicaciones, según docs/oficial/Instrucciones.pdf v1.1.0:
 *  - Partes de viajeros: §3, figura 1.   - Reservas de hospedaje: §4, figura 2.
 *  - Bloque direccion: §7.1 (figura 5).  - Bloque pago: §7.2 (figura 6).
 *
 * PENDIENTE-OFICIAL (P1): el documento no incluye XSD, espacio de nombres ni declaración XML. Se emite la declaración
 * estándar UTF-8 y elementos sin espacio de nombres. Contrastar con la plantilla real descargable del portal.
 * PENDIENTE-OFICIAL (P3): el campo opcional `internet` (Booleano) NO se emite porque no se define su formato.
 */
import type { Direccion, Establecimiento, Pago, Reserva, TipoComunicacion, Viajero } from '../domain/tipos'
import { alfa3Espana } from '../oficial/paises'
import { normalizarDocumento } from '../validators/documentos'
import { validarTelefono } from '../validators/contacto'
import { aFechaHoraOficial } from '../validators/fechas'
import { CABECERA_XML, bloque, hoja, limpiarTexto, renderizar, type Nodo } from './xml'

const lleno = (s: string | undefined) => s !== undefined && limpiarTexto(s) !== ''

function documento(v: Viajero): string | undefined {
  if (!lleno(v.numeroDocumento)) return undefined
  return v.tipoDocumento === 'OTRO' ? limpiarTexto(v.numeroDocumento as string) : normalizarDocumento(v.numeroDocumento as string)
}

function telefono(t: string | undefined): string | undefined {
  if (!lleno(t)) return undefined
  const r = validarTelefono(t as string)
  return r.ok ? r.normalizado : limpiarTexto(t as string)
}

export function nodoDireccion(d: Direccion): Nodo {
  const esp = d.pais === alfa3Espana
  return bloque('direccion', [
    hoja('direccion', d.direccion),
    hoja('direccionComplementaria', d.direccionComplementaria),
    // §7.1: codigoMunicipio obligatorio si el país es España; nombreMunicipio si no lo es.
    esp ? hoja('codigoMunicipio', d.codigoMunicipio) : null,
    esp ? null : hoja('nombreMunicipio', d.nombreMunicipio),
    hoja('codigoPostal', d.codigoPostal),
    hoja('pais', d.pais),
  ])
}

function hayDireccion(d: Direccion | undefined): d is Direccion {
  return !!d && [d.direccion, d.direccionComplementaria, d.codigoMunicipio, d.nombreMunicipio, d.codigoPostal, d.pais].some(lleno)
}

function nodoPago(p: Pago): Nodo {
  return bloque('pago', [
    hoja('tipoPago', p.tipoPago),
    hoja('fechaPago', p.fechaPago),
    hoja('medioPago', p.medioPago),
    hoja('titular', p.titular),
    hoja('caducidadTarjeta', p.caducidadTarjeta),
  ])
}

function nodoContrato(r: Reserva): Nodo {
  return bloque('contrato', [
    hoja('referencia', r.referencia),
    hoja('fechaContrato', r.fechaContrato),
    hoja('fechaEntrada', aFechaHoraOficial(r.entrada)),
    hoja('fechaSalida', aFechaHoraOficial(r.salida)),
    hoja('numPersonas', r.numPersonas),
    hoja('numHabitaciones', r.numHabitaciones),
    nodoPago(r.pago),
  ])
}

/** P7: el parentesco se informa en el adulto responsable (primer menor a su cargo, en orden de ficha). */
function parentescoPorAdulto(r: Reserva): Map<string, string> {
  const m = new Map<string, string>()
  for (const v of r.viajeros) {
    if (v.responsable && !m.has(v.responsable.adultoId)) m.set(v.responsable.adultoId, v.responsable.parentesco)
  }
  return m
}

function personaParte(v: Viajero, parentesco: string | undefined): Nodo {
  return bloque('persona', [
    hoja('rol', 'VI'),
    hoja('nombre', v.nombre),
    hoja('apellido1', v.apellido1),
    hoja('apellido2', v.apellido2),
    hoja('tipoDocumento', v.tipoDocumento),
    hoja('numeroDocumento', documento(v)), // P2: la figura 1 usa numeroDocumento (la tabla del §3 dice "documento")
    hoja('soporteDocumento', lleno(v.soporteDocumento) ? normalizarDocumento(v.soporteDocumento as string) : undefined),
    hoja('fechaNacimiento', v.fechaNacimiento),
    hoja('nacionalidad', v.nacionalidad),
    hoja('sexo', v.sexo),
    nodoDireccion(v.direccion),
    hoja('telefono', telefono(v.telefono)),
    hoja('telefono2', telefono(v.telefono2)),
    hoja('correo', v.correo),
    hoja('parentesco', parentesco),
  ])
}

function personaReserva(v: Viajero, rol: 'TI' | 'VI'): Nodo {
  return bloque('persona', [
    hoja('rol', rol),
    hoja('nombre', v.nombre),
    hoja('apellido1', v.apellido1),
    hoja('apellido2', v.apellido2),
    hoja('tipoDocumento', v.tipoDocumento),
    hoja('numeroDocumento', documento(v)),
    hoja('fechaNacimiento', v.fechaNacimiento),
    hoja('nacionalidad', v.nacionalidad),
    hoja('sexo', v.sexo),
    hayDireccion(v.direccion) ? nodoDireccion(v.direccion) : null,
    hoja('telefono', telefono(v.telefono)),
    hoja('telefono2', telefono(v.telefono2)),
    hoja('correo', v.correo),
  ])
}

function nodoEstablecimiento(e: Establecimiento): Nodo {
  if (lleno(e.codigoEstablecimiento)) return bloque('establecimiento', [hoja('codigo', e.codigoEstablecimiento)])
  return bloque('establecimiento', [
    bloque('datosEstablecimiento', [
      hoja('tipo', e.tipo),
      hoja('nombre', e.nombre),
      e.direccion ? nodoDireccion(e.direccion) : null,
    ]),
  ])
}

function comunicacionParte(r: Reserva): Nodo {
  const parentescos = parentescoPorAdulto(r)
  return bloque('comunicacion', [nodoContrato(r), ...r.viajeros.map((v) => personaParte(v, parentescos.get(v.id)))])
}

function comunicacionReserva(e: Establecimiento, r: Reserva): Nodo {
  const titular = r.viajeros.find((v) => v.esTitular)
  return bloque('comunicacion', [
    nodoEstablecimiento(e),
    nodoContrato(r),
    // P8: un bloque TI con el titular y un bloque VI por cada viajero.
    ...(titular ? [personaReserva(titular, 'TI')] : []),
    ...r.viajeros.map((v) => personaReserva(v, 'VI')),
  ])
}

/** Construye el XML sin validar (usar `generarFichero`, que valida antes y después). */
export function construirXml(e: Establecimiento, reservas: Reserva[], tipo: TipoComunicacion): string {
  const solicitud =
    tipo === 'partes'
      ? bloque('solicitud', [hoja('codigoEstablecimiento', e.codigoEstablecimiento), ...reservas.map(comunicacionParte)])
      : bloque('solicitud', reservas.map((r) => comunicacionReserva(e, r)))
  return `${CABECERA_XML}\n${renderizar(bloque('peticion', [solicitud]))}\n`
}

export function nombreFichero(tipo: TipoComunicacion, ahora: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const marca = `${ahora.getFullYear()}${p(ahora.getMonth() + 1)}${p(ahora.getDate())}-${p(ahora.getHours())}${p(ahora.getMinutes())}`
  return `${tipo === 'partes' ? 'partes-viajeros' : 'reservas-hospedaje'}_${marca}.xml`
}
