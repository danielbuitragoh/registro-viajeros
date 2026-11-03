import { createRequire } from 'node:module'
import type { Page } from '@playwright/test'
import { expect, test } from './guardia'

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js')

/** axe en el navegador real (aquí sí se mide el contraste): WCAG 2.0/2.1/2.2 A y AA y buenas prácticas. */
async function violacionesAxe(page: Page) {
  await page.addScriptTag({ path: axePath })
  return page.evaluate(async () => {
    const r = await (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    })
    return r.violations.map((v) => `${v.id} (${v.nodes.length})`)
  })
}

for (const [ruta, idioma, h1] of [
  ['/presentacion/', 'es', /registro de viajeros/i],
  ['/presentacion/en/', 'en', /guest registration/i],
] as const) {
  test(`presentación ${idioma}: sin violaciones de axe (con contraste), en escritorio y en móvil`, async ({ page }) => {
    await page.goto(ruta)
    await expect(page.locator('html')).toHaveAttribute('lang', idioma)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1)
    expect(await violacionesAxe(page)).toEqual([])
    await page.setViewportSize({ width: 360, height: 740 })
    expect(await violacionesAxe(page)).toEqual([])
    // Sin desplazamiento horizontal en un móvil estrecho
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })
}

test('presentación: rápida (sin JavaScript y poco peso) y la CSP de producción', async ({ page }) => {
  await page.goto('/presentacion/')
  await page.waitForLoadState('load')
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  const recursos = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const otros = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return {
      scripts: otros.filter((r) => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)).length,
      bytesSinImagenes: nav.encodedBodySize + otros.filter((r) => r.initiatorType !== 'img').reduce((n, r) => n + r.encodedBodySize, 0),
    }
  })
  expect(recursos.scripts).toBe(0)
  // HTML + CSS por debajo de 40 kB (las imágenes se cargan en diferido)
  expect(recursos.bytesSinImagenes).toBeLessThan(40_000)
})

test('presentación: el selector de idioma cambia de versión y los enlaces llevan a la demo', async ({ page }) => {
  await page.goto('/presentacion/')
  await page.getByRole('navigation', { name: 'Idioma' }).getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/presentacion\/en\/$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('navigation', { name: 'Language' }).getByRole('link', { name: 'Español' }).click()
  await expect(page).toHaveURL(/\/presentacion\/$/)
  await page.getByRole('main').getByRole('link', { name: /Probar la demo/ }).first().click()
  await expect(page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' })).toBeVisible()
  // y desde la app se vuelve a la presentación
  await page.getByRole('link', { name: /Qué es y qué no es esta app/ }).click()
  await expect(page).toHaveURL(/\/presentacion\/$/)
})
