import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from './axe'

/**
 * Página de presentación para dueños de alojamientos sin programa de gestión: estática, sin JavaScript,
 * en español (/presentacion/) y en inglés (/presentacion/en/). El contraste se mide en el navegador real (E2E).
 */
const raiz = join(__dirname, '..')
const PAGINAS = {
  es: { fichero: 'presentacion/index.html', demo: '../', otro: { href: 'en/', lang: 'en' } },
  en: { fichero: 'presentacion/en/index.html', demo: '../../', otro: { href: '../', lang: 'es' } },
} as const
const README = 'https://github.com/danielbuitragoh/registro-viajeros#readme'

function cargar(fichero: string): Document {
  return new DOMParser().parseFromString(readFileSync(join(raiz, fichero), 'utf8'), 'text/html')
}

const textos = {
  es: {
    secciones: ['Qué hace', 'Qué NO hace', 'Privacidad: todo se queda en tu dispositivo, cifrado', 'Cómo empezar en 3 pasos'],
    noEnvia: /no envía nada al Ministerio/i,
    responsable: /sigue siendo responsable de comunicar/i,
    cifrado: /cifrad/i,
  },
  en: {
    secciones: ['What it does', 'What it does NOT do', 'Privacy: everything stays on your device, encrypted', 'Get started in 3 steps'],
    noEnvia: /does not send anything to the Ministry/i,
    responsable: /remains responsible for reporting/i,
    cifrado: /encrypt/i,
  },
}

describe.each(Object.entries(PAGINAS) as [keyof typeof PAGINAS, (typeof PAGINAS)[keyof typeof PAGINAS]][])('presentación (%s)', (idioma, p) => {
  const doc = cargar(p.fichero)
  const main = doc.querySelector('main') as HTMLElement
  const t = textos[idioma]

  it('idioma, título, descripción y un único h1', () => {
    expect(doc.documentElement.lang).toBe(idioma)
    expect(doc.title.length).toBeGreaterThan(10)
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')?.length).toBeGreaterThan(50)
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('meta[name="viewport"]')).toBeTruthy()
  })

  it('tiene las secciones pedidas: qué hace, qué NO hace, privacidad y cómo empezar en 3 pasos', () => {
    expect([...main.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual(expect.arrayContaining(t.secciones))
    const pasos = [...main.querySelectorAll('h2')].find((h) => h.textContent?.trim() === t.secciones[3])?.closest('section')
    expect(pasos?.querySelectorAll('ol > li')).toHaveLength(3)
  })

  it('deja claro que NO envía nada al Ministerio y que el alojamiento sigue siendo responsable, y que es no oficial', () => {
    const texto = main.textContent ?? ''
    expect(texto).toMatch(t.noEnvia)
    expect(texto).toMatch(t.responsable)
    expect(texto).toMatch(t.cifrado)
    expect(texto).toMatch(/SES\.Hospedajes/)
    expect(doc.body.textContent).toMatch(idioma === 'es' ? /no oficial/i : /not official|unofficial/i)
  })

  it('enlaza a la demo y al README', () => {
    const hrefs = [...doc.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain(p.demo)
    expect(hrefs).toContain(README)
  })

  it('selector de idioma: enlace a la otra versión con hreflang y lang, el idioma actual marcado, y rel=alternate', () => {
    const nav = doc.querySelector('nav[aria-label]') as HTMLElement
    const otro = nav.querySelector(`a[hreflang="${p.otro.lang}"]`)
    expect(otro?.getAttribute('href')).toBe(p.otro.href)
    expect(otro?.getAttribute('lang')).toBe(p.otro.lang)
    expect(nav.querySelector('[aria-current="page"]')?.getAttribute('lang') ?? idioma).toBe(idioma)
    expect(doc.querySelector(`link[rel="alternate"][hreflang="${p.otro.lang}"]`)?.getAttribute('href')).toBe(p.otro.href)
  })

  it('rápida y sin terceros: sin JavaScript, sin recursos de otros orígenes, imágenes con tamaño y carga diferida, CSP', () => {
    expect(doc.querySelectorAll('script')).toHaveLength(0)
    for (const el of doc.querySelectorAll('[src], link[href]')) {
      const url = el.getAttribute('src') ?? el.getAttribute('href') ?? ''
      expect(url, el.outerHTML).not.toMatch(/^(https?:)?\/\//)
    }
    for (const img of doc.querySelectorAll('img')) {
      expect(img.getAttribute('alt')?.length, img.outerHTML).toBeGreaterThan(10)
      expect(img.getAttribute('width')).toBeTruthy()
      expect(img.getAttribute('height')).toBeTruthy()
      expect(img.getAttribute('loading')).toBe('lazy')
      expect(existsSync(join(raiz, 'public', (img.getAttribute('src') ?? '').replace(/^(\.\.\/)+/, ''))), img.getAttribute('src') ?? '').toBe(true)
    }
    expect(readFileSync(join(raiz, p.fichero), 'utf8')).toContain('<!--CSP-->')
  })

  it('estructura accesible: salto al contenido, cabecera, main y pie; los enlaces externos lo dicen', () => {
    expect(doc.querySelector('a.saltar')?.getAttribute('href')).toBe('#contenido')
    expect(doc.querySelector('main#contenido')).toBeTruthy()
    expect(doc.querySelector('header')).toBeTruthy()
    expect(doc.querySelector('footer')).toBeTruthy()
  })

  it(
    'sin violaciones de axe',
    async () => {
      document.documentElement.lang = idioma
      document.body.innerHTML = doc.body.innerHTML
      expect(await axe(document.body)).toHaveNoViolations()
    },
    TIMEOUT_AXE,
  )
})

describe('las dos versiones dicen lo mismo', () => {
  const es = cargar(PAGINAS.es.fichero)
  const en = cargar(PAGINAS.en.fichero)
  const forma = (d: Document) => ({
    h2: d.querySelectorAll('main h2').length,
    li: d.querySelectorAll('main li').length,
    img: d.querySelectorAll('img').length,
    a: d.querySelectorAll('main a').length,
  })
  it('mismo número de secciones, puntos, imágenes y enlaces', () => {
    expect(forma(en)).toEqual(forma(es))
  })
})
