/**
 * Contenido legible de la ficha del huésped para entregarla en recepción (pre-check-in): papel o PDF.
 * Etiquetas y valores van en español (para recepción) y, si el huésped usa otro idioma, también en el suyo.
 * Los códigos oficiales se muestran como su texto (p. ej. «Pasaporte»); nunca se añaden códigos ni campos nuevos.
 */
import type { Viajero } from '../domain/tipos'
import { etiquetaCodigo } from '../i18n/codigos'
import { etiquetaCampo } from '../i18n/mensajes'
import { t, type ClaveTexto, type Idioma } from '../i18n/textos'
import { nombrePais } from '../oficial/paises'
import type { DatosEnlace } from './enlace'

export interface FilaFicha {
  etiqueta: string
  valor: string
}
export interface ContenidoFicha {
  idioma: Idioma
  titulo: string
  cabecera: FilaFicha[]
  viajeros: { titulo: string; filas: FilaFicha[] }[]
  tituloQr: string
  ayudaQr: string
  pie: string
  /** Texto de «Página {n}/{total}» ya bilingüe, con los marcadores sin sustituir. */
  pagina: string
}

const juntar = (a: string, b: string) => (a === b ? a : `${a} / ${b}`)

/** AAAA-MM-DD → DD/MM/AAAA; AAAA-MM-DDThh:mm → DD/MM/AAAA hh:mm. Si no encaja, se deja tal cual. */
export function fechaLegible(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s)
  if (!m) return s
  const [, a, me, d, h, mi] = m
  return `${d}/${me}/${a}${h ? ` ${h}:${mi}` : ''}`
}

export function contenidoFicha(datos: DatosEnlace, viajeros: Viajero[], idioma: Idioma): ContenidoFicha {
  const bi = (k: ClaveTexto, p?: Record<string, string | number>) => juntar(t('es', k, p), t(idioma, k, p))
  const et = (campo: string) => juntar(etiquetaCampo(campo, 'es'), etiquetaCampo(campo, idioma))
  const cod = (tabla: Parameters<typeof etiquetaCodigo>[0], c: string | undefined) => (c ? juntar(etiquetaCodigo(tabla, c, 'es'), etiquetaCodigo(tabla, c, idioma)) : undefined)
  const pais = (a: string | undefined) => (a ? `${juntar(nombrePais(a, 'es'), nombrePais(a, idioma))} (${a})` : undefined)
  const filas = (pares: [string, string | undefined][]): FilaFicha[] =>
    pares.filter((p): p is [string, string] => typeof p[1] === 'string' && p[1].trim() !== '').map(([campo, valor]) => ({ etiqueta: et(campo), valor: valor.trim() }))

  const nombreDe = (id: string | undefined) => {
    const a = viajeros.find((x) => x.id === id)
    return a ? `${a.nombre} ${a.apellido1}`.trim() : undefined
  }

  return {
    idioma,
    titulo: bi('h.ficha.titulo'),
    cabecera: [
      { etiqueta: et('nombre_establecimiento'), valor: datos.est },
      { etiqueta: et('entrada'), valor: fechaLegible(datos.ent) },
      { etiqueta: et('salida'), valor: fechaLegible(datos.sal) },
      { etiqueta: et('numPersonas'), valor: String(datos.n) },
    ],
    viajeros: viajeros.map((v, i) => ({
      titulo: bi('h.viajero.titulo', { n: i + 1 }),
      filas: filas([
        ['nombre', v.nombre],
        ['apellido1', v.apellido1],
        ['apellido2', v.apellido2],
        ['fechaNacimiento', fechaLegible(v.fechaNacimiento)],
        ['nacionalidad', pais(v.nacionalidad)],
        ['sexo', cod('SEXO', v.sexo)],
        ['tipoDocumento', cod('TIPO_DOCUMENTO', v.tipoDocumento)],
        ['numeroDocumento', v.numeroDocumento],
        ['soporteDocumento', v.soporteDocumento],
        ['direccion.direccion', v.direccion.direccion],
        ['direccion.direccionComplementaria', v.direccion.direccionComplementaria],
        ['direccion.codigoPostal', v.direccion.codigoPostal],
        ['direccion.nombreMunicipio', v.direccion.nombreMunicipio],
        ['direccion.codigoMunicipio', v.direccion.codigoMunicipio],
        ['direccion.pais', pais(v.direccion.pais)],
        ['telefono', v.telefono],
        ['telefono2', v.telefono2],
        ['correo', v.correo],
        ['responsable', v.responsable ? nombreDe(v.responsable.adultoId) : undefined],
        ['responsable.parentesco', cod('PARENTESCO', v.responsable?.parentesco)],
      ]),
    })),
    tituloQr: bi('h.ficha.qr'),
    ayudaQr: bi('h.ficha.qr_ayuda'),
    pie: bi('h.ficha.pie'),
    pagina: bi('h.ficha.pagina'),
  }
}
