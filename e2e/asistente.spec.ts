import { readFile } from 'node:fs/promises'
import { devices } from '@playwright/test'
import { expect, test } from './guardia'

/**
 * Primer uso real, de principio a fin, como lo haría una persona sin conocimientos técnicos: el asistente de 6 pasos
 * con su reserva de prueba, la ficha rellenada en un móvil desde el enlace, el fichero de prueba y la copia.
 */
test('asistente completo: contraseña → establecimiento → reserva de prueba → enlace (ficha en el móvil) → fichero → copia → Hoy', async ({ page, browser, guardia }) => {
  test.setTimeout(150_000)
  await page.goto('/')
  const paso = (n: number) => expect(page.getByText(`Paso ${n} de 6`, { exact: true })).toBeVisible()

  // 1) Contraseña: qué significa perderla
  await paso(1)
  await expect(page.getByRole('heading', { name: '¿Qué pasa si la pierdo?' })).toBeVisible()
  await page.getByLabel('Contraseña', { exact: true }).fill('frase larga de prueba e2e')
  await page.getByLabel('Repite la contraseña').fill('frase larga de prueba e2e')
  await page.getByLabel(/no se pueden recuperar/).check()
  await page.getByRole('button', { name: 'Crear y seguir' }).click()

  // 2) Establecimiento: la pista del código se abre con el TECLADO (Enter en el <summary>)
  await paso(2)
  const pista = page.locator('summary', { hasText: '¿De dónde sale este código?' })
  await pista.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Si aún no lo tienes:/)).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByText(/Si aún no lo tienes:/)).toBeHidden()
  await page.getByLabel(/^Nombre del establecimiento/).fill('Pensión Carmen (E2E)')
  await page.getByLabel(/^Código de establecimiento/).fill('0000012345')
  await page.getByRole('button', { name: 'Guardar y seguir' }).click()

  // 3) Reserva de prueba
  await paso(3)
  await expect(page.getByLabel(/^Referencia de la reserva/)).toHaveValue('PRUEBA-1')
  await page.getByRole('button', { name: 'Guardar reserva' }).click()

  // 4) Enlace → la ficha se rellena en un móvil (otro dispositivo) → recepción escanea… aquí, pega su código
  await paso(4)
  await page.getByRole('button', { name: 'Crear enlace para el huésped' }).click()
  const enlace = await page.getByLabel('Enlace para el huésped').inputValue()
  const movil = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-ES' })
  await guardia.vigilar(movil)
  const h = await movil.newPage()
  await h.goto(enlace)
  await expect(h.getByText('Paso 1 de 3')).toBeVisible()
  await h.getByRole('button', { name: 'Empezar' }).click()
  await h.getByRole('button', { name: 'Añadir viajero' }).click()
  await h.getByLabel('Nombre', { exact: true }).fill('Carmen')
  await h.getByLabel('Primer apellido', { exact: true }).fill('Practica')
  await h.getByLabel('Fecha de nacimiento').fill('1966-05-20')
  await h.getByLabel(/^Tipo de documento/).selectOption('PAS')
  await h.getByLabel(/^Número de documento/).fill('PRACTICA1')
  await h.getByLabel(/^País de residencia/).selectOption('PRT')
  await h.getByLabel(/^Dirección \(calle/).fill('Rua de Exemplo 1')
  await h.getByLabel(/^Código postal/).fill('1000-001')
  await h.getByLabel(/^Municipio o ciudad/).fill('Lisboa')
  await h.getByLabel(/^Teléfono/).first().fill('+351 900 000 000')
  await h.getByRole('button', { name: 'Guardar viajero' }).click()
  await h.getByRole('button', { name: 'Terminar y obtener el código' }).click()
  const codigo = await h.getByLabel('Código de envío').inputValue()
  expect(codigo).toMatch(/^RV1\./)
  await movil.close()
  await page.getByLabel(/^Código de envío/).fill(codigo)
  await page.getByRole('button', { name: 'Importar fichas' }).click()
  await expect(page.getByText(/Se han importado 1 ficha/)).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Carmen Practica' })).toBeVisible()
  await page.getByRole('button', { name: /Siguiente/ }).click()

  // 5) Primer fichero (de prueba): se valida y se descarga, con el aviso de no subirlo
  await paso(5)
  await page.getByRole('button', { name: 'Generar el fichero de prueba' }).click()
  await expect(page.getByText(/NO lo subas al portal/)).toBeVisible()
  const [xml] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar el fichero de prueba' }).click()])
  expect(xml.suggestedFilename()).toMatch(/^PRUEBA-/)
  const contenido = await readFile((await xml.path()) as string, 'utf8')
  expect(contenido).toContain('<referencia>PRUEBA-1</referencia>')
  expect(contenido).toContain('<numeroDocumento>PRACTICA1</numeroDocumento>')
  await page.getByRole('button', { name: /Siguiente/ }).click()

  // 6) Copia de seguridad y recordatorio
  await paso(6)
  await page.getByLabel('Contraseña de la copia').fill('clave de la copia e2e')
  const [copia] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar copia' }).click()])
  expect(copia.suggestedFilename()).toMatch(/^copia-registro-viajeros_.*\.json$/)
  expect(JSON.parse(await readFile((await copia.path()) as string, 'utf8'))).not.toHaveProperty('reservas') // va cifrada
  await page.getByLabel('Recordarme hacer una copia').selectOption('30')
  await page.getByRole('button', { name: 'Terminar' }).click()

  // Hoy: todo listo, sin la reserva de prueba ni avisos pendientes
  await expect(page.getByRole('heading', { level: 1, name: 'Lista del día' })).toBeVisible()
  await expect(page.getByText(/Todo listo/)).toBeVisible()
  await expect(page.getByText('PRUEBA-1')).toHaveCount(0)
  await expect(page.getByText(/Continuar los primeros pasos/)).toHaveCount(0)
  await expect(page.locator('.recordatorio-copia')).toHaveCount(0)

  // Tras recargar (pide la contraseña), el asistente sigue terminado y el recordatorio guarda «cada mes»
  await page.reload()
  await page.getByLabel('Contraseña', { exact: true }).fill('frase larga de prueba e2e')
  await page.getByRole('button', { name: 'Desbloquear' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Lista del día' })).toBeVisible()
  await expect(page.getByText(/Continuar los primeros pasos/)).toHaveCount(0)
  await page.goto('/#/ajustes/copias')
  await expect(page.getByLabel('Recordarme hacer una copia')).toHaveValue('30')
  await expect(page.getByText(/Última copia en este dispositivo/)).toBeVisible()
})

test('el asistente se puede saltar y retomar desde Ajustes en el mismo paso', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Contraseña', { exact: true }).fill('frase larga de prueba e2e')
  await page.getByLabel('Repite la contraseña').fill('frase larga de prueba e2e')
  await page.getByLabel(/no se pueden recuperar/).check()
  await page.getByRole('button', { name: 'Crear y seguir' }).click()
  await page.getByLabel(/^Nombre del establecimiento/).fill('Casa Rural E2E')
  await page.getByRole('button', { name: 'Guardar y seguir' }).click()
  await expect(page.getByText('Paso 3 de 6', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Saltar los primeros pasos' }).click()
  await expect(page.getByText(/Puedes retomarlos cuando quieras en Ajustes/)).toBeVisible()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('list', { name: 'Apartados de Ajustes' }).getByRole('link', { name: /Primeros pasos/ }).click()
  await expect(page.getByText('Paso 3 de 6', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Atrás/ }).click()
  await expect(page.getByLabel(/^Nombre del establecimiento/)).toHaveValue('Casa Rural E2E')
})
