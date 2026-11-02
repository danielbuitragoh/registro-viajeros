import { describe, expect, it } from 'vitest'
import { validarViajero } from '../../src/validators/viajero'
import type { Incidencia } from '../../src/domain/tipos'
import { adulto, extranjero, menor } from '../fixtures'

const ctx = { fechaEntrada: '2026-11-02', modo: 'parte' as const, adultosIds: ['v1'] }
const claves = (is: Incidencia[], g?: 'error' | 'aviso') =>
  is.filter((i) => !g || i.gravedad === g).map((i) => `${i.campo}:${i.codigo}`)

describe('validarViajero — parte de viajeros (§3)', () => {
  it('adulto español completo: sin incidencias', () => {
    expect(validarViajero(adulto(), ctx)).toEqual([])
  })

  it('extranjero con pasaporte, sin segundo apellido ni soporte: válido', () => {
    expect(validarViajero(extranjero(), ctx)).toEqual([])
  })

  it('menor sin documento pero con responsable: válido', () => {
    expect(validarViajero(menor(), ctx)).toEqual([])
  })

  describe('campos obligatorios', () => {
    it('nombre, primer apellido y fecha de nacimiento', () => {
      const r = claves(validarViajero(adulto({ nombre: '', apellido1: ' ', fechaNacimiento: '' }), ctx))
      expect(r).toEqual(expect.arrayContaining(['nombre:requerido', 'apellido1:requerido', 'fechaNacimiento:requerido']))
    })

    it('límite de 50 caracteres en nombre y apellidos', () => {
      const largo = 'a'.repeat(51)
      const r = claves(validarViajero(adulto({ nombre: largo, apellido1: largo, apellido2: largo }), ctx))
      expect(r).toEqual(expect.arrayContaining(['nombre:longitud_max', 'apellido1:longitud_max', 'apellido2:longitud_max']))
    })

    it('segundo apellido obligatorio si el documento es NIF', () => {
      const r = claves(validarViajero(adulto({ apellido2: '' }), ctx))
      expect(r).toContain('apellido2:apellido2_requerido_nif')
    })

    it('segundo apellido NO obligatorio con pasaporte', () => {
      expect(claves(validarViajero(extranjero({ apellido2: undefined }), ctx))).not.toContain('apellido2:apellido2_requerido_nif')
    })

    it('mayor de edad: tipo y número de documento obligatorios', () => {
      const r = claves(validarViajero(adulto({ tipoDocumento: undefined, numeroDocumento: undefined }), ctx))
      expect(r).toEqual(expect.arrayContaining(['tipoDocumento:requerido', 'numeroDocumento:requerido']))
    })

    it('menor: documento opcional; si lo informa se valida igualmente', () => {
      expect(claves(validarViajero(menor({ tipoDocumento: undefined, numeroDocumento: undefined }), ctx))).toEqual([])
      const r = claves(validarViajero(menor({ tipoDocumento: 'NIF', numeroDocumento: '12345678A', soporteDocumento: 'ABC123456' }), ctx))
      expect(r).toContain('numeroDocumento:doc_letra')
    })

    it('número de documento sin tipo → pide el tipo', () => {
      const r = claves(validarViajero(menor({ tipoDocumento: undefined, numeroDocumento: '12345678Z' }), ctx))
      expect(r).toContain('tipoDocumento:requerido')
    })

    it('soporte obligatorio con NIF o NIE', () => {
      expect(claves(validarViajero(adulto({ soporteDocumento: '' }), ctx))).toContain('soporteDocumento:requerido')
      const nie = adulto({ tipoDocumento: 'NIE', numeroDocumento: 'X1234567L', soporteDocumento: undefined })
      expect(claves(validarViajero(nie, ctx))).toContain('soporteDocumento:requerido')
    })

    it('soporte: alfanumérico, máx. 9 caracteres', () => {
      expect(claves(validarViajero(adulto({ soporteDocumento: 'ABC1234567' }), ctx))).toContain('soporteDocumento:soporte_formato')
      expect(claves(validarViajero(adulto({ soporteDocumento: 'AB*123' }), ctx))).toContain('soporteDocumento:soporte_formato')
      expect(claves(validarViajero(adulto({ soporteDocumento: 'abc123456' }), ctx))).toEqual([])
    })
  })

  describe('documento según tipo', () => {
    it('DNI con letra incorrecta → indica la letra esperada', () => {
      const r = validarViajero(adulto({ numeroDocumento: '12345678A' }), ctx)
      const i = r.find((x) => x.codigo === 'doc_letra')
      expect(i).toMatchObject({ campo: 'numeroDocumento', gravedad: 'error', params: { esperada: 'Z' } })
    })

    it('NIE correcto y con letra incorrecta', () => {
      const ok = adulto({ tipoDocumento: 'NIE', numeroDocumento: 'X1234567L' })
      const mal = adulto({ tipoDocumento: 'NIE', numeroDocumento: 'X1234567A' })
      expect(claves(validarViajero(ok, ctx))).toEqual([])
      expect(claves(validarViajero(mal, ctx))).toContain('numeroDocumento:doc_letra')
    })

    it('NIE puesto con tipo NIF → mensaje específico', () => {
      expect(claves(validarViajero(adulto({ numeroDocumento: 'X1234567L' }), ctx))).toContain('numeroDocumento:doc_parece_nie')
    })

    it('pasaporte con caracteres raros → error; formato inusual para su país → solo aviso', () => {
      expect(claves(validarViajero(extranjero({ numeroDocumento: 'AB*123456' }), ctx), 'error')).toContain(
        'numeroDocumento:pasaporte_caracteres',
      )
      const r = validarViajero(extranjero({ nacionalidad: 'GBR', numeroDocumento: 'AB1234567' }), ctx)
      expect(r.filter((i) => i.gravedad === 'error')).toEqual([])
      expect(claves(r, 'aviso')).toContain('numeroDocumento:pasaporte_formato_pais')
    })

    it('tipo "OTRO": admite cualquier número no vacío de hasta 15 caracteres', () => {
      expect(claves(validarViajero(extranjero({ tipoDocumento: 'OTRO', numeroDocumento: 'X-99/ABC' }), ctx))).toEqual([])
      expect(claves(validarViajero(extranjero({ tipoDocumento: 'OTRO', numeroDocumento: 'x'.repeat(16) }), ctx))).toContain(
        'numeroDocumento:longitud_max',
      )
    })

    it('códigos inventados se rechazan', () => {
      const r = claves(
        validarViajero(adulto({ tipoDocumento: 'DNI' as never, sexo: 'X' as never, nacionalidad: 'ZZZ' }), ctx),
      )
      expect(r).toEqual(expect.arrayContaining(['tipoDocumento:codigo_invalido', 'sexo:codigo_invalido', 'nacionalidad:pais_invalido']))
    })
  })

  describe('fechas y edad', () => {
    it('fecha de nacimiento inexistente, futura o de hace más de 120 años', () => {
      expect(claves(validarViajero(adulto({ fechaNacimiento: '1990-02-30' }), ctx))).toContain('fechaNacimiento:fecha_invalida')
      expect(claves(validarViajero(adulto({ fechaNacimiento: '2027-01-01' }), ctx))).toContain('fechaNacimiento:fecha_futura')
      expect(claves(validarViajero(adulto({ fechaNacimiento: '1890-01-01' }), ctx))).toContain('fechaNacimiento:fecha_muy_antigua')
    })

    it('la mayoría de edad se calcula a la fecha de entrada', () => {
      // 18 años justo el día de entrada → adulto → exige documento
      const justo = menor({ fechaNacimiento: '2008-11-02', responsable: undefined })
      expect(claves(validarViajero(justo, ctx))).toContain('numeroDocumento:requerido')
      // un día antes de cumplir 18 → menor → exige responsable
      const casi = menor({ fechaNacimiento: '2008-11-03', responsable: undefined })
      expect(claves(validarViajero(casi, ctx))).toContain('responsable:responsable_requerido')
    })
  })

  describe('menores y parentesco', () => {
    it('un menor exige adulto responsable y parentesco', () => {
      expect(claves(validarViajero(menor({ responsable: undefined }), ctx))).toContain('responsable:responsable_requerido')
    })

    it('el responsable debe ser un adulto de la misma reserva', () => {
      const r = validarViajero(menor({ responsable: { adultoId: 'otro', parentesco: 'HJ' } }), ctx)
      expect(claves(r)).toContain('responsable:responsable_invalido')
    })

    it('el parentesco debe ser un código de la tabla 8.3', () => {
      const r = validarViajero(menor({ responsable: { adultoId: 'v1', parentesco: 'XX' as never } }), ctx)
      expect(claves(r)).toContain('responsable.parentesco:codigo_invalido')
    })
  })

  describe('contacto', () => {
    it('exige al menos uno de teléfono, teléfono2 o correo', () => {
      const r = claves(validarViajero(adulto({ telefono: undefined, telefono2: undefined, correo: undefined }), ctx))
      expect(r).toContain('telefono:contacto_requerido')
    })

    it('basta con el segundo teléfono', () => {
      expect(claves(validarViajero(adulto({ telefono: undefined, correo: undefined, telefono2: '600111222' }), ctx))).toEqual([])
    })

    it('formato de teléfono y correo', () => {
      const r = claves(validarViajero(adulto({ telefono: 'abc', telefono2: '12', correo: 'sin-arroba' }), ctx))
      expect(r).toEqual(expect.arrayContaining(['telefono:telefono_formato', 'telefono2:telefono_formato', 'correo:correo_formato']))
    })
  })

  describe('dirección', () => {
    it('es obligatoria y sus errores se anidan en "direccion."', () => {
      const r = claves(validarViajero(adulto({ direccion: { direccion: '', codigoPostal: '', pais: '' } }), ctx))
      expect(r).toEqual(expect.arrayContaining(['direccion.direccion:requerido', 'direccion.codigoPostal:requerido', 'direccion.pais:requerido']))
    })

    it('residente en España sin código INE de municipio', () => {
      const d = { direccion: 'Calle 1', codigoPostal: '28001', pais: 'ESP' }
      expect(claves(validarViajero(adulto({ direccion: d }), ctx))).toContain('direccion.codigoMunicipio:requerido')
    })
  })
})

describe('validarViajero — reserva de hospedaje (§4): casi todo opcional', () => {
  const ctxR = { fechaEntrada: '2026-11-02', modo: 'reserva' as const, adultosIds: ['v1'] }

  it('solo nombre, primer apellido y un contacto bastan', () => {
    const v = { id: 'v9', nombre: 'Ana', apellido1: 'Pérez', fechaNacimiento: '', direccion: { direccion: '', codigoPostal: '', pais: '' }, correo: 'ana@example.com' }
    expect(validarViajero(v, ctxR)).toEqual([])
  })

  it('sigue exigiendo nombre, apellido1 y contacto', () => {
    const v = { id: 'v9', nombre: '', apellido1: '', fechaNacimiento: '', direccion: { direccion: '', codigoPostal: '', pais: '' } }
    expect(claves(validarViajero(v, ctxR))).toEqual(
      expect.arrayContaining(['nombre:requerido', 'apellido1:requerido', 'telefono:contacto_requerido']),
    )
  })

  it('si informa el documento, debe ser válido', () => {
    const v = adulto({ numeroDocumento: '12345678A' })
    expect(claves(validarViajero(v, ctxR))).toContain('numeroDocumento:doc_letra')
  })

  it('si informa la dirección, debe estar completa', () => {
    const v = adulto({ direccion: { direccion: 'Calle 1', codigoPostal: '', pais: 'FRA', nombreMunicipio: 'Paris' } })
    expect(claves(validarViajero(v, ctxR))).toContain('direccion.codigoPostal:requerido')
  })

  it('no exige parentesco del menor ni segundo apellido ni soporte', () => {
    const v = menor({ responsable: undefined, apellido2: undefined })
    expect(claves(validarViajero(v, ctxR))).toEqual([])
  })
})
