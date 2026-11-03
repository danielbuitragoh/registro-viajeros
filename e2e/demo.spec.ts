import { devices } from '@playwright/test'
import { expect, test } from './guardia'

test.use({ ...devices['Pixel 7'] })

test('demo en el móvil: la lista aparece completa y cada «Abrir» abre SU reserva (error visto al probar la demo)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' }).tap()
  const botones = page.getByRole('button', { name: /^Abrir reserva DEMO-/ })
  await expect(botones.first()).toBeVisible()

  // La página no puede ser más ancha que la pantalla: si lo es, el móvil reduce el zoom o se arrastra de lado
  // y el dedo no cae donde se ve (la tabla tiene su propio scroll horizontal).
  const anchos = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, pantalla: document.documentElement.clientWidth }))
  expect(anchos.pagina).toBeLessThanOrEqual(anchos.pantalla)

  // La tabla ya no cambia: misma lista y mismas posiciones al aparecer y medio segundo después
  const foto = () => botones.evaluateAll((bs) => bs.map((b) => `${b.textContent}@${Math.round(b.getBoundingClientRect().top)}`))
  const antes = await foto()
  await page.waitForTimeout(500)
  expect(await foto()).toEqual(antes)

  // Tocar cada fila abre exactamente esa reserva
  const refs = antes.map((x) => (/DEMO-\d+/.exec(x) as RegExpExecArray)[0])
  expect(refs.length).toBeGreaterThan(2)
  for (const ref of refs) {
    await page.getByRole('button', { name: `Abrir reserva ${ref}` }).tap()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Reserva ${ref}`)
    await page.getByRole('button', { name: '← Volver' }).tap()
  }
})
