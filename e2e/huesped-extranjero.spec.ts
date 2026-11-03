import { readFile } from 'node:fs/promises'
import { devices } from '@playwright/test'
import { expect, test } from './guardia'

/**
 * Huésped alemana con su carné de identidad alemán (ni DNI, ni NIE, ni pasaporte): la guía en su idioma la lleva a
 * «Anderes Dokument» (código OTRO de §8.5, P16), sin soporte ni segundo apellido (§3). Recepción importa su código
 * desde el atajo de «Hoy» (reconoce sola la reserva) y el XML lleva tipoDocumento OTRO.
 */
test('huésped con documento no español (alemana, Personalausweis → OTRO), en alemán, hasta el XML', async ({ page, browser, guardia }) => {
  test.setTimeout(120_000)
  // Recepción (demo): reserva nueva para 1 persona y enlace en alemán
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar a la demo con datos ficticios' }).click()
  await page.getByRole('navigation', { name: 'Atajos' }).getByRole('button', { name: 'Nueva reserva' }).click()
  await page.getByLabel(/^Referencia de la reserva/).fill('E2E-DE-1')
  const entrada = await page.getByLabel(/^Entrada/).inputValue()
  const salida = new Date(`${entrada.slice(0, 10)}T12:00:00Z`)
  salida.setUTCDate(salida.getUTCDate() + 3)
  await page.getByLabel(/^Salida/).fill(`${salida.toISOString().slice(0, 10)}T11:00`)
  await page.getByRole('button', { name: 'Guardar reserva' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Reserva E2E-DE-1' })).toBeVisible()
  await expect(page.locator('.siguiente-paso')).toContainText('Crea el enlace')
  await page.getByRole('button', { name: 'Crear enlace para el huésped' }).click()
  await page.getByLabel('Idioma inicial del formulario').selectOption('de')
  const enlace = await page.getByLabel('Enlace para el huésped').inputValue()

  // Su móvil, en alemán
  const movil = await browser.newContext({ ...devices['Pixel 7'], locale: 'de-DE' })
  await guardia.vigilar(movil)
  const h = await movil.newPage()
  await h.goto(enlace)
  await expect(h.getByText('Schritt 1 von 3')).toBeVisible()
  await h.getByText('Ich habe kein spanisches Dokument').click()
  await expect(h.getByText(/Wählen Sie „Reisepass“ oder „Anderes Dokument“/)).toBeVisible()
  await h.getByRole('button', { name: 'Starten' }).click()
  await h.getByRole('button', { name: 'Person hinzufügen' }).click()

  // «Welches Dokument wähle ich?» → «Anderes Dokument» para el carné de su país
  await h.locator('summary', { hasText: 'Welches Dokument wähle ich?' }).click()
  await expect(h.getByText(/„Anderes Dokument“: wenn Sie mit einem anderen Ausweisdokument reisen, zum Beispiel dem Personalausweis Ihres Landes/)).toBeVisible()
  await h.getByLabel('Vorname', { exact: true }).fill('Anna')
  await h.getByLabel('Nachname', { exact: true }).fill('Weber')
  await h.getByLabel(/^Geburtsdatum/).fill('1990-03-15')
  await h.getByLabel(/^Staatsangehörigkeit/).selectOption('DEU')
  await h.getByLabel(/^Ausweisart/).selectOption('OTRO')
  const numero = h.getByLabel(/^Nummer des Dokuments|^Ausweisnummer|^Dokumentnummer/)
  await expect(numero).toHaveAccessibleDescription(/bis zu 15 Buchstaben oder Ziffern/)
  // Con «otro documento» no se pide el número de soporte (§3: solo NIF o NIE)
  await expect(h.getByText('Was ist die Trägernummer (Número de soporte)?')).toHaveCount(0)

  // Si por error escribe un DNI español con letra correcta, se le avisa (no bloquea) de que elija el tipo DNI
  await numero.fill('12345678Z')
  await numero.blur()
  await expect(h.getByText(/Das sieht nach einem spanischen DNI aus/)).toBeVisible()
  await numero.fill('T22000129')
  await numero.blur()
  await expect(h.getByText(/Das sieht nach einem spanischen DNI aus/)).toHaveCount(0)

  await h.getByLabel(/^Wohnsitzland/).selectOption('DEU')
  await h.getByLabel(/^Anschrift \(Straße/).fill('Beispielstraße 5')
  await h.getByLabel(/^Postleitzahl/).fill('10115')
  await h.getByLabel(/^Ort oder Stadt/).fill('Berlin')
  await h.locator('summary', { hasText: 'Telefonnummer aus einem anderen Land?' }).click()
  await expect(h.getByText(/\+49 für Deutschland/)).toBeVisible()
  await h.getByLabel(/^Telefon/).first().fill('+49 30 0000000')
  await h.getByRole('button', { name: /speichern/i }).click()
  await h.getByRole('button', { name: /Code (erhalten|anzeigen)|abschließen/i }).click()
  await expect(h.getByText('Schritt 3 von 3')).toBeVisible()
  const codigo = await h.locator('#codigo-envio').inputValue()
  expect(codigo).toMatch(/^RV1\./)
  await movil.close()

  // Recepción: atajo de Hoy «Escanear el QR de un huésped» (aquí, pegando el código) → abre SU reserva
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Hoy', exact: true }).click()
  await page.getByRole('button', { name: 'Escanear el QR de un huésped' }).click()
  await page.getByLabel(/O pega aquí el código/).fill(codigo)
  await page.getByRole('button', { name: 'Importar fichas' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Reserva E2E-DE-1' })).toBeVisible()
  await expect(page.getByText(/Se ha importado 1 ficha en la reserva E2E-DE-1/)).toBeVisible()
  await expect(page.locator('.fila-estado')).toContainText('Completo')

  // Exportar: el XML lleva OTRO y el número, sin soporte ni segundo apellido
  await page.getByRole('button', { name: 'Ir a Exportar' }).click()
  await page.getByRole('button', { name: 'Validar y generar fichero' }).click()
  await expect(page.getByRole('heading', { name: 'Fichero validado' })).toBeVisible()
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar XML' }).click()])
  const xml = await readFile((await descarga.path()) as string, 'utf8')
  const anna = await page.evaluate((x) => {
    const d = new DOMParser().parseFromString(x, 'application/xml')
    const p = [...d.getElementsByTagName('persona')].find((e) => e.getElementsByTagName('apellido1')[0]?.textContent === 'Weber')
    const uno = (n: string) => p?.getElementsByTagName(n)[0]?.textContent ?? null
    return { tipo: uno('tipoDocumento'), numero: uno('numeroDocumento'), soporte: uno('soporteDocumento'), apellido2: uno('apellido2'), nacionalidad: uno('nacionalidad'), pais: uno('pais'), municipio: uno('nombreMunicipio') }
  }, xml)
  expect(anna).toEqual({ tipo: 'OTRO', numero: 'T22000129', soporte: null, apellido2: null, nacionalidad: 'DEU', pais: 'DEU', municipio: 'Berlin' })
  await expect(page.getByRole('heading', { name: 'Último paso: súbelo tú al portal SES.Hospedajes' })).toBeVisible()
})
