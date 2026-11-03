import { describe, expect, it } from 'vitest'
import { DocumentoPdf, aWinAnsi } from '../../src/huesped/pdf'
import { pdfFicha } from '../../src/huesped/fichaPdf'
import { contenidoFicha } from '../../src/huesped/fichaImprimible'
import { crearDatosEnlace } from '../../src/huesped/enlace'
import { adulto, establecimiento, extranjero, reserva } from '../fixtures'

const latin1 = (b: Uint8Array) => Array.from(b, (x) => String.fromCharCode(x)).join('')

/** Comprobación estructural independiente: cabecera, objetos, tabla xref con offsets exactos y tráiler. */
function comprobarEstructura(bytes: Uint8Array) {
  const s = latin1(bytes)
  expect(s.startsWith('%PDF-1.4\n')).toBe(true)
  expect(s.endsWith('%%EOF\n')).toBe(true)
  const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(s)?.[1])
  expect(s.slice(startxref, startxref + 4)).toBe('xref')
  const [, , total] = /xref\n(\d+) (\d+)\n/.exec(s.slice(startxref)) ?? []
  const n = Number(total)
  const entradas = s.slice(startxref).split('\n').slice(2, 2 + n)
  expect(entradas[0]).toBe('0000000000 65535 f ')
  entradas.slice(1).forEach((e, i) => {
    const off = Number(e.slice(0, 10))
    expect(s.slice(off).startsWith(`${i + 1} 0 obj`), `objeto ${i + 1}`).toBe(true)
  })
  // cada stream declara su longitud exacta
  for (const m of s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
    const ini = (m.index ?? 0) + m[0].length
    expect(s.slice(ini + Number(m[1]), ini + Number(m[1]) + 10)).toBe('\nendstream')
  }
  expect(s).toMatch(new RegExp(`trailer\\n<< /Size ${n} /Root 1 0 R /Info \\d+ 0 R >>`))
  return s
}

describe('escritor de PDF mínimo (sin librerías, sin red)', () => {
  it('estructura válida con offsets exactos y número de páginas correcto', () => {
    const d = new DocumentoPdf('Prueba')
    d.texto(50, 800, 'Hola', { tam: 12 })
    d.nuevaPagina()
    d.texto(50, 800, 'Adiós')
    const s = comprobarEstructura(d.bytes())
    expect(s).toContain('/Type /Pages /Kids [')
    expect(s).toContain('/Count 2')
    expect(s).toContain('/BaseFont /Helvetica /Encoding /WinAnsiEncoding')
  })

  it('texto en WinAnsi: acentos y ñ se conservan; paréntesis y barras se escapan', () => {
    const d = new DocumentoPdf('x')
    d.texto(50, 800, 'Lucía Muñoz (piso 3º) \\ ok')
    const s = comprobarEstructura(d.bytes())
    expect(s).toContain('(Luc\xeda Mu\xf1oz \\(piso 3\xba\\) \\\\ ok) Tj')
  })

  it('caracteres que WinAnsi no tiene se sustituyen por «?» y se avisa', () => {
    expect(aWinAnsi('Ольга €')).toEqual({ texto: '????? \x80', sustituidos: true })
    expect(aWinAnsi('Sørensen “OK”').sustituidos).toBe(false)
  })
})

describe('PDF de la ficha del huésped', () => {
  const datos = crearDatosEnlace(establecimiento({ nombre: 'Pensión Ejemplo' }), reserva({ id: 'r1', numPersonas: 2 }), 'A'.repeat(43), 'es')

  it('contiene los datos legibles y el QR del código cifrado', () => {
    const { bytes, sustituidos } = pdfFicha(contenidoFicha(datos, [adulto(), extranjero()], 'es'), 'RV1.' + 'x'.repeat(600))
    const s = comprobarEstructura(bytes)
    expect(sustituidos).toBe(false)
    for (const t of ['Pensi\xf3n Ejemplo', 'Luc\xeda', '12345678Z', 'Smith', 'Springfield']) expect(s).toContain(t)
    expect((s.match(/ re\n/g) ?? []).length).toBeGreaterThan(100) // módulos del QR dibujados como rectángulos
  })

  it('muchos viajeros: varias páginas, con pie numerado', () => {
    const viajeros = Array.from({ length: 8 }, (_, i) => adulto({ id: `v${i}`, nombre: `Viajero${i}` }))
    const s = comprobarEstructura(pdfFicha(contenidoFicha(datos, viajeros, 'es'), 'RV1.abc').bytes)
    const paginas = Number(/\/Count (\d+)/.exec(s)?.[1])
    expect(paginas).toBeGreaterThan(1)
    expect(s).toContain(`(P\xe1gina ${paginas}/${paginas})`)
  })

  it('avisa si algún dato no se puede representar en el PDF', () => {
    expect(pdfFicha(contenidoFicha(datos, [extranjero({ nombre: 'Ольга' })], 'es'), 'RV1.abc').sustituidos).toBe(true)
  })
})
