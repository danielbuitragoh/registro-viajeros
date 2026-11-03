/** Tipo de documento reconocido por la librería. «DNI» incluye los NIF de persona física (K, L, M). */
export type TipoDocumento = 'DNI' | 'NIE' | 'CIF'

/** Idiomas de los mensajes de error. */
export type Idioma = 'es' | 'en'

/**
 * Motivo por el que un documento no es válido.
 * - `formato`: no tiene la forma de ese documento (longitud, letras o dígitos en sitios incorrectos).
 * - `letra`: DNI/NIE con la letra de control equivocada (`esperada` trae la correcta).
 * - `control`: CIF con el dígito o la letra de control equivocados (`esperada` trae el esperado).
 * - `parece_nie` / `parece_dni`: se ha validado como DNI algo que es un NIE, o al revés.
 */
export type CodigoError = 'formato' | 'letra' | 'control' | 'parece_nie' | 'parece_dni'

/** `control_no_verificado`: el formato es el de un NIF especial (K, L, M) y su control no se comprueba. */
export type Aviso = 'control_no_verificado'

export interface ResultadoValido {
  ok: true
  /** El documento en mayúsculas y sin espacios, guiones ni puntos. */
  normalizado: string
  aviso?: Aviso
}

export interface ResultadoInvalido {
  ok: false
  codigo: CodigoError
  /** Letra (o dígito, en el CIF) de control que debería llevar, cuando se ha podido calcular. */
  esperada?: string
}

export type Resultado = ResultadoValido | ResultadoInvalido
