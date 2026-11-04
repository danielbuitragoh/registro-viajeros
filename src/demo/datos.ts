/**
 * Datos 100 % FICTICIOS para la demo pública. Nombres inventados; documentos de la forma 0000000X (no emitidos en la
 * realidad) con letra de control correcta. Las fechas son relativas al momento de carga para que la lista del día,
 * el aviso de 24 h y el de purga se vean siempre en funcionamiento.
 */
import type { Establecimiento, Reserva, Viajero } from '../domain/tipos'
import { letraDni } from '@danielbuitragoh/documentos-es'

export const PASSWORD_DEMO = 'demo-hostal-2026'

const dni = (n: number) => {
  const cuerpo = String(n).padStart(8, '0')
  return `${cuerpo}${letraDni(cuerpo)}`
}

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const dia = (d: Date) => iso(d).slice(0, 10)
const mas = (base: Date, horas: number) => new Date(base.getTime() + horas * 3_600_000)

// Domicilio inventado (calle y número) en un municipio REAL: el código INE es el de la relación oficial del INE (28079 = Madrid)
const domicilioDemo = { direccion: 'Calle Inventada 12, 3ºB', codigoMunicipio: '28079', nombreMunicipio: 'Madrid', codigoPostal: '28001', pais: 'ESP' }

function adulto(id: string, nombre: string, ap1: string, ap2: string, n: number, extra: Partial<Viajero> = {}): Viajero {
  return {
    id,
    nombre,
    apellido1: ap1,
    apellido2: ap2,
    tipoDocumento: 'NIF',
    numeroDocumento: dni(n),
    soporteDocumento: `ZZZ${String(n).padStart(6, '0')}`,
    fechaNacimiento: '1986-03-14',
    nacionalidad: 'ESP',
    sexo: 'M',
    direccion: domicilioDemo,
    telefono: '+34 600 000 001',
    correo: `${nombre.toLowerCase()}@example.com`,
    origen: 'recepcion',
    ...extra,
  }
}

export function crearDatosDemo(ahora: Date): { establecimiento: Establecimiento; reservas: Reserva[] } {
  const ts = ahora.toISOString()
  const base = (id: string, ref: string, entrada: Date, noches: number, extra: Partial<Reserva>): Reserva => ({
    id,
    referencia: ref,
    fechaContrato: dia(mas(entrada, -24 * 10)),
    entrada: iso(entrada),
    salida: iso(mas(entrada, 24 * noches)),
    numPersonas: 1,
    habitacion: '101',
    canal: 'Directo',
    pago: { tipoPago: 'EFECT' },
    viajeros: [],
    creadaEn: ts,
    modificadaEn: ts,
    ...extra,
  })
  const hoyA = (h: number, m = 0) => {
    const d = new Date(ahora)
    d.setHours(h, m, 0, 0)
    return d
  }

  const reservas: Reserva[] = [
    base('demo-1', 'DEMO-0001', hoyA(14), 3, {
      habitacion: '101',
      numPersonas: 2,
      canal: 'Booking.com',
      pago: { tipoPago: 'PLATF' },
      viajeros: [adulto('d1a', 'Lucía', 'Prueba', 'Ejemplo', 1, { esTitular: true }), adulto('d1b', 'Mario', 'Ficticio', 'Demo', 2, { sexo: 'H' })],
    }),
    base('demo-2', 'DEMO-0002', hoyA(17, 30), 2, {
      habitacion: '204',
      numPersonas: 3,
      canal: 'Airbnb',
      pago: { tipoPago: 'TARJT' },
      viajeros: [adulto('d2a', 'Carmen', 'Imaginaria', 'Muestra', 3)],
    }),
    base('demo-3', 'DEMO-0003', hoyA(11), 4, {
      habitacion: '12',
      numPersonas: 1,
      viajeros: [
        {
          id: 'd3a',
          nombre: 'John',
          apellido1: 'Smith',
          tipoDocumento: 'PAS',
          numeroDocumento: '123456789',
          fechaNacimiento: '1979-09-30',
          nacionalidad: 'USA',
          sexo: 'H',
          direccion: { direccion: '1 Main Street', nombreMunicipio: 'Springfield', codigoPostal: '62701', pais: 'USA' },
          correo: 'john.smith@example.org',
          origen: 'huesped',
        },
      ],
    }),
    // sin exportar y casi vencida (entró hace 20 h → quedan 4 h)
    base('demo-4', 'DEMO-0004', mas(ahora, -20), 2, {
      habitacion: '305',
      numPersonas: 2,
      viajeros: [adulto('d4a', 'Elena', 'Supuesta', 'Falsa', 4), adulto('d4b', 'Pablo', 'Supuesto', 'Falso', 5, { sexo: 'H' })],
    }),
    // vencida: entró hace 2 días y no hay fichas
    base('demo-5', 'DEMO-0005', mas(ahora, -48), 3, { habitacion: '103', numPersonas: 2, canal: 'Teléfono' }),
    // exportada
    base('demo-6', 'DEMO-0006', mas(ahora, -72), 2, {
      habitacion: '202',
      numPersonas: 1,
      viajeros: [adulto('d6a', 'Raquel', 'Simulada', 'Ejemplo', 6)],
      exportadaEn: mas(ahora, -70).toISOString(),
      modificadaEn: mas(ahora, -71).toISOString(),
    }),
    // mañana: familia con menor
    base('demo-7', 'DEMO-0007', mas(hoyA(16), 24), 5, {
      habitacion: '210',
      numPersonas: 3,
      canal: 'Expedia',
      pago: { tipoPago: 'DESTI' },
      viajeros: [
        adulto('d7a', 'Sofía', 'Inventada', 'Prueba', 7, { esTitular: true }),
        adulto('d7b', 'Diego', 'Inventado', 'Prueba', 8, { sexo: 'H' }),
        {
          id: 'd7c',
          nombre: 'Mateo',
          apellido1: 'Inventado',
          apellido2: 'Prueba',
          fechaNacimiento: '2016-07-20',
          nacionalidad: 'ESP',
          sexo: 'H',
          direccion: domicilioDemo,
          telefono: '+34 600 000 001',
          responsable: { adultoId: 'd7a', parentesco: 'PM' },
          origen: 'huesped',
        },
      ],
    }),
    // salió hace casi 3 años → aviso de purga
    base('demo-8', 'DEMO-ANTIGUA', mas(ahora, -24 * 365 * 3 + 24 * 8 - 48), 2, {
      habitacion: '110',
      numPersonas: 1,
      viajeros: [adulto('d8a', 'Hugo', 'Antiguo', 'Ejemplo', 9, { fechaNacimiento: '1975-01-05' })],
      exportadaEn: mas(ahora, -24 * 365 * 3 + 24 * 8 - 40).toISOString(),
      modificadaEn: mas(ahora, -24 * 365 * 3 + 24 * 8 - 45).toISOString(),
    }),
  ]

  return {
    establecimiento: {
      codigoEstablecimiento: '0000000000',
      codigoArrendador: 'DEMO-ARR',
      nombre: 'Hostal Demo (ficticio)',
      tipo: 'HOSTAL',
      direccion: { direccion: 'Calle Inventada 7', codigoMunicipio: '41091', nombreMunicipio: 'Sevilla', codigoPostal: '41001', pais: 'ESP' },
    },
    reservas,
  }
}
