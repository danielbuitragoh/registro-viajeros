import { describe, expect, it } from 'vitest'
import { IDIOMAS, TEXTOS, t, type ClaveTexto } from '../src/i18n/textos'
import { ETIQUETAS_CODIGOS, etiquetaCodigo } from '../src/i18n/codigos'
import { mensajeIncidencia } from '../src/i18n/mensajes'
import { PARENTESCO, SEXO, TIPO_DOCUMENTO } from '../src/oficial/codigos'
import { nombrePais, paisesOrdenados } from '../src/oficial/paises'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const claves = Object.keys(TEXTOS.es) as ClaveTexto[]
const otros = IDIOMAS.filter((i) => i !== 'es')

describe('i18n: español, inglés, francés, alemán, italiano y portugués', () => {
  it('los idiomas del formulario del huésped son exactamente es, en, fr, de, it y pt', () => {
    expect([...IDIOMAS]).toEqual(['es', 'en', 'fr', 'de', 'it', 'pt'])
    expect(Object.keys(TEXTOS).sort()).toEqual([...IDIOMAS].sort())
  })

  it.each(otros)('%s tiene exactamente las mismas claves que es (ni falta ni sobra ninguna) y ningún texto vacío', (idioma) => {
    const tabla = TEXTOS[idioma]
    expect(Object.keys(tabla).sort()).toEqual([...claves].sort())
    for (const k of claves) expect(tabla[k]?.trim(), `${idioma} ${k}`).toBeTruthy()
  })

  it.each(otros)('%s: los marcadores {param} coinciden con el español', (idioma) => {
    for (const k of claves) expect(placeholders(TEXTOS[idioma][k]), `${idioma} ${k}`).toEqual(placeholders(TEXTOS.es[k]))
  })

  it.each(['fr', 'de', 'it', 'pt'] as const)('%s está traducido de verdad (menos del 10 %% de textos idénticos al español o al inglés)', (idioma) => {
    const iguales = claves.filter((k) => TEXTOS[idioma][k] === TEXTOS.es[k] || TEXTOS[idioma][k] === TEXTOS.en[k])
    expect(iguales.length / claves.length, iguales.join(', ')).toBeLessThan(0.1)
  })

  it('cada idioma se nombra en su propia lengua', () => {
    expect(IDIOMAS.map((i) => t(i, 'idioma.nombre'))).toEqual(['Español', 'English', 'Français', 'Deutsch', 'Italiano', 'Português'])
  })

  it('sustituye parámetros y deja a la vista los que faltan', () => {
    expect(t('es', 'e.longitud_max', { max: 50 })).toBe('Máximo 50 caracteres.')
    expect(t('en', 'e.doc_letra', { esperada: 'Z' })).toContain('should be Z')
    expect(t('de', 'e.longitud_max', { max: 50 })).toContain('50')
    expect(t('es', 'e.longitud_max')).toContain('{max}')
  })

  it('un código desconocido nunca rompe la interfaz', () => {
    expect(mensajeIncidencia({ codigo: 'inventado_xyz' }, 'fr')).toBe('inventado_xyz')
  })
})

describe('etiquetas de los códigos oficiales en cada idioma (solo se traduce el texto visible, nunca el código)', () => {
  const tablas = { PARENTESCO, SEXO, TIPO_DOCUMENTO }
  it.each(IDIOMAS)('%s: hay etiqueta para cada código oficial y para ningún código más', (idioma) => {
    for (const [nombre, tabla] of Object.entries(tablas) as [keyof typeof tablas, Record<string, unknown>][]) {
      const codigos = Object.keys(tabla)
      if (idioma !== 'es' && idioma !== 'en') expect(Object.keys(ETIQUETAS_CODIGOS[idioma][nombre]).sort(), `${idioma} ${nombre}`).toEqual([...codigos].sort())
      for (const c of codigos) expect(etiquetaCodigo(nombre, c, idioma).trim(), `${idioma} ${nombre}.${c}`).toBeTruthy()
    }
  })

  it('es y en salen de la transcripción oficial (src/oficial/codigos.ts)', () => {
    expect(etiquetaCodigo('PARENTESCO', 'PM', 'es')).toBe(PARENTESCO.PM.es)
    expect(etiquetaCodigo('TIPO_DOCUMENTO', 'PAS', 'en')).toBe(TIPO_DOCUMENTO.PAS.en)
    expect(etiquetaCodigo('TIPO_DOCUMENTO', 'PAS', 'de')).toBe('Reisepass')
  })
})

describe('nombres de países en cada idioma (Intl.DisplayNames, sin tablas propias)', () => {
  it.each([
    ['fr', 'Allemagne'],
    ['de', 'Deutschland'],
    ['it', 'Germania'],
    ['pt', 'Alemanha'],
  ] as const)('%s', (idioma, alemania) => {
    expect(nombrePais('DEU', idioma)).toBe(alemania)
    expect(paisesOrdenados(idioma)).toHaveLength(249)
  })
})
