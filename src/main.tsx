import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Actualizaciones } from './pwa/Actualizaciones'
import './estilos.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Actualizaciones />
    <App />
  </StrictMode>,
)
