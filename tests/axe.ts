import { axe } from 'vitest-axe'

/** jsdom no puede calcular contraste de color (no hay canvas): esa regla se verifica aparte (tests/contraste.test.ts). */
export const axeSinContraste = (el: Element) => axe(el, { rules: { 'color-contrast': { enabled: false } } })

/**
 * Presupuesto de tiempo para pruebas que ejecutan axe: recorre todo el DOM y en un runner de CI compartido puede
 * tardar mucho más que en local (~1 s). No oculta fallos: solo evita falsos negativos por lentitud del entorno.
 */
export const TIMEOUT_AXE = 30_000
