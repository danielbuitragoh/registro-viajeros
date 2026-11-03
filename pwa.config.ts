import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa'

/** Manifiesto de la PWA (instalable en Android, Chrome, Edge, iOS…). `base`: ruta donde vive la app. */
export function manifiesto(base: string): Partial<ManifestOptions> {
  return {
    id: base,
    name: 'Registro de viajeros',
    short_name: 'Viajeros',
    description: 'Registro de viajeros local-first para alojamientos pequeños: funciona sin conexión y sin servidor. No oficial.',
    lang: 'es',
    dir: 'ltr',
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#1f4e79',
    categories: ['business', 'productivity'],
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}

/**
 * Service worker (Workbox, generado en el build): precachea TODO lo que la app necesita para funcionar sin red
 * en el dispositivo de recepción (código, estilos, páginas, iconos y los trozos de la relación de municipios).
 * No hay caché en tiempo de ejecución ni peticiones a otros orígenes. Las versiones nuevas se instalan en espera y
 * solo se activan cuando la persona pulsa «Actualizar ahora» (registerType: 'prompt').
 */
export function opcionesPwa(base: string): Partial<VitePWAOptions> {
  return {
    registerType: 'prompt',
    injectRegister: false,
    // Los iconos ya entran por globPatterns, y el plugin añade el manifiesto por su cuenta: sin entradas repetidas
    includeManifestIcons: false,
    manifest: manifiesto(base),
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'],
      navigateFallback: 'index.html',
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      // El trozo principal de la app ocupa ~600 kB: margen de sobra para que nunca se quede fuera del precache
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    },
  }
}
