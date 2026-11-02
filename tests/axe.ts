import { axe } from 'vitest-axe'

/** jsdom no puede calcular contraste de color (no hay canvas): esa regla se verifica aparte (tests/contraste.test.ts). */
export const axeSinContraste = (el: Element) => axe(el, { rules: { 'color-contrast': { enabled: false } } })
