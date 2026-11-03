import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas end-to-end sobre el build de PRODUCCIÓN (con su CSP) servido con `vite preview`.
 * Se usa el build de la demo (el mismo que se publica en GitHub Pages).
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  outputDir: 'test-results',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', locale: 'es-ES', timezoneId: 'Europe/Madrid' },
  webServer: {
    // Además, un build con la misma base que GitHub Pages (/registro-viajeros/) para las pruebas del service worker
    command: 'npm run build && VITE_BASE=/registro-viajeros/ npx vite build --outDir dist-pages --emptyOutDir && npx vite preview --port 4173 --strictPort',
    env: { VITE_DEMO: 'true' },
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
