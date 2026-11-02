/** Formatea horas (puede ser fraccionaria) como "18 h 30 min". */
export function formatoHoras(horas: number): string {
  const total = Math.round(Math.abs(horas) * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function fechaHoraCorta(s: string, idioma: 'es' | 'en' = 'es'): string {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat(idioma, { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

export function fechaCorta(s: string, idioma: 'es' | 'en' = 'es'): string {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat(idioma, { dateStyle: 'medium' }).format(d)
}

export function nuevoId(): string {
  return crypto.randomUUID()
}
