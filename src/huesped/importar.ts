import type { Reserva, Viajero } from '../domain/tipos'
import { descifrarFicha, PREFIJO_CODIGO, reservaDeCodigo } from './ficha'

export type ErrorImportar = 'formato' | 'no_encontrada' | 'sin_enlace' | 'no_descifra'
export type ResultadoImportar = { ok: true; reserva: Reserva; importadas: number } | { ok: false; error: ErrorImportar }

export const MENSAJE_IMPORTAR: Record<ErrorImportar, string> = {
  formato: 'Eso no es un código de ficha de esta aplicación (debe empezar por RV1.).',
  no_encontrada: 'Ese código es de una reserva que no está en este dispositivo.',
  sin_enlace: 'La reserva de ese código no tiene enlace creado en este dispositivo: no se puede descifrar.',
  no_descifra: 'No se ha podido descifrar el código (incompleto o de otro enlace). Pide al huésped que lo vuelva a enviar.',
}

/**
 * Importa el código cifrado del huésped en SU reserva, que se reconoce por el propio código (sin descifrar nada).
 * Las fichas con el mismo id se sustituyen (el huésped corrigió algo); las nuevas se añaden.
 */
export async function importarCodigo(reservas: Reserva[], texto: string, cuando: string): Promise<ResultadoImportar> {
  const codigo = texto.trim()
  let rid: string
  try {
    if (!codigo.startsWith(PREFIJO_CODIGO)) return { ok: false, error: 'formato' }
    rid = reservaDeCodigo(codigo)
  } catch {
    return { ok: false, error: 'formato' }
  }
  const r = reservas.find((x) => x.id === rid)
  if (!r) return { ok: false, error: 'no_encontrada' }
  if (!r.claveEnlace) return { ok: false, error: 'sin_enlace' }
  let nuevos: Viajero[]
  try {
    nuevos = await descifrarFicha(codigo, r.claveEnlace, r.id)
  } catch {
    return { ok: false, error: 'no_descifra' }
  }
  const porId = new Map<string, Viajero>(r.viajeros.map((v) => [v.id, v]))
  for (const v of nuevos) porId.set(v.id, v)
  return { ok: true, reserva: { ...r, viajeros: [...porId.values()], modificadaEn: cuando }, importadas: nuevos.length }
}
