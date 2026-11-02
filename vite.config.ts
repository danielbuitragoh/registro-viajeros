/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Registro de viajeros',
        short_name: 'Viajeros',
        description: 'Registro de viajeros local-first para alojamientos pequeños. No oficial.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f4e79',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg}'] },
    }),
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
