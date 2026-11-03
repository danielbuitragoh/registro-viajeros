import { describe, expect, it } from 'vitest'
import { controlCif, validarCIF } from '../src/cif.js'

/**
 * Cuerpos de 7 cifras con su control, calculados aparte a mano (suma de las cifras en posiciones pares + las impares
 * duplicadas con sus cifras sumadas; control = (10 − suma mod 10) mod 10; letra = J A B C D E F G H I [control]).
 */
const CUERPOS: Record<string, readonly [digito: string, letra: string]> = {
  '1234567': ['4', 'D'],
  '0000000': ['0', 'J'],
  '9999999': ['7', 'G'],
  '2801586': ['5', 'E'],
}
const SOLO_LETRA = ['N', 'P', 'Q', 'R', 'S', 'W'] // entidades que exigen letra (administraciones, asociaciones, extranjeras…)
const SOLO_DIGITO = ['A', 'B', 'E', 'H'] // sociedades anónimas, limitadas, comunidades de bienes y propietarios: dígito
const AMBOS = ['C', 'D', 'F', 'G', 'J', 'U', 'V'] // admiten cualquiera de los dos
const ENTIDADES = [...SOLO_LETRA, ...SOLO_DIGITO, ...AMBOS]

describe('controlCif', () => {
  it.each(Object.entries(CUERPOS))('cuerpo %s → dígito %s y letra %s', (cuerpo, [digito, letra]) => {
    expect(controlCif(`A${cuerpo}`)).toEqual({ digito, letra })
  })

  it('no depende de la letra de entidad: solo del cuerpo', () => {
    for (const org of ENTIDADES) expect(controlCif(`${org}2801586`)).toEqual({ digito: '5', letra: 'E' })
  })

  it('los 10 valores posibles del control se alcanzan (0 → J, 1 → A … 9 → I)', () => {
    const vistos = new Map<string, string>()
    for (let n = 0; n < 1000; n++) {
      const c = controlCif(`A${String(n).padStart(7, '0')}`)
      vistos.set(c.digito, c.letra)
    }
    expect([...vistos.entries()].sort()).toEqual([
      ['0', 'J'], ['1', 'A'], ['2', 'B'], ['3', 'C'], ['4', 'D'], ['5', 'E'], ['6', 'F'], ['7', 'G'], ['8', 'H'], ['9', 'I'],
    ])
  })

  it('normaliza la entrada', () => {
    expect(controlCif(' a-2801586 ')).toEqual({ digito: '5', letra: 'E' })
  })

  it.each(['', 'A280158', 'A28015865', 'I2801586', '12801586', 'A28015E6'])('lanza RangeError con %j', (entrada) => {
    expect(() => controlCif(entrada)).toThrow(RangeError)
  })
})

describe('validarCIF: CIF reales y calculados', () => {
  it.each(['A28015865', 'B83191270', 'Q2826000H', 'P2807900B', 'G28102036', 'G2810203F', 'a28015865', 'A-28015865', ' q 2826000 h '])('acepta %j', (cif) => {
    expect(validarCIF(cif).ok).toBe(true)
  })

  it('devuelve el documento normalizado', () => {
    expect(validarCIF(' q-2826000-h ')).toEqual({ ok: true, normalizado: 'Q2826000H' })
  })
})

describe('validarCIF: control según el tipo de entidad', () => {
  describe.each(Object.entries(CUERPOS))('cuerpo %s', (cuerpo, [digito, letra]) => {
    it.each(SOLO_LETRA)('%s exige LETRA: acepta %s, rechaza el dígito', (org) => {
      expect(validarCIF(`${org}${cuerpo}${letra}`)).toEqual({ ok: true, normalizado: `${org}${cuerpo}${letra}` })
      expect(validarCIF(`${org}${cuerpo}${digito}`)).toEqual({ ok: false, codigo: 'control', esperada: letra })
    })

    it.each(SOLO_DIGITO)('%s exige DÍGITO: acepta el dígito, rechaza la letra', (org) => {
      expect(validarCIF(`${org}${cuerpo}${digito}`)).toEqual({ ok: true, normalizado: `${org}${cuerpo}${digito}` })
      expect(validarCIF(`${org}${cuerpo}${letra}`)).toEqual({ ok: false, codigo: 'control', esperada: digito })
    })

    it.each(AMBOS)('%s admite dígito o letra', (org) => {
      expect(validarCIF(`${org}${cuerpo}${digito}`).ok).toBe(true)
      expect(validarCIF(`${org}${cuerpo}${letra}`).ok).toBe(true)
    })
  })

  it('rechaza un control incorrecto en todas las entidades, indicando el esperado', () => {
    for (const org of ENTIDADES) {
      // Con el cuerpo 2801586 el control correcto es 5 / E; el dígito 0 no vale para ninguna entidad
      const r = validarCIF(`${org}28015860`)
      expect(r.ok, org).toBe(false)
      if (!r.ok) expect(r.codigo, org).toBe('control')
    }
    expect(validarCIF('A28015864')).toEqual({ ok: false, codigo: 'control', esperada: '5' })
    expect(validarCIF('N2801586A')).toEqual({ ok: false, codigo: 'control', esperada: 'E' })
  })

  it('con cualquier otro dígito distinto del correcto falla (los 9 restantes), con cada tipo de control', () => {
    for (const org of ['A', 'N', 'C']) {
      for (let d = 0; d <= 9; d++) {
        const valido = org === 'N' ? false : d === 5
        expect(validarCIF(`${org}2801586${d}`).ok, `${org}${d}`).toBe(valido)
      }
    }
  })

  it('con cualquier otra letra de J, A–I distinta de la correcta falla (las 9 restantes)', () => {
    for (const org of ['A', 'N', 'C']) {
      for (const l of 'JABCDEFGHI') {
        const valido = org === 'A' ? false : l === 'E'
        expect(validarCIF(`${org}2801586${l}`).ok, `${org}${l}`).toBe(valido)
      }
    }
  })
})

describe('validarCIF: formato', () => {
  it.each(['I', 'K', 'L', 'M', 'O', 'T', 'X', 'Y', 'Z', '1', '0'])('la letra de entidad %s no existe', (org) => {
    expect(validarCIF(`${org}28015865`)).toEqual({ ok: false, codigo: 'formato' })
  })

  it.each(['A2801586', 'A280158655', '', '   ', '1234567890', 'A28015K65', 'A2801586K', 'A2801586Z', 'AA28015865', 'A２８０１５８６５', '12345678Z', 'X1234567L'])(
    'rechaza %j con «formato»',
    (cif) => {
      expect(validarCIF(cif)).toEqual({ ok: false, codigo: 'formato' })
    },
  )

  it('no se rompe con entradas que no son texto', () => {
    for (const basura of [null, undefined, 28015865, {}, [], true]) {
      expect(validarCIF(basura as unknown as string)).toEqual({ ok: false, codigo: 'formato' })
    }
  })
})
