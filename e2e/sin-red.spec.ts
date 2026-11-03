import { crearGuardia, expect, test } from './guardia'

/** Recorre toda la app (recepción con datos de demo y formulario del huésped en los 6 idiomas) sin salir del propio origen. */
test('ninguna pantalla hace peticiones a otro origen (recepción, exportación, ajustes, huésped en 6 idiomas, PDF)', async ({ page, guardia }) => {
  await page.goto('/')
  // La CSP de producción está puesta y solo permite el propio origen
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self'")

  await page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' }).click()
  await expect(page.getByRole('heading', { name: 'Lista del día' })).toBeVisible()
  for (const [enlace, titulo] of [
    ['Reservas', 'Reservas'],
    ['Exportar', 'Exportar fichero de alta masiva'],
    ['Ajustes', 'Ajustes'],
    ['Hoy', 'Lista del día'],
  ]) {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: enlace, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
  }
  await page.getByRole('button', { name: /^Abrir reserva DEMO-/ }).first().click()
  await page.getByRole('button', { name: 'Crear enlace para el huésped' }).click()
  const enlace = await page.getByLabel('Enlace para el huésped').inputValue()

  const huesped = await page.context().newPage()
  await huesped.goto(enlace)
  for (const [l, titulo] of [
    ['en', 'Traveller details'],
    ['fr', 'Données des voyageurs'],
    ['de', 'Angaben der Reisenden'],
    ['it', 'Dati dei viaggiatori'],
    ['pt', 'Dados dos viajantes'],
    ['es', 'Datos de los viajeros'],
  ]) {
    await huesped.locator('#idioma-huesped').selectOption(l)
    await expect(huesped.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    await expect(huesped.locator('html')).toHaveAttribute('lang', l)
  }
  await huesped.waitForLoadState('networkidle')
  expect(guardia.externas).toEqual([])
  expect(guardia.violacionesCsp).toEqual([])
})

test('control: la guardia SÍ detecta una petición a otro origen (si no, las demás pruebas no demostrarían nada)', async ({ browser }) => {
  const ctx = await browser.newContext()
  const g = crearGuardia()
  await g.vigilar(ctx)
  const p = await ctx.newPage()
  await p.goto('/')
  // Página sin la app: una imagen externa cualquiera
  await p.setContent('<img src="https://ejemplo.invalid/rastreador.png" alt="">')
  await expect.poll(() => g.externas).toContain('https://ejemplo.invalid/rastreador.png')
  await ctx.close()
})
