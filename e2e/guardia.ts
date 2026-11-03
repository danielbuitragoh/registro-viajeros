import { test as base, expect, type BrowserContext } from '@playwright/test'

export const ORIGEN = 'http://localhost:4173'

/** Solo se permite el propio origen (y URLs que no salen del navegador). */
export const esPermitida = (url: string) => url === ORIGEN || url.startsWith(`${ORIGEN}/`) || /^(data|blob|about|chrome-extension):/.test(url)

export interface Guardia {
  /** Peticiones a otros orígenes intentadas por la página (se abortan y se apuntan). */
  externas: string[]
  /** Violaciones de la política de seguridad (CSP) que haya informado el navegador. */
  violacionesCsp: string[]
  /** Vigila también otro contexto (móvil del huésped, navegador con cámara…). */
  vigilar(ctx: BrowserContext): Promise<void>
}

export function crearGuardia(): Guardia {
  const g: Guardia = {
    externas: [],
    violacionesCsp: [],
    async vigilar(ctx) {
      ctx.on('request', (r) => {
        if (!esPermitida(r.url())) g.externas.push(r.url())
      })
      ctx.on('console', (m) => {
        if (/Content Security Policy|Refused to (load|connect|execute|frame)/i.test(m.text())) g.violacionesCsp.push(m.text())
      })
      // Nada sale a internet durante las pruebas, aunque la app lo intentara
      await ctx.route((url) => !esPermitida(url.href), (route) => route.abort('blockedbyclient'))
    },
  }
  return g
}

/**
 * `test` con guardia automática: CUALQUIER prueba falla si la página intenta una petición a otro origen
 * o si el navegador informa de una violación de la CSP.
 */
export const test = base.extend<{ guardia: Guardia }>({
  guardia: [
    async ({ context }, usar) => {
      const g = crearGuardia()
      await g.vigilar(context)
      await usar(g)
      expect(g.externas, 'peticiones a otros orígenes').toEqual([])
      expect(g.violacionesCsp, 'violaciones de la CSP').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
