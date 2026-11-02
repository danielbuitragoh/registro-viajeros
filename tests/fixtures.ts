import type { Establecimiento, Reserva, Viajero } from '../src/domain/tipos'

/** Datos 100 % ficticios (nombres inventados, DNI de ejemplo con letra de control correcta). */
export function adulto(extra: Partial<Viajero> = {}): Viajero {
  return {
    id: 'v1',
    nombre: 'Lucía',
    apellido1: 'Prueba',
    apellido2: 'Ejemplo',
    tipoDocumento: 'NIF',
    numeroDocumento: '12345678Z',
    soporteDocumento: 'ABC123456',
    fechaNacimiento: '1985-04-12',
    nacionalidad: 'ESP',
    sexo: 'M',
    direccion: { direccion: 'Calle Falsa 123', codigoMunicipio: '28079', codigoPostal: '28001', pais: 'ESP' },
    telefono: '+34 600 123 456',
    correo: 'lucia@example.com',
    ...extra,
  }
}

export function extranjero(extra: Partial<Viajero> = {}): Viajero {
  return {
    id: 'v2',
    nombre: 'John',
    apellido1: 'Smith',
    tipoDocumento: 'PAS',
    numeroDocumento: '123456789',
    fechaNacimiento: '1979-09-30',
    nacionalidad: 'USA',
    sexo: 'H',
    direccion: { direccion: '1 Main Street', nombreMunicipio: 'Springfield', codigoPostal: '62701', pais: 'USA' },
    correo: 'john@example.org',
    ...extra,
  }
}

export function menor(extra: Partial<Viajero> = {}): Viajero {
  return {
    id: 'v3',
    nombre: 'Mateo',
    apellido1: 'Prueba',
    apellido2: 'Ejemplo',
    fechaNacimiento: '2016-07-20',
    nacionalidad: 'ESP',
    direccion: { direccion: 'Calle Falsa 123', codigoMunicipio: '28079', codigoPostal: '28001', pais: 'ESP' },
    telefono: '+34 600 123 456',
    responsable: { adultoId: 'v1', parentesco: 'HJ' },
    ...extra,
  }
}

export function reserva(extra: Partial<Reserva> = {}): Reserva {
  return {
    id: 'r1',
    referencia: 'RES-2026-0001',
    fechaContrato: '2026-10-20',
    entrada: '2026-11-02T15:00',
    salida: '2026-11-05T11:00',
    numPersonas: 1,
    habitacion: '101',
    canal: 'directo',
    pago: { tipoPago: 'EFECT' },
    viajeros: [adulto()],
    creadaEn: '2026-10-20T10:00:00.000Z',
    modificadaEn: '2026-10-20T10:00:00.000Z',
    ...extra,
  }
}

export function establecimiento(extra: Partial<Establecimiento> = {}): Establecimiento {
  return {
    codigoEstablecimiento: '0000012345',
    nombre: 'Hostal Demo',
    tipo: 'HOSTAL',
    direccion: { direccion: 'Calle Inventada 7', codigoMunicipio: '28079', codigoPostal: '28004', pais: 'ESP' },
    ...extra,
  }
}
