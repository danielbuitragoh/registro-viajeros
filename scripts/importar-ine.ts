/**
 * Importa la «Relación de municipios y sus códigos por provincias» del INE (xlsx o csv) a la app.
 *
 *   npm run ine:importar -- docs/oficial/ine/<fichero del INE>.xlsx [--fecha AAAA-MM-DD]
 *
 * Escribe src/oficial/ine/municipios-AAAA-MM-DD.json y muestra los cambios respecto a la relación anterior
 * (altas, bajas —p. ej. fusiones— y cambios de nombre). --ficticia es solo para generar muestras de prueba (nunca se usa en la app).
 * Necesita Node 22.18 o posterior (ejecuta TypeScript directamente).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compararRelaciones, ErrorImportacion, importar, type RelacionImportada } from './ine/importar.ts'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opcion = (n: string) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}
const ficticia = args.includes('--ficticia')
const fecha = opcion('--fecha')
const fichero = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--fecha' && args[i - 1] !== '--salida')
const salida = resolve(raiz, opcion('--salida') ?? (ficticia ? 'src/demo/ine' : 'src/oficial/ine'))

function fallar(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

if (!fichero) fallar('Uso: npm run ine:importar -- docs/oficial/ine/<fichero del INE>.xlsx [--fecha AAAA-MM-DD]')
const ruta = resolve(fichero)
if (!existsSync(ruta)) fallar(`No existe ${fichero}`)
// Los códigos solo pueden salir del fichero oficial guardado en el repositorio (la prueba de guardia lo comprueba)
if (!ficticia && relative(join(raiz, 'docs/oficial/ine'), ruta).startsWith('..')) {
  fallar('Copia antes el fichero oficial del INE, tal cual, en docs/oficial/ine/ y vuelve a ejecutar el script con esa ruta.')
}

try {
  const r = await importar(new Uint8Array(readFileSync(ruta)), basename(ruta), { fecha, ficticia })
  mkdirSync(salida, { recursive: true })
  const destino = join(salida, r.nombreSalida)
  writeFileSync(destino, r.json)
  console.log(`✔ ${relative(raiz, destino)}: ${r.relacion.municipios.length} municipios, relación a ${r.relacion.fecha} (sha256 ${r.sha256.slice(0, 12)}…)`)

  // Cambios respecto a la relación anterior más reciente (si la hay)
  const anteriores = readdirSync(salida)
    .filter((f) => /^municipios-\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < r.nombreSalida)
    .sort()
  const previo = anteriores.at(-1)
  if (previo) {
    const datos = JSON.parse(readFileSync(join(salida, previo), 'utf8')) as { fecha: string; provincias: Record<string, string[]> }
    const antigua: RelacionImportada = {
      fecha: datos.fecha,
      municipios: Object.entries(datos.provincias).flatMap(([p, ms]) => ms.map((m) => ({ codigo: p + m.slice(0, 3), nombre: m.slice(3) }))),
    }
    const c = compararRelaciones(antigua, r.relacion)
    const lista = (xs: { codigo: string; nombre: string }[]) => xs.map((m) => `    ${m.codigo} ${m.nombre}`).join('\n')
    console.log(`\nCambios desde la relación a ${antigua.fecha}:`)
    console.log(`  Altas (${c.altas.length})${c.altas.length ? `\n${lista(c.altas)}` : ''}`)
    console.log(`  Bajas, p. ej. por fusión (${c.bajas.length})${c.bajas.length ? `\n${lista(c.bajas)}` : ''}`)
    console.log(`  Cambios de nombre (${c.renombrados.length})${c.renombrados.map((x) => `\n    ${x.codigo} ${x.antes} → ${x.despues}`).join('')}`)
    console.log('\nLa app avisa de los códigos dados de baja mientras conserves también la relación anterior en la misma carpeta.')
  }
} catch (e) {
  if (e instanceof ErrorImportacion) fallar(e.message)
  throw e
}

