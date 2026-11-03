/**
 * Iconos propios (SVG en línea, trazo de 2 px, heredan el color del texto). Siempre acompañan a un texto visible:
 * por eso son decorativos (aria-hidden) y nunca llevan su propio nombre accesible.
 */
const TRAZOS = {
  hoy: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3v3H8z',
  reservas: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  exportar: 'M14 3H6v18h12V7zM14 3v4h4M12 17v-6M9 14l3-3 3 3',
  ajustes: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  ayuda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  candado: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2h-2',
  mas: 'M12 5v14M5 12h14',
  hecho: 'M5 12.5l4.5 4.5L19 7.5',
  aviso: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  enlace: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  copia: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4',
  atras: 'M15 5l-7 7 7 7',
  adelante: 'M9 5l7 7-7 7',
  tema: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  papelera: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  documento: 'M3 6h18v12H3zM7 10h4M7 14h6M15 10h2v4h-2z',
  inicio: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  bandera: 'M5 21V4M5 4h11l-2 4 2 4H5',
} as const

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, className }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg className={`icono${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}

/** Logotipo de la app (mismo dibujo que public/icon.svg, en pequeño). */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="12" fill="var(--primario)" />
      <path d="M14 46V26l18-12 18 12v20z" fill="none" stroke="var(--sobre-primario)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M26 46V34h12v12" fill="none" stroke="var(--sobre-primario)" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  )
}
