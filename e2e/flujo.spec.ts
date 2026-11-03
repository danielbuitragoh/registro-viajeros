import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, devices, type Page } from '@playwright/test'
import { expect, test } from './guardia'
import { videoConQr } from './qrVideo'

const PASSWORD = 'clave-e2e-2026'

async function crearAlmacen(page: Page) {
  await page.goto('/')
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Repite la contraseña').fill(PASSWORD)
  await page.getByLabel(/no se pueden recuperar/).check()
  await page.getByRole('button', { name: 'Crear y seguir' }).click()
  // Primer uso: el asistente (se prueba entero en asistente.spec.ts); aquí se salta
  await page.getByRole('button', { name: 'Saltar los primeros pasos' }).click()
  await expect(page.getByRole('heading', { name: 'Lista del día' })).toBeVisible()
}

test('flujo completo: reserva → enlace → ficha en el móvil → QR leído con la cámara → parte completo → XML validado', async ({ page, browser, guardia }) => {
  // 1) Recepción: primer uso y establecimiento
  await crearAlmacen(page)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('list', { name: 'Apartados de Ajustes' }).getByRole('link', { name: /Establecimiento/ }).click()
  await page.getByLabel(/^Nombre del establecimiento/).fill('Pensión E2E')
  await page.getByLabel(/^Código de establecimiento/).fill('0000012345')
  await page.getByLabel(/^Dirección/).first().fill('Calle Inventada 7')
  await page.getByLabel(/^Código postal/).fill('99001')
  // Autocompletado municipio → código INE (el build de la demo trae la muestra FICTICIA de municipios)
  const municipio = page.getByRole('combobox', { name: /^Nombre del municipio/ })
  await municipio.fill('villafic')
  await expect(page.getByRole('listbox').getByRole('option')).toHaveText(['Villaficticia — 99001', 'Villaficticia — 98001'])
  await municipio.press('ArrowDown')
  await municipio.press('Enter')
  await expect(page.getByLabel(/^Código INE del municipio/)).toHaveValue('99001')
  await expect(page.getByText(/Código 99001: Villaficticia \(relación del INE a 01\/01\/2026\)/)).toBeVisible()
  await page.getByRole('button', { name: 'Guardar establecimiento' }).click()
  await expect(page.getByText('Establecimiento guardado.')).toBeVisible()

  // 2) Nueva reserva (entrada hoy 14:00, salida dentro de dos días)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Hoy', exact: true }).click()
  await page.getByRole('button', { name: 'Nueva reserva' }).click()
  await page.getByLabel(/^Referencia de la reserva/).fill('E2E-0001')
  const entrada = await page.getByLabel(/^Entrada/).inputValue()
  const salida = new Date(`${entrada.slice(0, 10)}T12:00:00Z`)
  salida.setUTCDate(salida.getUTCDate() + 2)
  await page.getByLabel(/^Salida/).fill(`${salida.toISOString().slice(0, 10)}T11:00`)
  await page.getByRole('button', { name: 'Guardar reserva' }).click()
  await expect(page.getByRole('heading', { name: 'Reserva E2E-0001' })).toBeVisible()
  const rutaReserva = new URL(page.url()).hash

  // 3) Enlace para el huésped, en francés
  await page.getByRole('button', { name: 'Crear enlace para el huésped' }).click()
  await page.getByLabel('Idioma inicial del formulario').selectOption('fr')
  const enlace = await page.getByLabel('Enlace para el huésped').inputValue()
  expect(enlace).toContain('#/huesped/')

  // 4) El huésped, en SU móvil (otro dispositivo: contexto aparte), rellena la ficha
  const movil = await browser.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' })
  await guardia.vigilar(movil)
  const h = await movil.newPage()
  await h.goto(enlace)
  await expect(h.getByRole('heading', { level: 1, name: 'Données des voyageurs' })).toBeVisible()
  await h.getByRole('button', { name: 'Commencer' }).click()
  await h.getByRole('button', { name: 'Ajouter un voyageur' }).click()
  await h.getByLabel('Prénom', { exact: true }).fill('Claire')
  await h.getByLabel('Nom de famille', { exact: true }).fill('Dupont')
  await h.getByLabel('Date de naissance').fill('1988-02-10')
  await h.getByLabel(/^Nationalité/).selectOption('FRA')
  await h.getByLabel(/^Type de document/).selectOption('PAS')
  await h.getByLabel(/^Numéro du document/).fill('18AB12345')
  await h.getByLabel(/^Pays de résidence/).selectOption('FRA')
  await h.getByLabel(/^Adresse \(rue/).fill('12 rue de la Paix')
  await h.getByLabel(/^Code postal/).fill('75002')
  await h.getByLabel(/^Commune ou ville/).fill('Paris')
  await h.getByLabel(/^Adresse e-mail/).fill('claire@example.fr')
  await h.getByRole('button', { name: 'Enregistrer le voyageur' }).click()
  await h.getByRole('button', { name: 'Terminer et obtenir le code' }).click()
  const codigo = h.getByLabel(/^Code d.envoi$/)
  await expect(codigo).toHaveValue(/^RV1\./)
  const textoCodigo = await codigo.inputValue()

  // 4b) …y descarga su ficha en PDF para entregarla en recepción (pre-check-in)
  const [pdf] = await Promise.all([h.waitForEvent('download'), h.getByRole('button', { name: 'Télécharger la fiche en PDF' }).click()])
  const bytesPdf = await readFile((await pdf.path()) as string)
  expect(bytesPdf.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4')
  expect(bytesPdf.toString('latin1')).toContain('(Claire)')
  await movil.close()

  // 5) Recepción escanea el QR con la cámara (cámara falsa de Chromium que muestra el QR del huésped)
  // Ruta solo ASCII: Chromium no abre la cámara falsa si la ruta lleva «→» o acentos (como la carpeta de resultados)
  const video = videoConQr(textoCodigo, join(await mkdtemp(join(tmpdir(), 'rv-e2e-')), 'qr-huesped.y4m'))
  const estado = await page.context().storageState({ indexedDB: true })
  const navCamara = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`] })
  try {
    const ctx = await navCamara.newContext({ storageState: estado, permissions: ['camera'], baseURL: 'http://localhost:4173' })
    await guardia.vigilar(ctx)
    const rec = await ctx.newPage()
    await rec.goto(`/${rutaReserva}`)
    await rec.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await rec.getByRole('button', { name: 'Desbloquear' }).click()
    await expect(rec.getByRole('heading', { name: 'Reserva E2E-0001' })).toBeVisible()
    await rec.getByRole('button', { name: 'Escanear el QR con la cámara' }).click()
    await expect(rec.getByText(/Se han importado 1 ficha/)).toBeVisible({ timeout: 30_000 })

    // 6) Parte completo
    await expect(rec.locator('.fila-estado')).toContainText('Completo')
    await expect(rec.getByText(/1\. Claire Dupont/)).toBeVisible()

    // 7) Exportar: valida y descarga el XML
    await rec.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Exportar', exact: true }).click()
    await rec.getByLabel(/^Partes de viajeros/).check()
    await rec.getByLabel(/E2E-0001/).check()
    await rec.getByRole('button', { name: 'Validar y generar fichero' }).click()
    await expect(rec.getByRole('heading', { name: 'Fichero validado' })).toBeVisible()
    const [descarga] = await Promise.all([rec.waitForEvent('download'), rec.getByRole('button', { name: 'Descargar XML' }).click()])
    const xml = await readFile((await descarga.path()) as string, 'utf8')

    // 8) Comprobación independiente del XML (DOMParser del navegador, sin código de la app)
    const r = await rec.evaluate((x) => {
      const d = new DOMParser().parseFromString(x, 'application/xml')
      if (d.getElementsByTagName('parsererror').length) return null
      const uno = (n: string) => d.getElementsByTagName(n)[0]?.textContent ?? null
      const hijos = (el: Element | undefined) => (el ? Array.from(el.children).map((c) => c.tagName) : [])
      return {
        raiz: d.documentElement.tagName,
        solicitud: hijos(d.getElementsByTagName('solicitud')[0]),
        comunicacion: hijos(d.getElementsByTagName('comunicacion')[0]),
        comunicaciones: d.getElementsByTagName('comunicacion').length,
        codigoEstablecimiento: uno('codigoEstablecimiento'),
        referencia: uno('referencia'),
        rol: uno('rol'),
        nombre: uno('nombre'),
        apellido1: uno('apellido1'),
        tipoDocumento: uno('tipoDocumento'),
        numeroDocumento: uno('numeroDocumento'),
        nacionalidad: uno('nacionalidad'),
        pais: uno('pais'),
        nombreMunicipio: uno('nombreMunicipio'),
        correo: uno('correo'),
      }
    }, xml)
    expect(r).toEqual({
      raiz: 'peticion',
      solicitud: ['codigoEstablecimiento', 'comunicacion'],
      comunicacion: ['contrato', 'persona'],
      comunicaciones: 1,
      codigoEstablecimiento: '0000012345',
      referencia: 'E2E-0001',
      rol: 'VI',
      nombre: 'Claire',
      apellido1: 'Dupont',
      tipoDocumento: 'PAS',
      numeroDocumento: '18AB12345',
      nacionalidad: 'FRA',
      pais: 'FRA',
      nombreMunicipio: 'Paris',
      correo: 'claire@example.fr',
    })
    await expect(rec.getByText(/partes marcados como «exportados»/)).toBeVisible()
  } finally {
    await navCamara.close()
  }
})
