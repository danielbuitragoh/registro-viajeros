/**
 * Tema de color: automático (según el sistema), claro u oscuro. La preferencia se recuerda en este navegador
 * (localStorage): no es un dato personal y no sale del dispositivo. Si el almacenamiento está bloqueado, se aplica solo
 * en esta visita.
 */
export const TEMAS = ['auto', 'claro', 'oscuro'] as const
export type Tema = (typeof TEMAS)[number]

const CLAVE = 'rv-tema'

export function leerTema(): Tema {
  try {
    const t = localStorage.getItem(CLAVE)
    return (TEMAS as readonly string[]).includes(t ?? '') ? (t as Tema) : 'auto'
  } catch {
    return 'auto'
  }
}

export function aplicarTema(t: Tema): void {
  const raiz = document.documentElement
  if (t === 'auto') delete raiz.dataset.theme
  else raiz.dataset.theme = t
  try {
    if (t === 'auto') localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, t)
  } catch {
    /* sin almacenamiento: el tema vale solo para esta visita */
  }
}
