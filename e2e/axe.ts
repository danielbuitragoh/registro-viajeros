import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Page } from '@playwright/test'

const axeFuente = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

/** axe en el navegador real (aquí sí se mide el contraste): WCAG 2.0/2.1/2.2 A y AA y buenas prácticas. */
export async function violacionesAxe(page: Page): Promise<string[]> {
  // Se evalúa por CDP: la CSP de la página (script-src 'self') sigue intacta y bloquearía un <script> inyectado
  if (!(await page.evaluate(() => 'axe' in window))) await page.evaluate(axeFuente)
  return page.evaluate(async () => {
    const r = await (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: { id: string; nodes: { target: unknown }[] }[] }> } }).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    })
    return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${JSON.stringify(v.nodes.slice(0, 3).map((n) => n.target))}`)
  })
}
