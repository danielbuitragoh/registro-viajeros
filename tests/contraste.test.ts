import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Comprobación numérica de WCAG 1.4.3 (texto ≥ 4,5:1) y 1.4.11 (componentes ≥ 3:1) sobre la paleta real de estilos.css. */
const css = readFileSync(resolve(process.cwd(), 'src/estilos.css'), 'utf8')
const vars = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2] as string]))

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number)
}
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return ((l1 as number) + 0.05) / ((l2 as number) + 0.05)
}
const v = (n: string) => vars[n] as string

describe('contraste de la paleta (WCAG 2.2 AA)', () => {
  it.each([
    ['texto', 'fondo'],
    ['texto', 'fondo-suave'],
    ['texto-suave', 'fondo'],
    ['texto-suave', 'fondo-suave'],
    ['primario', 'fondo'],
    ['primario', 'fondo-suave'],
    ['primario', 'info-fondo'],
    ['sobre-primario', 'primario'],
    ['sobre-primario', 'primario-hover'],
    ['error', 'fondo'],
    ['error', 'error-fondo'],
    ['aviso', 'fondo'],
    ['aviso', 'aviso-fondo'],
    ['ok', 'fondo'],
    ['ok', 'ok-fondo'],
    ['texto', 'info-fondo'],
  ])('texto %s sobre %s ≥ 4,5:1', (fg, bg) => {
    expect(ratio(v(fg), v(bg)), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['borde', 'fondo'],
    ['foco', 'fondo'],
    ['primario', 'fondo'],
    ['error', 'fondo'],
  ])('componente/borde %s contra %s ≥ 3:1', (fg, bg) => {
    expect(ratio(v(fg), v(bg)), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(3)
  })
})
