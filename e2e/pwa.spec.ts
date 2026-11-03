import { appendFile, cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { servirCarpeta } from './servidorEstatico'
import { expect, test } from './guardia'

/** Espera a que el service worker esté activo y controle la página (primera carga completa). */
async function esperarServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true)
}

test('instalable: Chrome no encuentra ningún error de instalación y los iconos del manifiesto existen', async ({ page }) => {
  await page.goto('/')
  await esperarServiceWorker(page)
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifiesto = await (await page.request.get(new URL(href ?? '', page.url()).href)).json()
  expect(manifiesto.icons.length).toBeGreaterThanOrEqual(4)
  for (const i of manifiesto.icons) expect((await page.request.get(new URL(i.src, page.url()).href)).ok(), i.src).toBe(true)
})

test('sin conexión tras la primera carga: recepción, autocompletado de municipios y formulario del huésped', async ({ page, context }) => {
  await page.goto('/')
  await esperarServiceWorker(page)

  await context.setOffline(true)
  // De verdad no hay red: lo que no está precacheado falla
  expect(await page.evaluate(() => fetch('/no-precacheado.txt').then(() => 'ok', () => 'sin red'))).toBe('sin red')

  await page.reload()
  await page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' }).click()
  await expect(page.getByRole('heading', { name: 'Lista del día' })).toBeVisible()

  // Los trozos de la relación de municipios también están en el dispositivo
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('list', { name: 'Apartados de Ajustes' }).getByRole('link', { name: /Establecimiento/ }).click()
  const municipio = page.getByRole('combobox', { name: /^Nombre del municipio/ })
  await municipio.fill('aldea')
  await expect(page.getByRole('listbox').getByRole('option')).toHaveText(['Aldea de Prueba — 99002'])

  // Exportación (genera y valida el XML en el propio navegador)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Exportar', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Exportar fichero de alta masiva' })).toBeVisible()

  // Enlace del huésped abierto sin conexión (p. ej. el móvil de recepción que se presta en el mostrador)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Hoy', exact: true }).click()
  await page.getByRole('button', { name: /^Abrir reserva DEMO-/ }).first().click()
  await page.getByRole('button', { name: 'Crear enlace para el huésped' }).click()
  const enlace = await page.getByLabel('Enlace para el huésped').inputValue()
  const huesped = await context.newPage()
  await huesped.goto(enlace)
  await expect(huesped.getByRole('heading', { level: 1, name: 'Datos de los viajeros' })).toBeVisible()
  await huesped.getByRole('button', { name: 'Empezar' }).click()
  await huesped.getByRole('button', { name: 'Añadir viajero' }).click()
  await expect(huesped.getByRole('combobox', { name: /^Nombre del municipio/ })).toBeVisible()

  // La página de presentación también está en el dispositivo
  await page.goto('/presentacion/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/presentacion/en/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('aviso de nueva versión: al desplegar otra versión aparece el aviso y «Actualizar ahora» la activa', async ({ browser }) => {
  // Copia del build servida en otro puerto por un servidor que lee el disco en cada petición: así se puede «desplegar»
  const carpeta = await mkdtemp(join(tmpdir(), 'rv-despliegue-'))
  await cp(join(process.cwd(), 'dist'), carpeta, { recursive: true })
  const servidor = await servirCarpeta(carpeta, 4174)
  const origen = 'http://localhost:4174'
  const ctx = await browser.newContext({ locale: 'es-ES' })
  const externas: string[] = []
  ctx.on('request', (r) => {
    if (!r.url().startsWith(`${origen}/`) && !/^(data|blob):/.test(r.url())) externas.push(r.url())
  })
  try {
    const page = await ctx.newPage()
    await page.goto(`${origen}/`)
    await esperarServiceWorker(page)
    await expect(page.getByRole('region', { name: 'Nueva versión disponible' })).toHaveCount(0)

    // Despliegue de una versión nueva: cambia el service worker
    await appendFile(join(carpeta, 'sw.js'), '\n// versión nueva desplegada por la prueba\n')
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update()
    })

    const aviso = page.getByRole('region', { name: 'Nueva versión disponible' })
    await expect(aviso).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Hay una nueva versión de la app.' })).toHaveCount(1)
    // Mientras no se acepta, la nueva espera y sigue mandando la anterior
    expect(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true)

    await aviso.getByRole('button', { name: 'Actualizar ahora' }).click()
    await expect(page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' })).toBeVisible()
    await expect(aviso).toBeHidden()
    await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(false)
    expect(externas, 'peticiones a otros orígenes').toEqual([])
  } finally {
    await ctx.close()
    servidor.close()
    await rm(carpeta, { recursive: true, force: true })
  }
})
