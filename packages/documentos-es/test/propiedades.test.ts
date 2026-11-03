import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { controlCif, validarCIF } from '../src/cif.js'
import { detectarTipo } from '../src/detectar.js'
import { letraDni, validarDNI } from '../src/dni.js'
import { mensajeError } from '../src/mensajes.js'
import { letraNie, validarNIE } from '../src/nie.js'
import { normalizarDocumento } from '../src/normalizar.js'
import { validarDocumento } from '../src/validar.js'
import {
  ENTIDADES,
  ENTIDADES_AMBOS,
  ENTIDADES_SOLO_DIGITO,
  ENTIDADES_SOLO_LETRA,
  refCifValido,
  refControlCif,
  refDniValido,
  refLetraDni,
  refLetraNie,
  refNieValido,
  refNormalizar,
  refTipo,
} from './referencia.js'

const RUNS = { numRuns: 1500 }

const cifras = (n: number) => fc.stringMatching(new RegExp(`^[0-9]{${n}}$`))
const numeroDni = fc.integer({ min: 0, max: 99_999_999 })
const cuerpoDni = numeroDni.map((n) => String(n).padStart(8, '0'))
const letra = fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
const entidad = fc.constantFrom(...ENTIDADES)
const prefijoNie = fc.constantFrom('X', 'Y', 'Z')
const controlCifPosible = fc.constantFrom(...'0123456789JABCDEFGHI')

/** Ensucia un documento: minúsculas al azar y separadores (espacios, puntos, guiones) en cualquier posición. */
const ensuciar = (doc: string) =>
  fc
    .tuple(fc.array(fc.boolean(), { minLength: doc.length, maxLength: doc.length }), fc.array(fc.constantFrom('', '', '', ' ', '.', '-', '_', '\t', ' ', '  '), { minLength: doc.length + 1, maxLength: doc.length + 1 }))
    .map(([minus, seps]) => [...doc].map((c, i) => `${seps[i]}${minus[i] ? c.toLowerCase() : c}`).join('') + seps[doc.length])

/** Cadenas «cercanas» a un documento: pocos caracteres, del alfabeto que usan los documentos más algo de ruido. */
const casiDocumento = fc.string({ unit: fc.constantFrom(...'0123456789012345678901234567890XYZKLMABCDEFGHJNPQRSUVWTIOÑabcxyz-. _'), minLength: 0, maxLength: 12 })
const cualquierTexto = fc.oneof(casiDocumento, fc.string({ maxLength: 20 }), fc.string({ unit: 'grapheme', maxLength: 12 }))

describe('propiedades: normalizarDocumento', () => {
  it('coincide con la referencia', () => {
    fc.assert(fc.property(fc.string({ unit: 'binary', maxLength: 30 }), (s) => normalizarDocumento(s) === refNormalizar(s)), RUNS)
    fc.assert(fc.property(casiDocumento, (s) => normalizarDocumento(s) === refNormalizar(s)), RUNS)
  })

  it('es idempotente y no deja separadores ni minúsculas de la A a la Z', () => {
    fc.assert(
      fc.property(cualquierTexto, (s) => {
        const n = normalizarDocumento(s)
        expect(normalizarDocumento(n)).toBe(n)
        expect(n).not.toMatch(/[\s.\-_a-z]/)
      }),
      RUNS,
    )
  })
})

describe('propiedades: letras de control', () => {
  it('letraDni coincide con la referencia para TODO el rango válido (muestreado) y sus extremos', () => {
    fc.assert(fc.property(numeroDni, (n) => letraDni(n) === refLetraDni(n) && letraDni(String(n)) === refLetraDni(n) && letraDni(String(n).padStart(8, '0')) === refLetraDni(n)), { numRuns: 5000 })
    for (const n of [0, 1, 22, 23, 99_999_999, 99_999_998]) expect(letraDni(n)).toBe(refLetraDni(n))
  })

  it('letraDni es periódica de periodo 23 y recorre las 23 letras', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 99_999_999 - 23 }), (n) => letraDni(n) === letraDni(n + 23)), RUNS)
    expect(new Set(Array.from({ length: 23 }, (_, i) => letraDni(i))).size).toBe(23)
  })

  it('letraNie coincide con la referencia', () => {
    fc.assert(fc.property(prefijoNie, cifras(7), (p, c) => letraNie(`${p}${c}`) === refLetraNie(`${p}${c}`)), { numRuns: 3000 })
  })

  it('controlCif coincide con la referencia y su letra corresponde a su dígito', () => {
    fc.assert(
      fc.property(entidad, cifras(7), (e, c) => {
        const real = controlCif(`${e}${c}`)
        const ref = refControlCif(`${e}${c}`)
        expect(real).toEqual(ref)
        expect('JABCDEFGHI'.indexOf(real.letra)).toBe(Number(real.digito))
      }),
      { numRuns: 3000 },
    )
  })

  it('las funciones de cálculo lanzan RangeError (y solo eso) con entradas fuera de rango', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }), (s) => {
        if (!/^\d{1,8}$/.test(s)) expect(() => letraDni(s)).toThrow(RangeError)
      }),
      RUNS,
    )
    fc.assert(fc.property(fc.oneof(fc.double(), fc.integer({ min: -1000, max: 1_000_000_000 })), (n) => {
      const dentro = Number.isInteger(n) && n >= 0 && n <= 99_999_999
      if (dentro) expect(letraDni(n)).toBe(refLetraDni(n))
      else expect(() => letraDni(n)).toThrow(RangeError)
    }), RUNS)
  })
})

describe('propiedades: documentos bien formados', () => {
  it('DNI: con su letra es válido; con cualquier otra, «letra» con la esperada', () => {
    fc.assert(
      fc.property(cuerpoDni, letra, (c, l) => {
        const correcta = refLetraDni(Number(c))
        const r = validarDNI(`${c}${l}`)
        if (l === correcta) expect(r).toEqual({ ok: true, normalizado: `${c}${l}` })
        else expect(r).toEqual({ ok: false, codigo: 'letra', esperada: correcta })
      }),
      { numRuns: 3000 },
    )
  })

  it('NIE: con su letra es válido; con cualquier otra, «letra» con la esperada', () => {
    fc.assert(
      fc.property(prefijoNie, cifras(7), letra, (p, c, l) => {
        const correcta = refLetraNie(`${p}${c}`)
        const r = validarNIE(`${p}${c}${l}`)
        if (l === correcta) expect(r).toEqual({ ok: true, normalizado: `${p}${c}${l}` })
        else expect(r).toEqual({ ok: false, codigo: 'letra', esperada: correcta })
      }),
      { numRuns: 3000 },
    )
  })

  it('CIF: el control correcto vale según el tipo de entidad y cualquier otro es «control»', () => {
    fc.assert(
      fc.property(entidad, cifras(7), controlCifPosible, (e, c, k) => {
        const { digito, letra: l } = refControlCif(`${e}${c}`)
        const valido = ENTIDADES_SOLO_LETRA.includes(e) ? k === l : ENTIDADES_SOLO_DIGITO.includes(e) ? k === digito : ENTIDADES_AMBOS.includes(e) && (k === l || k === digito)
        const r = validarCIF(`${e}${c}${k}`)
        expect(r.ok).toBe(valido)
        if (!r.ok) {
          expect(r.codigo).toBe('control')
          expect(r.esperada).toBe(ENTIDADES_SOLO_LETRA.includes(e) ? l : digito)
        }
      }),
      { numRuns: 5000 },
    )
  })

  it('el error «esperada» de cada validador, puesto en su sitio, hace válido el documento (corregir = arreglar)', () => {
    fc.assert(
      fc.property(cuerpoDni, prefijoNie, cifras(7), entidad, (c, p, c7, e) => {
        const d = validarDNI(`${c}A`)
        if (!d.ok && d.esperada) expect(validarDNI(`${c}${d.esperada}`).ok).toBe(true)
        const n = validarNIE(`${p}${c7}A`)
        if (!n.ok && n.esperada) expect(validarNIE(`${p}${c7}${n.esperada}`).ok).toBe(true)
        const k = validarCIF(`${e}${c7}0`)
        if (!k.ok && k.esperada) expect(validarCIF(`${e}${c7}${k.esperada}`).ok).toBe(true)
      }),
      RUNS,
    )
  })

  it('los NIF K, L y M se aceptan con cualquier letra, con aviso', () => {
    fc.assert(
      fc.property(fc.constantFrom('K', 'L', 'M'), cifras(7), letra, (k, c, l) => {
        expect(validarDNI(`${k}${c}${l}`)).toEqual({ ok: true, normalizado: `${k}${c}${l}`, aviso: 'control_no_verificado' })
      }),
      RUNS,
    )
  })

  it('un NIE validado como DNI es siempre «parece_nie» y un DNI validado como NIE, «parece_dni»', () => {
    fc.assert(
      fc.property(prefijoNie, cifras(7), letra, (p, c, l) => {
        expect(validarDNI(`${p}${c}${l}`)).toEqual({ ok: false, codigo: 'parece_nie' })
        expect(validarNIE(`${c}${p === 'X' ? '0' : '1'}${l}`.slice(0, 9))).toEqual({ ok: false, codigo: 'parece_dni' })
      }),
      RUNS,
    )
  })
})

describe('propiedades: la suciedad (minúsculas, espacios, puntos, guiones) no cambia el veredicto', () => {
  const ejemplos = fc.oneof(
    cuerpoDni.map((c) => `${c}${refLetraDni(Number(c))}`),
    fc.tuple(prefijoNie, cifras(7)).map(([p, c]) => `${p}${c}${refLetraNie(`${p}${c}`)}`),
    fc.tuple(entidad, cifras(7)).map(([e, c]) => `${e}${c}${refControlCif(`${e}${c}`)[ENTIDADES_SOLO_LETRA.includes(e) ? 'letra' : 'digito']}`),
  )

  it('validarDocumento da lo mismo con el documento limpio y ensuciado, y normaliza al limpio', () => {
    fc.assert(
      fc.property(
        ejemplos.chain((doc) => ensuciar(doc).map((sucio) => [doc, sucio] as const)),
        ([doc, sucio]) => {
          const limpio = validarDocumento(doc)
          expect(limpio.ok).toBe(true)
          expect(validarDocumento(sucio)).toEqual(limpio)
          if (limpio.ok) expect(limpio.normalizado).toBe(doc)
        },
      ),
      { numRuns: 3000 },
    )
  })
})

describe('propiedades: contra la implementación de referencia, con entradas arbitrarias', () => {
  it('validarDNI, validarNIE y validarCIF dicen lo mismo que la referencia', () => {
    fc.assert(
      fc.property(casiDocumento, (s) => {
        const dni = validarDNI(s)
        // un NIE puesto como DNI (o al revés) no es válido en ninguno de los dos
        expect(dni.ok).toBe(refDniValido(s))
        expect(validarNIE(s).ok).toBe(refNieValido(s))
        expect(validarCIF(s).ok).toBe(refCifValido(s))
      }),
      { numRuns: 20_000 },
    )
  })

  it('con entradas cercanas a un documento real (un carácter cambiado), también coinciden', () => {
    const casiReal = fc
      .tuple(cuerpoDni, fc.integer({ min: 0, max: 8 }), fc.constantFrom(...'0123456789XYZKLMABCDEFGHJNPQRSUVWTIOÑ'))
      .map(([c, i, ch]) => {
        const doc = `${c}${refLetraDni(Number(c))}`
        return `${doc.slice(0, i)}${ch}${doc.slice(i + 1)}`
      })
    fc.assert(
      fc.property(casiReal, (s) => {
        expect(validarDNI(s).ok).toBe(refDniValido(s))
        expect(validarNIE(s).ok).toBe(refNieValido(s))
        expect(validarCIF(s).ok).toBe(refCifValido(s))
        expect(detectarTipo(s)).toBe(refTipo(s))
      }),
      { numRuns: 5000 },
    )
  })

  it('detectarTipo coincide con la referencia', () => {
    fc.assert(fc.property(casiDocumento, (s) => detectarTipo(s) === refTipo(s)), { numRuns: 20_000 })
  })

  it('validarDocumento: ok solo si el validador de su tipo dice ok; tipo null ⇒ «formato»', () => {
    fc.assert(
      fc.property(casiDocumento, (s) => {
        const r = validarDocumento(s)
        const tipo = refTipo(s)
        expect(r.tipo).toBe(tipo)
        if (tipo === null) expect(r).toEqual({ ok: false, tipo: null, codigo: 'formato' })
        else expect(r.ok).toBe(tipo === 'DNI' ? refDniValido(s) : tipo === 'NIE' ? refNieValido(s) : refCifValido(s))
      }),
      { numRuns: 20_000 },
    )
  })
})

describe('propiedades: robustez con cualquier entrada', () => {
  it('ningún validador lanza, y el resultado siempre tiene una forma coherente', () => {
    fc.assert(
      fc.property(cualquierTexto, (s) => {
        for (const f of [validarDNI, validarNIE, validarCIF, validarDocumento]) {
          const r = f(s)
          if (r.ok) {
            expect(r.normalizado).toBe(normalizarDocumento(s))
            expect(r.normalizado).toHaveLength(9)
          } else {
            expect(['formato', 'letra', 'control', 'parece_nie', 'parece_dni']).toContain(r.codigo)
            expect(mensajeError(r, 'es').length).toBeGreaterThan(0)
            expect(mensajeError(r, 'en').length).toBeGreaterThan(0)
          }
        }
      }),
      { numRuns: 5000 },
    )
  })

  it('con valores que no son texto tampoco lanzan', () => {
    fc.assert(
      fc.property(fc.anything(), (x) => {
        for (const f of [validarDNI, validarNIE, validarCIF, validarDocumento]) {
          const r = f(x as string)
          if (typeof x !== 'string') expect(r.ok).toBe(false)
        }
        if (typeof x !== 'string') expect(detectarTipo(x as string)).toBeNull()
      }),
      RUNS,
    )
  })

  it('un documento válido lo es sólo de un tipo: ningún par de validadores lo acepta a la vez', () => {
    fc.assert(
      fc.property(casiDocumento, (s) => {
        const aceptan = [validarDNI(s).ok, validarNIE(s).ok, validarCIF(s).ok].filter(Boolean).length
        expect(aceptan).toBeLessThanOrEqual(1)
      }),
      { numRuns: 20_000 },
    )
  })
})
