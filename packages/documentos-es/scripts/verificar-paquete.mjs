#!/usr/bin/env node
/**
 * Verifica el paquete tal como lo recibiría quien lo instale desde npm, sin publicar nada:
 *  1. `npm pack` (que compila) y comprobación de qué ficheros viajan en el .tgz;
 *  2. sin dependencias en tiempo de ejecución y sin APIs exclusivas de Node en el código compilado (navegador + Node);
 *  3. instala el .tgz en un proyecto vacío, lo importa por su nombre en Node (ESM) y ejercita la API;
 *  4. comprueba con `tsc` que los tipos se resuelven (moduleResolution `bundler` y `nodenext`).
 * Uso: `npm run verificar -w @danielbuitragoh/documentos-es` (o `npm run verificar` dentro del paquete).
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'))
const tmp = mkdtempSync(join(tmpdir(), 'documentos-es-'))
const fallos = []
const comprobar = (condicion, mensaje) => {
  console.log(`${condicion ? '✔' : '✘'} ${mensaje}`)
  if (!condicion) fallos.push(mensaje)
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const ejecutar = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })

try {
  // 1. Empaquetar
  const salida = JSON.parse(ejecutar(npm, ['pack', '--json', '--pack-destination', tmp], raiz))
  const { filename, files } = salida[0]
  const rutas = files.map((f) => f.path).sort()
  console.log(`Paquete: ${filename} (${rutas.length} ficheros)`)
  const obligatorios = ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts']
  for (const f of obligatorios) comprobar(rutas.includes(f), `incluye ${f}`)
  const sobrantes = rutas.filter((r) => !(obligatorios.includes(r) || /^dist\/[\w.-]+\.(js|d\.ts)$/.test(r)))
  comprobar(sobrantes.length === 0, `no incluye nada más que dist/, README, CHANGELOG, LICENSE y package.json${sobrantes.length ? ` (sobran: ${sobrantes.join(', ')})` : ''}`)
  comprobar(!rutas.some((r) => /(^|\/)(src|test|scripts)\//.test(r) || r.endsWith('.map')), 'no incluye fuentes, pruebas, scripts ni mapas de fuentes')

  // 2. Sin dependencias y sin APIs de Node
  comprobar(!pkg.dependencies && !pkg.peerDependencies && !pkg.optionalDependencies, 'sin dependencias en tiempo de ejecución')
  comprobar(pkg.license === 'MIT', 'licencia MIT')
  const dist = join(raiz, 'dist')
  const codigo = readdirSync(dist).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dist, f), 'utf8')).join('\n')
  comprobar(!/\bfrom\s+['"][^./]|\brequire\(|\bimport\(|\bprocess\.|\bBuffer\b|node:/.test(codigo), 'el código compilado no importa nada externo ni usa APIs exclusivas de Node (vale en navegador)')

  // 3. Instalar el .tgz en un proyecto vacío y usarlo en Node
  const proyecto = join(tmp, 'proyecto')
  mkdirSync(proyecto)
  writeFileSync(join(proyecto, 'package.json'), JSON.stringify({ name: 'prueba-consumidor', private: true, type: 'module' }))
  ejecutar(npm, ['install', join(tmp, filename), '--no-audit', '--no-fund', '--ignore-scripts', '--offline'], proyecto)
  writeFileSync(
    join(proyecto, 'uso.mjs'),
    `import * as api from '${pkg.name}'
const r = api.validarDocumento(' 12.345.678-a ')
console.log(JSON.stringify([Object.keys(api).sort(), r, api.mensajeError(r, 'en'), api.letraDni(12345678), api.letraNie('X1234567'), api.controlCif('A2801586'), api.detectarTipo('x1234567l')]))
`,
  )
  const [nombres, r, mensaje, letra, letraDeNie, control, tipo] = JSON.parse(ejecutar(process.execPath, ['uso.mjs'], proyecto))
  comprobar(nombres.length === 10, `la importación por nombre en Node (ESM) funciona y exporta ${nombres.length} funciones`)
  comprobar(r.ok === false && r.tipo === 'DNI' && r.codigo === 'letra' && r.esperada === 'Z', 'validarDocumento devuelve el resultado esperado')
  comprobar(mensaje === 'The check letter is wrong: it should be Z.', 'mensajeError en inglés')
  comprobar(letra === 'Z' && letraDeNie === 'L' && control.letra === 'E' && tipo === 'NIE', 'letraDni, letraNie, controlCif y detectarTipo')

  // 4. Tipos
  const tsc = join(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin', 'tsc')
  writeFileSync(
    join(proyecto, 'tipos.ts'),
    `import { validarDocumento, validarDNI, mensajeError, type Resultado, type ResultadoDocumento, type CodigoError, type TipoDocumento, type Idioma } from '${pkg.name}'
const r: ResultadoDocumento = validarDocumento('12345678Z')
const t: TipoDocumento | null = r.tipo
const x: Resultado = validarDNI('12345678Z')
const i: Idioma = 'en'
if (!x.ok) { const c: CodigoError = x.codigo; mensajeError(x, i); void c }
// @ts-expect-error el idioma solo puede ser 'es' o 'en'
mensajeError({ codigo: 'formato' }, 'fr')
void t
`,
  )
  for (const resolucion of ['bundler', 'nodenext']) {
    const modulo = resolucion === 'nodenext' ? 'nodenext' : 'esnext'
    try {
      ejecutar(process.execPath, [tsc, 'tipos.ts', '--noEmit', '--strict', '--target', 'es2022', '--module', modulo, '--moduleResolution', resolucion, '--skipLibCheck', 'false'], proyecto)
      comprobar(true, `los tipos se resuelven con moduleResolution «${resolucion}»`)
    } catch {
      comprobar(false, `los tipos se resuelven con moduleResolution «${resolucion}»`)
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

if (fallos.length) {
  console.error(`\n${fallos.length} comprobación(es) fallida(s).`)
  process.exit(1)
}
console.log('\nPaquete verificado: listo para publicar.')
