/*
 * Complemento del service worker que genera Workbox (se carga con importScripts, antes de sus rutas).
 *
 * 1) Relevo del service worker antiguo. Hasta el PR #3 la app usaba un SW «autoUpdate» que respondía a TODA
 *    navegación con index.html (no conocía la página de presentación). El SW actual espera a que la persona pulse
 *    «Actualizar ahora», pero el código antiguo de la página nunca se lo pide: se quedaba esperando para siempre.
 *    Regla: si hay un SW activo que NO dejó la marca de esta generación, este se activa solo (una única vez).
 *    A partir de ahí, las versiones nuevas vuelven a esperar al aviso.
 *
 * 2) Páginas estáticas sin la barra final («…/presentacion»): si su index.html está precacheado, redirige a
 *    «…/presentacion/», que sí se sirve desde el precache (también sin conexión). Si no, va a la red, que es lo
 *    mismo que haría Workbox (la app solo responde a la raíz).
 */
const MARCA = 'rv-sw-generacion'

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      if (!self.registration.active) return
      const marca = await (await caches.open(MARCA)).match('generacion')
      if (!marca) await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.open(MARCA).then((c) => c.put('generacion', new Response('2'))))
})

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request
  if (peticion.mode !== 'navigate') return
  const url = new URL(peticion.url)
  if (url.origin !== self.location.origin || url.pathname.endsWith('/') || /\.[a-z0-9]+$/i.test(url.pathname)) return
  evento.respondWith(
    (async () => {
      const pagina = await caches.match(new URL(`${url.pathname}/index.html`, url.origin).href, { ignoreSearch: true })
      if (pagina) return Response.redirect(`${url.pathname}/${url.search}`, 301)
      return fetch(peticion)
    })(),
  )
})
