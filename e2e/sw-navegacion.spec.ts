import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from './guardia'
import { servirCarpeta } from './servidorEstatico'

/**
 * El service worker y las páginas estáticas (presentación) en las mismas condiciones que GitHub Pages:
 * build con base /registro-viajeros/ (dist-pages, lo crea playwright.config.ts), servido bajo ese prefijo y con
 * «/carpeta/» → «/carpeta/index.html». Fallo visto en producción: con el SW activo, /presentacion/ mostraba la app.
 */
const PREFIJO = '/registro-viajeros/'
const PRESENTACION_ES = /^Registro de viajeros · Para pensiones/
const PRESENTACION_EN = /^Registro de viajeros · Guest registration/
const APP = /^Registro de viajeros$/

async function desplegar(puerto: number, cambiar?: (carpeta: string) => Promise<void>) {
  const carpeta = await mkdtemp(join(tmpdir(), 'rv-pages-'))
  await cp(join(process.cwd(), 'dist-pages'), carpeta, { recursive: true })
  if (cambiar) await cambiar(carpeta)
  const servidor = await servirCarpeta(carpeta, puerto, PREFIJO)
  return { carpeta, base: `http://localhost:${puerto}${PREFIJO}`, cerrar: async () => (servidor.close(), rm(carpeta, { recursive: true, force: true })) }
}

/** Contexto aparte (otro origen: otro puerto) con su propia guardia de «nada fuera de este origen». */
async function contexto(browser: import('@playwright/test').Browser, base: string): Promise<{ ctx: BrowserContext; externas: string[] }> {
  const ctx = await browser.newContext({ locale: 'es-ES' })
  const origen = new URL(base).origin
  const externas: string[] = []
  ctx.on('request', (r) => {
    if (!r.url().startsWith(`${origen}/`) && !/^(data|blob):/.test(r.url())) externas.push(r.url())
  })
  return { ctx, externas }
}

async function esperarControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true)
}

/** Las navegaciones que deben dar la presentación (y no la app), tal como llegan en la vida real. */
const PAGINAS: [string, RegExp][] = [
  ['presentacion/', PRESENTACION_ES],
  ['presentacion/en/', PRESENTACION_EN],
  ['presentacion/index.html', PRESENTACION_ES],
  // Enlaces compartidos por WhatsApp, redes o campañas llegan con parámetros
  ['presentacion/?ref=whatsapp', PRESENTACION_ES],
  ['presentacion/en/?utm_source=x&ref=y', PRESENTACION_EN],
  // Escrita a mano, sin la barra final
  ['presentacion', PRESENTACION_ES],
  ['presentacion/en', PRESENTACION_EN],
]

test('con el service worker controlando la página, la presentación se sirve con su propio HTML, online y sin conexión', async ({ browser }) => {
  const d = await desplegar(4175)
  const { ctx, externas } = await contexto(browser, d.base)
  try {
    const page = await ctx.newPage()
    await page.goto(d.base)
    await expect(page).toHaveTitle(APP)
    await esperarControl(page)

    for (const sinRed of [false, true]) {
      await ctx.setOffline(sinRed)
      for (const [ruta, titulo] of PAGINAS) {
        await page.goto(d.base + ruta)
        await expect(page, `${ruta} ${sinRed ? '(sin red)' : '(con red)'}`).toHaveTitle(titulo)
        await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/contraseña|Desbloquea/)
      }
      // La app sigue siendo la app, también con parámetros (enlaces de huésped: todo va en el fragmento #)
      for (const ruta of ['', 'index.html', '?ref=x']) {
        await page.goto(d.base + ruta)
        await expect(page, `app «${ruta}» ${sinRed ? '(sin red)' : '(con red)'}`).toHaveTitle(APP)
      }
    }
    expect(externas, 'peticiones a otros orígenes').toEqual([])
  } finally {
    await ctx.close()
    await d.cerrar()
  }
})

/**
 * Service worker antiguo: hasta el PR #3 la app usaba un SW «autoUpdate» (skipWaiting + clientsClaim) que respondía
 * a TODA navegación con index.html y no conocía la presentación. El SW nuevo (modo «prompt») se quedaba esperando
 * detrás de él para siempre, porque el código antiguo de la página nunca le pide activarse.
 */
const SW_ANTIGUO = `
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') e.respondWith(fetch(new URL('index.html', self.registration.scope)))
})
`

test('quien tenía el service worker antiguo recibe el nuevo sin quedarse atascado y ve la presentación', async ({ browser }) => {
  let swNuevo = ''
  const d = await desplegar(4176, async (carpeta) => {
    swNuevo = await (await import('node:fs/promises')).readFile(join(carpeta, 'sw.js'), 'utf8')
    await writeFile(join(carpeta, 'sw.js'), SW_ANTIGUO)
  })
  const { ctx, externas } = await contexto(browser, d.base)
  try {
    const page = await ctx.newPage()
    await page.goto(d.base)
    await esperarControl(page)
    // Así estaba producción: el SW antiguo da la app en /presentacion/
    await page.goto(`${d.base}presentacion/`)
    await expect(page).toHaveTitle(APP)

    // Se despliega la versión con el arreglo
    await writeFile(join(d.carpeta, 'sw.js'), swNuevo)
    await page.goto(d.base)
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update()
    })
    await expect
      .poll(async () => {
        await page.goto(`${d.base}presentacion/`)
        return page.title()
      }, { timeout: 15_000 })
      .toMatch(PRESENTACION_ES)
    expect(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(false)

    // Y queda funcionando sin conexión
    await ctx.setOffline(true)
    await page.goto(`${d.base}presentacion/en/`)
    await expect(page).toHaveTitle(PRESENTACION_EN)
    expect(externas, 'peticiones a otros orígenes').toEqual([])
  } finally {
    await ctx.close()
    await d.cerrar()
  }
})
