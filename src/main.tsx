import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Actualizaciones } from './pwa/Actualizaciones'
import './estilos.css'
import { aplicarTema, leerTema } from './diseno/tema'

// Tema elegido en Ajustes → Apariencia (o el del sistema), antes de pintar nada
aplicarTema(leerTema())

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Actualizaciones />
    <App />
  </StrictMode>,
)
