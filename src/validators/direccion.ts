import type { Direccion, Incidencia } from '../domain/tipos'
import { alfa3Espana, esPaisAlfa3 } from '../oficial/paises'

const err = (campo: string, codigo: string, params?: Incidencia['params']): Incidencia => ({
  campo,
  codigo,
  gravedad: 'error',
  ...(params ? { params } : {}),
})

const vacio = (s: string | undefined) => s === undefined || s.trim() === ''

function maxLen(out: Incidencia[], campo: string, valor: string | undefined, max: number) {
  if (valor !== undefined && valor.length > max) out.push(err(campo, 'longitud_max', { max }))
}

/** Valida el bloque `direccion` (§7.1). Los campos de `campo` son relativos al bloque. */
export function validarDireccion(d: Direccion): Incidencia[] {
  const out: Incidencia[] = []

  if (vacio(d.direccion)) out.push(err('direccion', 'requerido'))
  maxLen(out, 'direccion', d.direccion, 100)
  maxLen(out, 'direccionComplementaria', d.direccionComplementaria, 100)

  if (vacio(d.pais)) out.push(err('pais', 'requerido'))
  else if (!esPaisAlfa3(d.pais)) out.push(err('pais', 'pais_invalido'))

  if (vacio(d.codigoPostal)) out.push(err('codigoPostal', 'requerido'))
  maxLen(out, 'codigoPostal', d.codigoPostal, 20)

  if (d.pais === alfa3Espana) {
    if (vacio(d.codigoMunicipio)) out.push(err('codigoMunicipio', 'requerido'))
    else if (!/^\d{5}$/.test(d.codigoMunicipio as string)) out.push(err('codigoMunicipio', 'municipio_ine_formato'))
    if (!vacio(d.codigoPostal) && !/^\d{5}$/.test(d.codigoPostal)) {
      out.push({ campo: 'codigoPostal', codigo: 'cp_espana_formato', gravedad: 'aviso' })
    }
  } else if (!vacio(d.pais)) {
    if (vacio(d.nombreMunicipio)) out.push(err('nombreMunicipio', 'requerido'))
  }
  maxLen(out, 'nombreMunicipio', d.nombreMunicipio, 100)

  return out
}
