/** PENDIENTE-OFICIAL (P9): el documento solo da longitudes (teléfono 20, correo 50) y exige "formato válido" de correo. */

export type ResultadoContacto = { ok: true; normalizado: string } | { ok: false }

export function validarTelefono(entrada: string): ResultadoContacto {
  const limpio = entrada.trim().replace(/[\s().-]/g, '')
  if (!/^\+?\d+$/.test(limpio)) return { ok: false }
  const digitos = limpio.replace('+', '').length
  if (digitos < 6 || digitos > 15 || limpio.length > 20) return { ok: false }
  return { ok: true, normalizado: limpio }
}

export function validarCorreo(entrada: string): ResultadoContacto {
  const v = entrada.trim()
  if (v.length > 50) return { ok: false }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return { ok: false }
  return { ok: true, normalizado: v }
}
