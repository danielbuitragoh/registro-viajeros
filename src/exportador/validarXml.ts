/**
 * Segunda barrera: reparsea el XML YA generado y lo comprueba contra el esquema transcrito del documento oficial
 * (estructura, orden, cardinalidad, longitudes, formatos, códigos y obligatoriedades condicionales).
 * No usa `construir.ts`: si el constructor tuviera un fallo, este validador lo detectaría antes de la descarga.
 */
import type { Incidencia, TipoComunicacion } from '../domain/tipos'
import { esPaisAlfa3 } from '../oficial/paises'
import { validarDNI, validarNIE } from '@danielbuitragoh/documentos-es'
import { esFechaHoraValida, esFechaValida, esMayorDeEdad, soloFecha } from '../validators/fechas'
import { ESQUEMA_PARTES, ESQUEMA_RESERVAS, type Def, type Regla } from './esquema'

const err = (campo: string, codigo: string, params?: Incidencia['params']): Incidencia => ({
  campo,
  codigo,
  gravedad: 'error',
  ...(params ? { params } : {}),
})

function hijosDirectos(el: Element): Element[] {
  return Array.from(el.children)
}
const hijo = (el: Element, tag: string): Element | undefined => hijosDirectos(el).find((c) => c.tagName === tag)
const texto = (el: Element, tag: string): string | undefined => hijo(el, tag)?.textContent?.trim() || undefined

function comprobarRegla(regla: Regla, valor: string, ruta: string, out: Incidencia[]) {
  switch (regla.k) {
    case 'str':
      if (valor.length > regla.max) out.push(err(ruta, 'xml_longitud_max', { max: regla.max }))
      break
    case 'fecha':
      if (!esFechaValida(valor)) out.push(err(ruta, 'xml_formato_fecha', { formato: 'AAAA-MM-DD' }))
      break
    case 'fechaHora':
      if (!/T\d{2}:\d{2}:\d{2}$/.test(valor) || !esFechaHoraValida(valor)) out.push(err(ruta, 'xml_formato_fecha', { formato: 'AAAA-MM-DDThh:mm:ss' }))
      break
    case 'entero':
      if (!/^\d+$/.test(valor) || Number(valor) < 1) out.push(err(ruta, 'xml_numero_invalido'))
      break
    case 'pais':
      if (!esPaisAlfa3(valor)) out.push(err(ruta, 'xml_pais_invalido'))
      break
    case 'ine':
      if (!/^\d{5}$/.test(valor)) out.push(err(ruta, 'xml_municipio_ine_formato'))
      break
    case 'caducidad':
      if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(valor)) out.push(err(ruta, 'xml_formato_caducidad'))
      break
    case 'codigo':
      if (!Object.prototype.hasOwnProperty.call(regla.tabla, valor) || valor.length > regla.max) out.push(err(ruta, 'xml_codigo_invalido'))
      break
  }
}

function validarEstructura(el: Element, def: Def, ruta: string, out: Incidencia[]) {
  if (!def.hijos) {
    // Hoja
    const v = el.textContent?.trim() ?? ''
    if (hijosDirectos(el).length > 0) out.push(err(ruta, 'xml_estructura_invalida'))
    else if (v === '') out.push(err(ruta, 'xml_valor_vacio'))
    else if (def.regla) comprobarRegla(def.regla, v, ruta, out)
    return
  }

  const hijos = hijosDirectos(el)
  const indiceDef = (tag: string) => def.hijos!.findIndex((d) => d.n === tag)
  let ultimo = -1
  const cuenta = new Map<string, number>()

  for (const h of hijos) {
    const i = indiceDef(h.tagName)
    if (i === -1) {
      out.push(err(`${ruta}/${h.tagName}`, 'xml_elemento_desconocido'))
      continue
    }
    const d = def.hijos[i] as Def
    if (i < ultimo) out.push(err(`${ruta}/${h.tagName}`, 'xml_orden_invalido'))
    ultimo = Math.max(ultimo, i)
    const n = (cuenta.get(d.n) ?? 0) + 1
    cuenta.set(d.n, n)
    if (n > 1 && !d.rep && !def.eleccion) out.push(err(`${ruta}/${h.tagName}`, 'xml_elemento_duplicado'))
    validarEstructura(h, d, `${ruta}/${d.n}${d.rep ? `[${n}]` : ''}`, out)
  }

  if (def.eleccion) {
    const presentes = def.hijos.filter((d) => cuenta.has(d.n)).length
    if (presentes === 0) out.push(err(ruta, 'xml_elemento_falta', { elemento: def.hijos.map((d) => d.n).join('|') }))
    if (presentes > 1) out.push(err(ruta, 'xml_establecimiento_ambiguo'))
    return
  }
  for (const d of def.hijos) {
    if (d.req && !cuenta.has(d.n)) out.push(err(`${ruta}/${d.n}`, 'xml_elemento_falta', { elemento: d.n }))
  }
}

/** Reglas condicionales y cruzadas (apartados 3, 4 y 7 del documento). */
function validarCondicionales(raiz: Element, tipo: TipoComunicacion, out: Incidencia[]) {
  const solicitud = hijo(raiz, 'solicitud')
  if (!solicitud) return
  const comunicaciones = hijosDirectos(solicitud).filter((c) => c.tagName === 'comunicacion')

  comunicaciones.forEach((com, ci) => {
    const base = `peticion/solicitud/comunicacion[${ci + 1}]`
    const contrato = hijo(com, 'contrato')
    const entrada = contrato ? texto(contrato, 'fechaEntrada') : undefined
    const salida = contrato ? texto(contrato, 'fechaSalida') : undefined
    if (entrada && salida && esFechaHoraValida(entrada) && esFechaHoraValida(salida) && salida <= entrada) {
      out.push(err(`${base}/contrato/fechaSalida`, 'xml_salida_anterior_entrada'))
    }
    const fechaEntrada = entrada && esFechaHoraValida(entrada) ? soloFecha(entrada) : undefined

    // §7.1: municipio según país (dirección de persona y de establecimiento)
    const direcciones: [Element, string][] = []
    hijosDirectos(com)
      .filter((c) => c.tagName === 'persona')
      .forEach((p, pi) => {
        const d = hijo(p, 'direccion')
        if (d) direcciones.push([d, `${base}/persona[${pi + 1}]/direccion`])
      })
    const dEst = hijo(com, 'establecimiento')?.querySelector('datosEstablecimiento > direccion')
    if (dEst) direcciones.push([dEst, `${base}/establecimiento/datosEstablecimiento/direccion`])
    for (const [d, ruta] of direcciones) {
      const pais = texto(d, 'pais')
      if (!pais) continue
      if (pais === 'ESP' && !texto(d, 'codigoMunicipio')) out.push(err(`${ruta}/codigoMunicipio`, 'xml_municipio_requerido'))
      if (pais !== 'ESP' && !texto(d, 'nombreMunicipio')) out.push(err(`${ruta}/nombreMunicipio`, 'xml_municipio_requerido'))
    }

    const personas = hijosDirectos(com).filter((c) => c.tagName === 'persona')
    let hayMenor = false
    let adultoConParentesco = false

    personas.forEach((p, pi) => {
      const ruta = `${base}/persona[${pi + 1}]`
      // Al menos uno de telefono, telefono2 o correo (ambos apartados)
      if (!texto(p, 'telefono') && !texto(p, 'telefono2') && !texto(p, 'correo')) out.push(err(`${ruta}/telefono`, 'xml_contacto_requerido'))

      const tipoDoc = texto(p, 'tipoDocumento')
      const numDoc = texto(p, 'numeroDocumento')
      if (numDoc && (tipoDoc === 'NIF' || tipoDoc === 'NIE')) {
        const r = tipoDoc === 'NIF' ? validarDNI(numDoc) : validarNIE(numDoc)
        if (!r.ok) out.push(err(`${ruta}/numeroDocumento`, 'xml_documento_invalido'))
      }

      if (tipo !== 'partes') return
      if (tipoDoc === 'NIF' && !texto(p, 'apellido2')) out.push(err(`${ruta}/apellido2`, 'xml_apellido2_requerido'))
      if ((tipoDoc === 'NIF' || tipoDoc === 'NIE') && !texto(p, 'soporteDocumento')) out.push(err(`${ruta}/soporteDocumento`, 'xml_soporte_requerido'))
      const nac = texto(p, 'fechaNacimiento')
      if (nac && esFechaValida(nac) && fechaEntrada && nac <= fechaEntrada) {
        if (esMayorDeEdad(nac, fechaEntrada)) {
          if (!tipoDoc || !numDoc) out.push(err(`${ruta}/tipoDocumento`, 'xml_documento_requerido'))
          if (texto(p, 'parentesco')) adultoConParentesco = true
        } else hayMenor = true
      }
    })

    if (tipo === 'partes') {
      if (!personas.some((p) => texto(p, 'rol') === 'VI')) out.push(err(`${base}/persona`, 'xml_viajero_requerido'))
      if (hayMenor && !adultoConParentesco) out.push(err(`${base}/persona`, 'xml_parentesco_requerido'))
    } else {
      const titulares = personas.filter((p) => texto(p, 'rol') === 'TI').length
      if (titulares === 0) out.push(err(`${base}/persona`, 'xml_titular_requerido'))
      if (titulares > 1) out.push(err(`${base}/persona`, 'xml_titular_multiple'))
    }
  })
}

export function validarXml(xml: string, tipo: TipoComunicacion): Incidencia[] {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml')
  } catch {
    return [err('xml', 'xml_mal_formado')]
  }
  if (doc.getElementsByTagName('parsererror').length > 0 || !doc.documentElement) return [err('xml', 'xml_mal_formado')]

  const esquema = tipo === 'partes' ? ESQUEMA_PARTES : ESQUEMA_RESERVAS
  const raiz = doc.documentElement
  if (raiz.tagName !== esquema.n) return [err(raiz.tagName, 'xml_raiz_invalida')]

  const out: Incidencia[] = []
  validarEstructura(raiz, esquema, esquema.n, out)
  validarCondicionales(raiz, tipo, out)
  return out
}
