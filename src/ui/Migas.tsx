export interface Miga {
  texto: string
  /** Ruta (#/…). La última miga (página actual) no lleva ruta. */
  ruta?: string
}

/** Migas de pan: dónde estoy y cómo vuelvo (WCAG 2.4.8). La página actual va marcada con aria-current. */
export function Migas({ items }: { items: Miga[] }) {
  return (
    <nav aria-label="Migas de pan" className="migas">
      <ol>
        {items.map((m, i) =>
          m.ruta && i < items.length - 1 ? (
            <li key={m.texto}>
              <a href={`#${m.ruta}`}>{m.texto}</a>
            </li>
          ) : (
            <li key={m.texto}>
              <span aria-current="page">{m.texto}</span>
            </li>
          ),
        )}
      </ol>
    </nav>
  )
}
