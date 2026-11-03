import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

/** Servidor estático mínimo que lee cada fichero del disco en cada petición (para simular un despliegue nuevo). */
export async function servirCarpeta(carpeta: string, puerto: number): Promise<Server> {
  const servidor = createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
    const fichero = normalize(join(carpeta, ruta.endsWith('/') ? `${ruta}index.html` : ruta))
    if (!fichero.startsWith(carpeta)) return void res.writeHead(403).end()
    try {
      const datos = await readFile(fichero)
      res.writeHead(200, { 'content-type': TIPOS[extname(fichero)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(datos)
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise<void>((ok) => servidor.listen(puerto, 'localhost', ok))
  return servidor
}
