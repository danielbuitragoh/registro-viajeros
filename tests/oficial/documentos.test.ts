import { describe, expect, it } from 'vitest'
import { TIPO_DOCUMENTO } from '../../src/oficial/codigos'
import { REGLAS_DOCUMENTO, ejemploDocumento } from '../../src/oficial/documentos'
import { validarDNI, validarNIE } from '@danielbuitragoh/documentos-es'
import { validarPasaporte } from '../../src/validators/pasaporte'
import { validarViajero } from '../../src/validators/viajero'
import { adulto, extranjero } from '../fixtures'

/**
 * Tipos de documento admitidos: EXACTAMENTE los de la tabla 8.5 de docs/oficial/Instrucciones.pdf
 * (NIF, NIE, PAS, OTRO), con las reglas que el §3 asocia a cada uno. Nada más.
 */
describe('tipos de documento (§8.5) y sus reglas (§3)', () => {
  it('hay reglas para cada código de la tabla 8.5 y para ningún otro, en el mismo orden', () => {
    expect(Object.keys(REGLAS_DOCUMENTO)).toEqual(Object.keys(TIPO_DOCUMENTO))
    expect(Object.keys(REGLAS_DOCUMENTO)).toEqual(['NIF', 'NIE', 'PAS', 'OTRO'])
  })

  it('§3: soporte obligatorio con NIF o NIE; segundo apellido obligatorio con NIF; formato válido exigido solo a NIF y NIE', () => {
    expect(Object.fromEntries(Object.entries(REGLAS_DOCUMENTO).map(([k, r]) => [k, [r.soporteObligatorio, r.apellido2Obligatorio, r.formatoOficial]]))).toEqual({
      NIF: [true, true, true],
      NIE: [true, false, true],
      PAS: [false, false, false],
      OTRO: [false, false, false],
    })
  })

  it('cada regla cita el apartado del documento oficial del que sale', () => {
    for (const r of Object.values(REGLAS_DOCUMENTO)) expect(r.fuente).toMatch(/§8\.5/)
    expect(REGLAS_DOCUMENTO.NIF.fuente).toMatch(/§3/)
    expect(REGLAS_DOCUMENTO.NIE.fuente).toMatch(/§3/)
  })

  it('longitud máxima del número: String(15) en los cuatro', () => {
    for (const r of Object.values(REGLAS_DOCUMENTO)) expect(r.longitudMax).toBe(15)
  })

  it('los ejemplos que se enseñan al huésped son ficticios pero válidos (letra de control correcta)', () => {
    expect(ejemploDocumento('NIF')).toBe('12345678Z')
    expect(validarDNI(ejemploDocumento('NIF') as string).ok).toBe(true)
    expect(ejemploDocumento('NIE')).toBe('X1234567L')
    expect(validarNIE(ejemploDocumento('NIE') as string).ok).toBe(true)
    // Pasaporte y «otro»: el documento no define formato (P10), no se inventa un ejemplo
    expect(ejemploDocumento('PAS')).toBeUndefined()
    expect(ejemploDocumento('OTRO')).toBeUndefined()
    expect(validarPasaporte('X1234567').ok).toBe(true)
  })
})

describe('el número debe corresponder al tipo elegido (§3: «Deberá corresponder al tipo de documento»)', () => {
  const ctx = { fechaEntrada: '2026-11-02', modo: 'parte' as const }
  const avisos = (v: Parameters<typeof validarViajero>[0]) => validarViajero(v, ctx).filter((i) => i.campo === 'numeroDocumento')

  it('un DNI escrito como pasaporte u «otro documento» da un AVISO (no bloquea) para elegir «DNI / NIF»', () => {
    for (const tipo of ['PAS', 'OTRO'] as const) {
      expect(avisos(extranjero({ tipoDocumento: tipo, numeroDocumento: '12345678Z' }))).toEqual([{ campo: 'numeroDocumento', codigo: 'doc_parece_dni_otro_tipo', gravedad: 'aviso' }])
    }
  })

  it('un NIE escrito como pasaporte u «otro documento» da un AVISO para elegir «NIE»', () => {
    for (const tipo of ['PAS', 'OTRO'] as const) {
      expect(avisos(extranjero({ tipoDocumento: tipo, numeroDocumento: 'X1234567L' }))).toEqual([{ campo: 'numeroDocumento', codigo: 'doc_parece_nie_otro_tipo', gravedad: 'aviso' }])
    }
  })

  it('un número que solo PARECE un DNI pero no tiene la letra correcta no se confunde (puede ser un pasaporte real)', () => {
    expect(avisos(extranjero({ tipoDocumento: 'OTRO', numeroDocumento: '12345678A' }))).toEqual([])
  })

  it('«otro documento» con un número de carné extranjero normal: sin errores ni avisos', () => {
    expect(avisos(extranjero({ tipoDocumento: 'OTRO', numeroDocumento: 'T22000129', nacionalidad: 'DEU' }))).toEqual([])
  })

  it('«otro documento» de más de 15 caracteres: error (String(15))', () => {
    expect(avisos(extranjero({ tipoDocumento: 'OTRO', numeroDocumento: 'A'.repeat(16) }))).toEqual([{ campo: 'numeroDocumento', codigo: 'longitud_max', gravedad: 'error', params: { max: 15 } }])
  })

  it('sin cambios para DNI y NIE bien elegidos', () => {
    expect(avisos(adulto())).toEqual([])
  })
})
