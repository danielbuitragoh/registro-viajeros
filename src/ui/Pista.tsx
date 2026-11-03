import { useState, type ReactNode } from 'react'
import { Icono } from './Icono'

/**
 * Ayuda contextual «¿Qué es…?» junto a un campo. Desplegable nativo (<details>): accesible por teclado y lector de
 * pantalla, cerrado por defecto para no alargar el formulario. El contenido solo se pinta al abrirlo (ligero, y sus
 * ilustraciones no se confunden con los campos del formulario).
 */
export function Pista({ titulo, children, lang }: { titulo: string; children: ReactNode; lang?: string }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <details className="pista" lang={lang} onToggle={(e) => setAbierta(e.currentTarget.open)}>
      <summary>
        <Icono nombre="ayuda" />
        {titulo}
      </summary>
      <div className="pista-contenido">{abierta ? children : null}</div>
    </details>
  )
}
