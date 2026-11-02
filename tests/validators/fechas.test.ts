import { describe, expect, it } from 'vitest'
import {
  aFechaHoraOficial,
  edadEn,
  esFechaHoraValida,
  esFechaValida,
  esMayorDeEdad,
  sumarAnios,
} from '../../src/validators/fechas'

describe('esFechaValida (AAAA-MM-DD)', () => {
  it.each(['2024-12-02', '2024-02-29', '1999-12-31'])('acepta %s', (f) => expect(esFechaValida(f)).toBe(true))
  it.each(['2023-02-29', '2024-13-01', '2024-00-10', '2024-04-31', '02/12/2024', '2024-1-1', '', '2024-12-02T10:00'])(
    'rechaza %j',
    (f) => expect(esFechaValida(f)).toBe(false),
  )
})

describe('esFechaHoraValida (AAAA-MM-DDThh:mm[:ss])', () => {
  it.each(['2024-12-02T10:30', '2024-12-02T00:00:00', '2024-12-02T23:59:59'])('acepta %s', (f) =>
    expect(esFechaHoraValida(f)).toBe(true),
  )
  it.each(['2024-12-02', '2024-12-02T24:00', '2024-12-02T10:60', '2024-12-02 10:30', '2024-02-30T10:00', ''])(
    'rechaza %j',
    (f) => expect(esFechaHoraValida(f)).toBe(false),
  )
})

describe('aFechaHoraOficial', () => {
  it('completa los segundos para cumplir AAAA-MM-DDThh:mm:ss', () => {
    expect(aFechaHoraOficial('2024-12-02T10:30')).toBe('2024-12-02T10:30:00')
    expect(aFechaHoraOficial('2024-12-02T10:30:15')).toBe('2024-12-02T10:30:15')
  })
})

describe('edadEn', () => {
  it('cumple años justo ese día', () => {
    expect(edadEn('2000-06-15', '2024-06-14')).toBe(23)
    expect(edadEn('2000-06-15', '2024-06-15')).toBe(24)
  })
  it('un día antes de los 18 sigue siendo menor; el día de los 18 es mayor', () => {
    expect(esMayorDeEdad('2006-12-03', '2024-12-02')).toBe(false)
    expect(esMayorDeEdad('2006-12-02', '2024-12-02')).toBe(true)
  })
  it('nacido el 29 de febrero: en año no bisiesto cumple el 1 de marzo', () => {
    expect(edadEn('2004-02-29', '2023-02-28')).toBe(18)
    expect(edadEn('2004-02-29', '2023-03-01')).toBe(19)
  })
  it('bebé de pocos meses = 0', () => {
    expect(edadEn('2024-09-01', '2024-12-02')).toBe(0)
  })
})

describe('sumarAnios (plazo de conservación de 3 años)', () => {
  it('suma años de calendario', () => {
    expect(sumarAnios('2024-12-02', 3)).toBe('2027-12-02')
  })
  it('29 de febrero → 1 de marzo si el año destino no es bisiesto (nunca purgar antes de tiempo)', () => {
    expect(sumarAnios('2024-02-29', 3)).toBe('2027-03-01')
    expect(sumarAnios('2024-02-29', 4)).toBe('2028-02-29')
  })
})
