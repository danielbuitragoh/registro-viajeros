import { devices, type Page } from '@playwright/test'
import { violacionesAxe } from './axe'
import { expect, test } from './guardia'

/**
 * axe (con contraste, en Chromium real) en TODAS las pantallas, en tema claro y oscuro, en escritorio y en móvil.
 * Además: sin desplazamiento horizontal en el móvil y el tema oscuro aplicado de verdad.
 */
async function abrirTodo(page: Page, comprobar: (nombre: string) => Promise<void>) {
  await page.goto('/')
  await comprobar('acceso (crear contraseña, paso 1)')
  await page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' }).click()
  await expect(page.getByRole('heading', { name: 'Lista del día' })).toBeVisible()
  await comprobar('Hoy')

  await page.getByRole('button', { name: 'Escanear el QR de un huésped' }).click()
  await expect(page.getByRole('heading', { name: 'Escanear el QR de un huésped' })).toBeVisible()
  await comprobar('Hoy con el escáner')

  await page.getByRole('button', { name: /^Abrir reserva DEMO-/ }).first().click()
  await expect(page.getByRole('navigation', { name: 'Migas de pan' })).toBeVisible()
  await page.getByRole('button', { name: 'Crear enlace para el huésped' }).click()
  await comprobar('ficha de la reserva (con enlace y QR)')
  const enlace = await page.getByLabel('Enlace para el huésped').inputValue()

  const nav = page.getByRole('navigation', { name: 'Principal' })
  await nav.getByRole('link', { name: 'Reservas', exact: true }).click()
  await comprobar('Reservas')
  await page.getByRole('button', { name: 'Nueva reserva' }).click()
  await page.getByRole('button', { name: 'Guardar reserva' }).click() // con errores: resumen y campos marcados
  await comprobar('nueva reserva con errores')

  await nav.getByRole('link', { name: 'Exportar', exact: true }).click()
  await page.getByRole('button', { name: 'Validar y generar fichero' }).click()
  await comprobar('Exportar con resultado')

  await nav.getByRole('link', { name: 'Ajustes', exact: true }).click()
  await comprobar('Ajustes (índice)')
  for (const sub of ['establecimiento', 'copias', 'apariencia', 'seguridad', 'conservacion', 'borrar']) {
    await page.goto(`/#/ajustes/${sub}`)
    await expect(page.getByRole('navigation', { name: 'Migas de pan' })).toBeVisible()
    for (const s of await page.locator('details.pista > summary').all()) await s.click()
    await comprobar(`Ajustes → ${sub}`)
  }

  await nav.getByRole('link', { name: 'Ayuda', exact: true }).click()
  for (const s of await page.locator('details.faq > summary').all()) await s.click()
  await comprobar('Ayuda (todas las preguntas abiertas)')

  await page.goto('/#/primeros-pasos')
  await expect(page.getByRole('heading', { level: 1, name: 'Primeros pasos' })).toBeVisible()
  await comprobar('Primeros pasos')

  // Huésped: bienvenida con preguntas y formulario con todas las pistas abiertas
  await page.goto(enlace)
  await expect(page.getByRole('heading', { level: 1, name: 'Datos de los viajeros' })).toBeVisible()
  for (const s of await page.locator('details.faq > summary').all()) await s.click()
  await comprobar('huésped: bienvenida')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await page.getByRole('button', { name: 'Añadir viajero' }).click()
  await page.getByLabel(/^Tipo de documento/).selectOption('NIF')
  for (const s of await page.locator('details.pista > summary').all()) await s.click()
  await page.getByRole('button', { name: 'Guardar viajero' }).click()
  await comprobar('huésped: formulario con errores y pistas abiertas')

  await page.goto('/presentacion/')
  await comprobar('presentación')
}

// Sin defaultBrowserType (Playwright no deja cambiarlo dentro de un describe): solo pantalla, táctil y escala del Pixel 7
const { defaultBrowserType: _navegador, ...pixel7 } = devices['Pixel 7']

for (const tema of ['light', 'dark'] as const) {
  for (const [disp, opciones] of [
    ['escritorio', { viewport: { width: 1280, height: 900 } }],
    ['móvil', pixel7],
  ] as const) {
    test.describe(`${tema === 'light' ? 'claro' : 'oscuro'} · ${disp}`, () => {
      test.use({ ...opciones, colorScheme: tema })
      test(`axe sin violaciones (con contraste) en todas las pantallas`, async ({ page }) => {
        test.setTimeout(180_000)
        const fallos: string[] = []
        await abrirTodo(page, async (nombre) => {
          await page.waitForTimeout(50)
          const v = await violacionesAxe(page)
          if (v.length) fallos.push(`${nombre}: ${v.join(' | ')}`)
          if (disp === 'móvil') {
            const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
            if (ancho > 0) fallos.push(`${nombre}: desplazamiento horizontal de ${ancho} px`)
          }
          // El tema que se pide es el que se ve (fondo de la página)
          const fondo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
          const oscuro = await page.evaluate((c) => {
            const [r, g, b] = (c.match(/\d+/g) ?? []).map(Number)
            return (r ?? 0) + (g ?? 0) + (b ?? 0) < 200
          }, fondo)
          if (oscuro !== (tema === 'dark')) fallos.push(`${nombre}: el fondo ${fondo} no corresponde al tema ${tema}`)
        })
        expect(fallos).toEqual([])
      })
    })
  }
}

test('el tema elegido a mano en Ajustes → Apariencia gana al del sistema y se recuerda', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' }).click()
  await page.goto('/#/ajustes/apariencia')
  await page.getByLabel('Oscuro').check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'oscuro')
  expect(await violacionesAxe(page)).toEqual([])
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'oscuro')
  const fondo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(fondo).toBe('rgb(15, 21, 28)')
})
