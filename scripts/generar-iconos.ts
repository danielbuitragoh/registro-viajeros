/**
 * Genera los iconos PNG de la PWA a partir del diseño de public/icon.svg (con el Chromium de Playwright, sin red).
 *   node scripts/generar-iconos.ts
 * - icon-192.png / icon-512.png: el icono con esquinas redondeadas y fondo transparente (purpose «any»).
 * - icon-maskable-512.png: fondo a sangre y la casa dentro de la zona segura (purpose «maskable», Android).
 * - apple-touch-icon.png (180): fondo a sangre; iOS redondea las esquinas por su cuenta.
 */
import { writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const publico = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public')
const AZUL = '#1f4e79'
const CASA = '<path d="M14 46V26l18-12 18 12v20z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M26 46V34h12v12" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>'
const conEsquinas = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${AZUL}"/>${CASA}</svg>`
const aSangre = (escala: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${AZUL}"/><g transform="translate(32 31) scale(${escala}) translate(-32 -30)">${CASA}</g></svg>`

const ICONOS: [string, number, string][] = [
  ['icon-192.png', 192, conEsquinas],
  ['icon-512.png', 512, conEsquinas],
  ['icon-maskable-512.png', 512, aSangre(0.72)],
  ['apple-touch-icon.png', 180, aSangre(0.82)],
]

const navegador = await chromium.launch()
for (const [nombre, tam, svg] of ICONOS) {
  const pagina = await navegador.newPage({ viewport: { width: tam, height: tam } })
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${tam}" height="${tam}" `)}</body></html>`)
  writeFileSync(join(publico, nombre), await pagina.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: tam, height: tam } }))
  await pagina.close()
  console.log(`✔ public/${nombre} (${tam}×${tam})`)
}
await navegador.close()
