import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Comprobación numérica de WCAG 1.4.3 (texto ≥ 4,5:1) y 1.4.11 (componentes ≥ 3:1) sobre la paleta REAL del sistema de
 * diseño (src/diseno/tokens.css), en el tema claro y en el oscuro. La app y la presentación usan ese mismo fichero.
 */
const leer = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
const tokens = leer('src/diseno/tokens.css')

/** Variables `--x: #hex` de un bloque CSS cuyo selector es exactamente `selector`. */
function bloque(css: string, selector: string): Record<string, string> {
  const i = css.indexOf(`${selector} {`)
  if (i < 0) throw new Error(`No está el bloque ${selector}`)
  const cuerpo = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i))
  return Object.fromEntries([...cuerpo.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2] as string]))
}

const claro = bloque(tokens, ':root')
const oscuroManual = bloque(tokens, ":root[data-theme='oscuro']")
const oscuroSistema = bloque(tokens, ":root:not([data-theme='claro'])")

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number)
}
export const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return ((l1 as number) + 0.05) / ((l2 as number) + 0.05)
}

/** Texto sobre fondo: todas las combinaciones que usa la interfaz. */
const TEXTO: [string, string][] = [
  ['texto', 'fondo'],
  ['texto', 'fondo-suave'],
  ['texto', 'superficie'],
  ['texto', 'campo-fondo'],
  ['texto', 'info-fondo'],
  ['texto-suave', 'fondo'],
  ['texto-suave', 'fondo-suave'],
  ['texto-suave', 'superficie'],
  ['primario', 'fondo'],
  ['primario', 'fondo-suave'],
  ['primario', 'superficie'],
  ['primario', 'info-fondo'],
  ['sobre-primario', 'primario'],
  ['sobre-primario', 'primario-hover'],
  ['error', 'fondo'],
  ['error', 'superficie'],
  ['error', 'error-fondo'],
  ['aviso', 'fondo'],
  ['aviso', 'superficie'],
  ['aviso', 'aviso-fondo'],
  ['ok', 'fondo'],
  ['ok', 'superficie'],
  ['ok', 'ok-fondo'],
]
/** Bordes, foco e iconos sin texto (componentes de interfaz). */
const COMPONENTES: [string, string][] = [
  ['borde', 'fondo'],
  ['borde', 'superficie'],
  ['borde', 'campo-fondo'],
  ['foco', 'fondo'],
  ['foco', 'superficie'],
  ['foco', 'fondo-suave'],
  ['primario', 'fondo'],
  ['error', 'fondo'],
]

describe.each([
  ['claro', claro],
  ['oscuro', oscuroManual],
])('contraste de la paleta, tema %s (WCAG 2.2 AA)', (_tema, paleta) => {
  const v = (n: string) => {
    expect(paleta[n], `falta --${n}`).toMatch(/^#[0-9a-fA-F]{6}$/)
    return paleta[n] as string
  }
  it.each(TEXTO)('texto %s sobre %s ≥ 4,5:1', (fg, bg) => {
    expect(ratio(v(fg), v(bg)), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5)
  })
  it.each(COMPONENTES)('componente %s contra %s ≥ 3:1', (fg, bg) => {
    expect(ratio(v(fg), v(bg)), `${fg} contra ${bg}`).toBeGreaterThanOrEqual(3)
  })
})

describe('un solo sistema de diseño', () => {
  it('los dos temas definen exactamente los mismos tokens de color', () => {
    expect(Object.keys(oscuroManual).sort()).toEqual(Object.keys(claro).sort())
  })

  it('el oscuro automático (según el sistema) y el elegido a mano son idénticos', () => {
    expect(oscuroSistema).toEqual(oscuroManual)
    expect(tokens).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='claro'\]\)/)
  })

  it('tipografía, espaciado, radios y tamaño táctil son tokens (toque mínimo 48 px)', () => {
    for (const t of ['fuente', 'fs-s', 'fs-m', 'fs-l', 'fs-xl', 'fs-xxl', 'e-1', 'e-2', 'e-3', 'e-4', 'e-5', 'e-6', 'radio', 'radio-g', 'sombra', 'toque', 'toque-g']) {
      expect(tokens, `--${t}`).toMatch(new RegExp(`--${t}:`))
    }
    expect(tokens).toMatch(/--toque:\s*48px/)
  })

  it.each(['src/estilos.css', 'presentacion/presentacion.css'])('%s importa los tokens y no redefine ningún color propio', (f) => {
    const css = leer(f)
    expect(css).toMatch(/@import ['"][./]+(src\/)?diseno\/tokens\.css['"]/)
    expect([...css.matchAll(/--[\w-]+:\s*#[0-9a-fA-F]{3,6}/g)].map((m) => m[0])).toEqual([])
  })

  it('las hojas de estilo no usan colores sueltos que rompan el modo oscuro (salvo el blanco del QR, que debe ser blanco)', () => {
    for (const f of ['src/estilos.css', 'presentacion/presentacion.css']) {
      const sueltos = leer(f)
        .split('\n')
        .filter((l) => /#[0-9a-fA-F]{3,6}\b/.test(l) && !/permitido: QR/.test(l))
      expect(sueltos, f).toEqual([])
    }
  })
})
