/**
 * Esquema declarativo del fichero, transcrito de las tablas y figuras de docs/oficial/Instrucciones.pdf (v1.1.0).
 * Es deliberadamente independiente de `construir.ts`: `validarXml` comprueba el XML ya generado contra este esquema.
 * `n` nombre · `req` obligatorio · `rep` se repite (1..n) · el orden del array es el orden de la figura.
 */
import { PARENTESCO, ROL_PERSONA, SEXO, TIPO_DOCUMENTO, TIPO_ESTABLECIMIENTO, TIPO_PAGO } from '../oficial/codigos'

export type Regla =
  | { k: 'str'; max: number }
  | { k: 'fecha' }
  | { k: 'fechaHora' }
  | { k: 'entero' }
  | { k: 'pais' }
  | { k: 'ine' }
  | { k: 'caducidad' }
  | { k: 'codigo'; tabla: Record<string, unknown>; max: number }

export interface Def {
  n: string
  req: boolean
  rep?: boolean
  regla?: Regla
  hijos?: Def[]
  /** Los hijos son alternativas (exactamente una). */
  eleccion?: boolean
}

const str = (n: string, max: number, req = false): Def => ({ n, req, regla: { k: 'str', max } })
const cod = (n: string, tabla: Record<string, unknown>, max: number, req = false): Def => ({ n, req, regla: { k: 'codigo', tabla, max } })

/** §7.1 */
const direccion = (req: boolean): Def => ({
  n: 'direccion',
  req,
  hijos: [
    str('direccion', 100, true),
    str('direccionComplementaria', 100),
    { n: 'codigoMunicipio', req: false, regla: { k: 'ine' } },
    str('nombreMunicipio', 100),
    str('codigoPostal', 20, true),
    { n: 'pais', req: true, regla: { k: 'pais' } },
  ],
})

/** §7.2 */
const pago: Def = {
  n: 'pago',
  req: true,
  hijos: [
    cod('tipoPago', TIPO_PAGO, 5, true),
    { n: 'fechaPago', req: false, regla: { k: 'fecha' } },
    str('medioPago', 50),
    str('titular', 100),
    { n: 'caducidadTarjeta', req: false, regla: { k: 'caducidad' } },
  ],
}

/** §3 y §4: contrato. `internet` (opcional) no figura aquí a propósito: ver PENDIENTE-OFICIAL P3. */
const contrato: Def = {
  n: 'contrato',
  req: true,
  hijos: [
    str('referencia', 50, true),
    { n: 'fechaContrato', req: true, regla: { k: 'fecha' } },
    { n: 'fechaEntrada', req: true, regla: { k: 'fechaHora' } },
    { n: 'fechaSalida', req: true, regla: { k: 'fechaHora' } },
    { n: 'numPersonas', req: true, regla: { k: 'entero' } },
    { n: 'numHabitaciones', req: false, regla: { k: 'entero' } },
    pago,
  ],
}

/** §3 figura 1 */
const personaParte: Def = {
  n: 'persona',
  req: true,
  rep: true,
  hijos: [
    cod('rol', ROL_PERSONA, 2, true),
    str('nombre', 50, true),
    str('apellido1', 50, true),
    str('apellido2', 50),
    cod('tipoDocumento', TIPO_DOCUMENTO, 5),
    str('numeroDocumento', 15),
    str('soporteDocumento', 9),
    { n: 'fechaNacimiento', req: true, regla: { k: 'fecha' } },
    { n: 'nacionalidad', req: false, regla: { k: 'pais' } },
    cod('sexo', SEXO, 1),
    direccion(true),
    str('telefono', 20),
    str('telefono2', 20),
    str('correo', 50),
    cod('parentesco', PARENTESCO, 5),
  ],
}

/** §4 figura 2 */
const personaReserva: Def = {
  n: 'persona',
  req: true,
  rep: true,
  hijos: [
    cod('rol', ROL_PERSONA, 2, true),
    str('nombre', 50, true),
    str('apellido1', 50, true),
    str('apellido2', 50),
    cod('tipoDocumento', TIPO_DOCUMENTO, 5),
    str('numeroDocumento', 15),
    { n: 'fechaNacimiento', req: false, regla: { k: 'fecha' } },
    { n: 'nacionalidad', req: false, regla: { k: 'pais' } },
    cod('sexo', SEXO, 1),
    direccion(false),
    str('telefono', 20),
    str('telefono2', 20),
    str('correo', 50),
  ],
}

const establecimiento: Def = {
  n: 'establecimiento',
  req: true,
  eleccion: true,
  hijos: [
    str('codigo', 10),
    {
      n: 'datosEstablecimiento',
      req: false,
      hijos: [cod('tipo', TIPO_ESTABLECIMIENTO, 10, true), str('nombre', 50, true), direccion(true)],
    },
  ],
}

export const ESQUEMA_PARTES: Def = {
  n: 'peticion',
  req: true,
  hijos: [
    {
      n: 'solicitud',
      req: true,
      hijos: [str('codigoEstablecimiento', 10, true), { n: 'comunicacion', req: true, rep: true, hijos: [contrato, personaParte] }],
    },
  ],
}

export const ESQUEMA_RESERVAS: Def = {
  n: 'peticion',
  req: true,
  hijos: [
    {
      n: 'solicitud',
      req: true,
      hijos: [{ n: 'comunicacion', req: true, rep: true, hijos: [establecimiento, contrato, personaReserva] }],
    },
  ],
}
