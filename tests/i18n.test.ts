import { describe, expect, it } from 'vitest'
import { TEXTOS, t } from '../src/i18n/textos'
import { mensajeIncidencia } from '../src/i18n/mensajes'

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('i18n ES/EN', () => {
  const claves = Object.keys(TEXTOS.es) as (keyof typeof TEXTOS.es)[]

  it('EN tiene exactamente las mismas claves que ES, sin textos vacíos', () => {
    expect(Object.keys(TEXTOS.en).sort()).toEqual([...claves].sort())
    for (const k of claves) {
      expect(TEXTOS.es[k].trim(), `es ${k}`).not.toBe('')
      expect(TEXTOS.en[k].trim(), `en ${k}`).not.toBe('')
    }
  })

  it('los marcadores {param} coinciden entre idiomas', () => {
    for (const k of claves) expect(placeholders(TEXTOS.en[k]), k).toEqual(placeholders(TEXTOS.es[k]))
  })

  it('sustituye parámetros y deja a la vista los que faltan', () => {
    expect(t('es', 'e.longitud_max', { max: 50 })).toBe('Máximo 50 caracteres.')
    expect(t('en', 'e.doc_letra', { esperada: 'Z' })).toContain('should be Z')
    expect(t('es', 'e.longitud_max')).toContain('{max}')
  })

  it('un código desconocido nunca rompe la interfaz', () => {
    expect(mensajeIncidencia({ codigo: 'inventado_xyz' }, 'es')).toBe('inventado_xyz')
  })
})
