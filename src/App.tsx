import { AppProvider, useApp } from './app/AppContext'
import { useRuta } from './app/ruta'
import { decodificarEnlace } from './huesped/enlace'
import { crearDatosDemo, PASSWORD_DEMO } from './demo/datos'
import { Acceso } from './ui/Acceso'
import { EnlaceInvalido, Huesped } from './ui/Huesped'
import { Recepcion } from './ui/Recepcion'

const esDemo = import.meta.env.VITE_DEMO === 'true'

export function Puerta() {
  const app = useApp()
  if (app.fase === 'cargando') return <p role="status" className="pagina-acceso">Cargando…</p>
  if (app.fase === 'error') return <p role="alert" className="pagina-acceso">No se puede usar el almacenamiento local de este navegador: {app.error}</p>
  if (app.fase === 'listo') return <Recepcion />
  const crear = app.fase === 'sin_almacen'
  return (
    <>
      <Acceso
        key={app.fase}
        modo={crear ? 'crear' : 'abrir'}
        onCrear={app.crear}
        onAbrir={app.desbloquear}
        pistaDemo={esDemo ? `Esto es una demo con datos ficticios. Contraseña: ${PASSWORD_DEMO}` : undefined}
      />
      {esDemo && crear && (
        <div className="pagina-acceso">
          <button
            type="button"
            className="secundario"
            onClick={async () => {
              await app.crear(PASSWORD_DEMO)
              const d = crearDatosDemo(app.ahora())
              await app.guardarEstablecimiento(d.establecimiento)
              for (const r of d.reservas) await app.guardarReserva(r)
            }}
          >
            Entrar a la demo con datos ficticios
          </button>
        </div>
      )}
    </>
  )
}

export function App() {
  const { ruta } = useRuta()
  // El modo huésped NO usa el almacén ni pide contraseña: todo ocurre en el móvil del huésped.
  if (ruta.startsWith('/huesped/')) {
    const datos = decodificarEnlace(`#${ruta}`)
    return datos ? <Huesped datos={datos} /> : <EnlaceInvalido />
  }
  return (
    <AppProvider>
      <Puerta />
    </AppProvider>
  )
}
