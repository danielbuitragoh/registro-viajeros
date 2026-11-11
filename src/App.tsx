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
      {/* En la demo, la entrada va ARRIBA: quien llega desde el portafolio no debería tener que bajar dos
          pantallas, ni creer que hay que crear una contraseña, para ver la app funcionando. */}
      {esDemo && crear && (
        // Una sección con nombre es una región: el texto no queda fuera de los puntos de referencia de la página.
        <section className="pagina-acceso entrada-demo" aria-label="Entrada a la demo">
          <div className="tarjeta tarjeta-info">
            <p>
              <strong>Esto es una demo.</strong> Puedes entrar ya, con datos ficticios, sin crear ninguna contraseña.
            </p>
            <button
              type="button"
              className="primario"
              // Todo se guarda antes de mostrar la recepción (ver AppProvider.crear)
              onClick={() => app.crear(PASSWORD_DEMO, crearDatosDemo(app.ahora()))}
            >
              Entrar a la demo con datos ficticios
            </button>
          </div>
        </section>
      )}
      <Acceso
        key={app.fase}
        modo={crear ? 'crear' : 'abrir'}
        onCrear={app.crear}
        onAbrir={app.desbloquear}
        pistaDemo={esDemo ? `Esto es una demo con datos ficticios. Contraseña: ${PASSWORD_DEMO}` : undefined}
      />
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
