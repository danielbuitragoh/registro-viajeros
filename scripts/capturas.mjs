/**
 * Capturas del README (docs/img) y de la presentación (presentacion/img) desde la DEMO (datos ficticios).
 * Uso:
 *   VITE_DEMO=true npx vite build && npx vite preview --port 4173 &
 *   node scripts/capturas.mjs [http://localhost:4173]
 * Las WebP de la presentación se codifican en el propio Chromium (canvas.toDataURL): sin dependencias nuevas.
 */
import { writeFile } from 'node:fs/promises'
import { chromium, devices } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const navegador = await chromium.launch()

async function demo(opciones) {
  const ctx = await navegador.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid', ...opciones })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`)
  await page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' }).click()
  await page.getByRole('heading', { name: 'Lista del día' }).waitFor()
  return { ctx, page }
}
const arriba = (page) => page.evaluate(() => window.scrollTo(0, 0))
const quieto = (page) => page.waitForTimeout(250)

async function aWebp(page, png, ancho, destino) {
  const datos = await page.evaluate(
    async ({ b64, ancho }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = ancho
      c.height = Math.round((img.height * ancho) / img.width)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      return { url: c.toDataURL('image/webp', 0.82), w: c.width, h: c.height }
    },
    { b64: png.toString('base64'), ancho },
  )
  await writeFile(destino, Buffer.from(datos.url.split(',')[1], 'base64'))
  console.log(destino, `${datos.w}x${datos.h}`)
}

// 1) Hoy en escritorio (claro)
{
  const { ctx, page } = await demo({ viewport: { width: 1180, height: 940 }, deviceScaleFactor: 2 })
  await arriba(page)
  await quieto(page)
  const png = await page.screenshot({ path: 'docs/img/captura-lista-dia.png' })
  await aWebp(page, png, 1440, 'presentacion/img/lista-dia.webp')

  // Ficha de la reserva: siguiente paso
  await page.getByRole('button', { name: /^Abrir reserva DEMO-0002/ }).click()
  await page.getByRole('heading', { level: 1 }).waitFor()
  await arriba(page)
  await page.screenshot({ path: 'docs/img/captura-reserva.png', clip: { x: 0, y: 0, width: 1180, height: 760 } })

  // Exportar con el fichero validado
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Exportar', exact: true }).click()
  await page.getByRole('button', { name: 'Validar y generar fichero' }).click()
  await page.getByRole('heading', { name: 'Fichero validado' }).scrollIntoViewIfNeeded()
  await quieto(page)
  await page.screenshot({ path: 'docs/img/captura-exportar.png' })

  // Ayuda con una pregunta abierta
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ayuda', exact: true }).click()
  await page.getByText('Uso AM HOTEL u otro programa de gestión').click()
  await arriba(page)
  await quieto(page)
  await page.screenshot({ path: 'docs/img/captura-ayuda.png', clip: { x: 0, y: 0, width: 1180, height: 900 } })
  await ctx.close()
}

// 2) Móvil: asistente (paso 2 con la pista abierta), Hoy en oscuro con el escáner, huésped en francés
{
  const { ctx, page } = await demo({ ...devices['Pixel 7'] })
  await page.goto(`${BASE}/#/primeros-pasos`)
  await page.getByRole('heading', { level: 2, name: 'Datos del establecimiento' }).waitFor()
  await page.locator('summary', { hasText: '¿De dónde sale este código?' }).click()
  await page.getByLabel(/^Código de establecimiento/).scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -260))
  await quieto(page)
  await page.screenshot({ path: 'docs/img/captura-asistente.png' })

  await page.goto(`${BASE}/#/`)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByRole('button', { name: 'Escanear el QR de un huésped' }).click()
  await arriba(page)
  await quieto(page)
  await page.screenshot({ path: 'docs/img/captura-hoy-oscuro.png' })
  await page.emulateMedia({ colorScheme: 'light' })

  await page.getByRole('button', { name: /^Abrir reserva DEMO-0005/ }).click()
  await page.getByRole('button', { name: 'Crear enlace para el huésped' }).click()
  await page.getByLabel('Idioma inicial del formulario').selectOption('fr')
  const enlace = await page.getByLabel('Enlace para el huésped').inputValue()
  const movil = await navegador.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' })
  const h = await movil.newPage()
  await h.goto(enlace)
  await h.getByRole('button', { name: 'Commencer' }).click()
  await h.getByRole('button', { name: 'Ajouter un voyageur' }).click()
  await h.getByLabel('Prénom', { exact: true }).fill('Claire')
  await h.getByLabel('Nom de famille', { exact: true }).fill('Dupont')
  await h.getByLabel(/^Type de document/).scrollIntoViewIfNeeded()
  await h.locator('summary', { hasText: 'Quel document choisir ?' }).click()
  await h.getByText('Pièce d’identité', { exact: true }).evaluate((e) => e.scrollIntoView({ block: 'start' }))
  await h.evaluate(() => window.scrollBy(0, -24))
  await quieto(h)
  const pngH = await h.screenshot({ path: 'docs/img/captura-huesped.png' })
  await aWebp(h, pngH, 600, 'presentacion/img/huesped.webp')
  await movil.close()
  await ctx.close()
}

await navegador.close()
