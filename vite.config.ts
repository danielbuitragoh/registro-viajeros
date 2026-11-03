/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
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
  // El paquete del workspace (packages/documentos-es) se importa por su nombre, como cualquier dependencia, pero aquí se
  // resuelve a su código fuente: así la app y las pruebas no dependen de haber compilado antes su `dist`.
  resolve: {
    alias: { '@danielbuitragoh/documentos-es': fileURLToPath(new URL('./packages/documentos-es/src/index.ts', import.meta.url)) },
  },
  // Dos entradas más: la página de presentación (estática, sin JavaScript) en español e inglés
  build: {
    rollupOptions: {
      input: {
        app: 'index.html',
        presentacion: 'presentacion/index.html',
        presentacionEn: 'presentacion/en/index.html',
      },
    },
  },
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
