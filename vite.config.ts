/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { opcionesPwa } from './pwa.config'

// En GitHub Pages la app vive en /registro-viajeros/. En local, en la raíz.
const base = process.env.VITE_BASE ?? '/'

// Política de seguridad de contenidos: solo recursos propios (sin analítica ni llamadas externas). Solo en producción:
// en desarrollo React inyecta un script inline.
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'csp-solo-produccion',
      transformIndexHtml: {
        order: 'pre',
        handler: (html, ctx) =>
          html.replace('<!--CSP-->', ctx.server ? '' : `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
      },
    },
    VitePWA(opcionesPwa(base)),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Las pruebas de interfaz con IndexedDB/crypto/axe son más lentas en runners compartidos de CI.
    testTimeout: 15_000,
  },
})
