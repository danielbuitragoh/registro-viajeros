import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { manifiesto, opcionesPwa } from '../../pwa.config'

const publico = join(__dirname, '..', '..', 'public')

/** Ancho y alto de un PNG (cabecera IHDR). */
function tamPng(fichero: string): [number, number] {
  const b = readFileSync(join(publico, fichero))
  expect(b.subarray(1, 4).toString('latin1')).toBe('PNG')
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

describe('PWA instalable: manifiesto', () => {
  const m = manifiesto('/registro-viajeros/')

  it('identidad, idioma y modo de pantalla', () => {
    expect(m).toMatchObject({ name: 'Registro de viajeros', short_name: 'Viajeros', lang: 'es', display: 'standalone', start_url: '/registro-viajeros/', scope: '/registro-viajeros/', id: '/registro-viajeros/' })
    expect(m.description).toMatch(/No oficial/)
  })

  it('iconos PNG de 192 y 512 px (para instalar en Android/Chrome), uno «maskable» y el SVG; los ficheros existen con ese tamaño', () => {
    const iconos = m.icons ?? []
    const png = (tam: string, purpose: string) => iconos.find((i) => i.sizes === tam && i.type === 'image/png' && i.purpose === purpose)
    expect(png('192x192', 'any')).toBeTruthy()
    expect(png('512x512', 'any')).toBeTruthy()
    expect(png('512x512', 'maskable')).toBeTruthy()
    expect(iconos.some((i) => i.type === 'image/svg+xml')).toBe(true)
    for (const i of iconos.filter((x) => x.type === 'image/png')) {
      const [w, h] = tamPng(i.src)
      expect(`${w}x${h}`, i.src).toBe(i.sizes)
    }
    expect(tamPng('apple-touch-icon.png')).toEqual([180, 180])
  })
})

describe('PWA sin conexión: service worker', () => {
  const o = opcionesPwa('/')

  it('pide permiso para actualizar (aviso de nueva versión) en vez de recargar por sorpresa', () => {
    expect(o.registerType).toBe('prompt')
  })

  it('precachea todo lo que la app necesita sin red: código, estilos, páginas, iconos, manifiesto y los trozos de municipios', () => {
    const patrones = o.workbox?.globPatterns?.join(' ') ?? ''
    // (el manifiesto lo añade vite-plugin-pwa al precache por su cuenta)
    for (const ext of ['js', 'css', 'html', 'svg', 'png']) expect(patrones).toContain(ext)
    expect(o.workbox?.navigateFallback).toBe('index.html')
    expect(o.workbox?.cleanupOutdatedCaches).toBe(true)
    expect(o.workbox?.clientsClaim).toBe(true)
  })

  it('no cachea ni pide nada a otros orígenes (cero peticiones externas)', () => {
    expect(o.workbox?.runtimeCaching ?? []).toEqual([])
    expect(JSON.stringify(o)).not.toMatch(/https?:\/\//)
  })
})

describe('navegaciones: solo la raíz es la app; las páginas estáticas se sirven con su propio HTML', () => {
  const o = opcionesPwa('/registro-viajeros/')
  const lista = (o.workbox?.navigateFallbackAllowlist ?? []) as RegExp[]
  const esApp = (rutaYBusqueda: string) => lista.some((r) => r.test(rutaYBusqueda))

  it('el fallback a index.html solo vale para la raíz de la app (con o sin parámetros)', () => {
    for (const x of ['/registro-viajeros/', '/registro-viajeros/index.html', '/registro-viajeros/?ref=x']) expect(esApp(x), x).toBe(true)
    for (const x of ['/registro-viajeros/presentacion/', '/registro-viajeros/presentacion/en/', '/registro-viajeros/presentacion', '/registro-viajeros/presentacion/?ref=x', '/registro-viajeros/otra.html', '/'])
      expect(esApp(x), x).toBe(false)
  })

  it('las páginas precacheadas se sirven aunque la URL traiga parámetros (enlaces compartidos)', () => {
    const ignorar = (o.workbox?.ignoreURLParametersMatching ?? []) as RegExp[]
    for (const p of ['ref', 'utm_source', 'fbclid', 'cualquiera']) expect(ignorar.some((r) => r.test(p)), p).toBe(true)
  })

  it('carga el complemento del service worker (barra final sin red y relevo del service worker antiguo)', () => {
    expect(o.workbox?.importScripts).toEqual(['sw-complemento.js'])
  })
})
