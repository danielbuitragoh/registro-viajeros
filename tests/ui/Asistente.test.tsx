import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { AppProvider } from '../../src/app/AppContext'
import { Puerta } from '../../src/App'

const PASS = 'clave-del-hostal'
let bd = ''
beforeEach(() => {
  bd = `asis-${Math.random().toString(36).slice(2)}`
  window.location.hash = ''
  URL.createObjectURL = vi.fn(() => 'blob:fake')
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})

const montar = () =>
  render(
    <AppProvider nombreBd={bd} iteraciones={1000} ahora={() => new Date('2026-11-02T10:00:00')}>
      <Puerta />
    </AppProvider>,
  )

/** Pasos del indicador de progreso, con su estado tal como lo oye un lector de pantalla. */
const progreso = () =>
  within(screen.getByRole('list', { name: 'Progreso de los primeros pasos' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent?.replace(/\s+/g, ' ').trim())

async function crearContraseña(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Contraseña'), PASS)
  await user.type(screen.getByLabelText('Repite la contraseña'), PASS)
  await user.click(screen.getByLabelText(/no se pueden recuperar/))
  await user.click(screen.getByRole('button', { name: 'Crear y seguir' }))
}

describe('asistente de primeros pasos', () => {
  it('paso 1 (contraseña): forma parte del asistente y explica qué significa perderla', async () => {
    montar()
    expect(await screen.findByText('Paso 1 de 6')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Crea la contraseña del establecimiento' })).toBeInTheDocument()
    const perder = screen.getByRole('heading', { name: '¿Qué pasa si la pierdo?' }).closest('section') as HTMLElement
    expect(within(perder).getByText(/Nadie puede recuperarla/)).toBeInTheDocument()
    expect(within(perder).getByText(/copia de seguridad/)).toBeInTheDocument()
    expect(progreso()[0]).toMatch(/Contraseña.*paso actual/)
  })

  it(
    'recorrido completo: establecimiento → reserva de prueba → enlace → primer fichero → copia → terminar (borra la prueba)',
    async () => {
      const user = userEvent.setup()
      montar()
      await crearContraseña(user)

      // Paso 2: establecimiento, con la explicación del código y qué hacer si aún no se tiene
      expect(await screen.findByRole('heading', { level: 2, name: 'Datos del establecimiento' })).toBeInTheDocument()
      expect(screen.getByText('Paso 2 de 6')).toBeInTheDocument()
      expect(progreso()[0]).toMatch(/Contraseña.*hecho/)
      expect(screen.getByText('¿De dónde sale este código? ¿Y si aún no lo tengo?')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Atrás/ })).not.toBeInTheDocument()
      await user.type(screen.getByLabelText(/^Nombre del establecimiento/), 'Pensión Carmen')
      await user.type(screen.getByLabelText(/^Código de establecimiento/), '0000012345')
      await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }))

      // Paso 3: reserva de prueba (formulario ya relleno para practicar)
      expect(await screen.findByRole('heading', { level: 2, name: 'Reserva de prueba' })).toBeInTheDocument()
      expect(screen.getByLabelText(/^Referencia de la reserva/)).toHaveValue('PRUEBA-1')
      await user.click(screen.getByRole('button', { name: 'Guardar reserva' }))

      // Paso 4: enlace para el huésped (o un viajero de ejemplo para seguir sin móvil)
      expect(await screen.findByRole('heading', { level: 2, name: 'Enviar el enlace a un huésped' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Crear enlace para el huésped' }))
      expect(((await screen.findByLabelText('Enlace para el huésped')) as HTMLTextAreaElement).value).toContain('#/huesped/')
      await user.click(screen.getByRole('button', { name: 'Añadir un viajero de ejemplo (ficticio)' }))
      expect(await screen.findByText(/Ana Ejemplo/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /Siguiente/ }))

      // Paso 5: primer fichero (de prueba: no se sube)
      expect(await screen.findByRole('heading', { level: 2, name: 'Generar el primer fichero' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Generar el fichero de prueba' }))
      expect(await screen.findByText(/Fichero validado/)).toBeInTheDocument()
      expect(screen.getByText(/NO lo subas al portal/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /Siguiente/ }))

      // Paso 6: copia de seguridad y recordatorio
      expect(await screen.findByRole('heading', { level: 2, name: 'Copia de seguridad' })).toBeInTheDocument()
      await user.type(screen.getByLabelText('Contraseña de la copia'), 'otra-clave-copia')
      await user.click(screen.getByRole('button', { name: 'Descargar copia' }))
      expect(await screen.findByText(/Copia cifrada descargada/)).toBeInTheDocument()
      await user.selectOptions(screen.getByLabelText('Recordarme hacer una copia'), '14')
      expect(screen.getByLabelText('Borrar la reserva de prueba al terminar')).toBeChecked()
      await user.click(screen.getByRole('button', { name: 'Terminar' }))

      // Termina en Hoy, sin la reserva de prueba, sin aviso de copia ni del asistente
      expect(await screen.findByRole('heading', { level: 1, name: 'Lista del día' })).toBeInTheDocument()
      expect(screen.getByText(/Todo listo/)).toBeInTheDocument()
      expect(screen.queryByText(/PRUEBA-1/)).not.toBeInTheDocument()
      expect(screen.queryByText(/copia de seguridad/i, { selector: '.recordatorio-copia *, .recordatorio-copia' })).not.toBeInTheDocument()
      expect(screen.queryByText(/Continuar los primeros pasos/)).not.toBeInTheDocument()
    },
    60_000,
  )

  it('«Atrás» vuelve al paso anterior conservando lo hecho', async () => {
    const user = userEvent.setup()
    montar()
    await crearContraseña(user)
    await user.type(await screen.findByLabelText(/^Nombre del establecimiento/), 'Pensión Carmen')
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    await screen.findByRole('heading', { level: 2, name: 'Reserva de prueba' })
    await user.click(screen.getByRole('button', { name: /Atrás/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Datos del establecimiento' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nombre del establecimiento/)).toHaveValue('Pensión Carmen')
    expect(progreso()[2]).toMatch(/Reserva de prueba.*pendiente/)
  })

  it('sin código de establecimiento se puede seguir; el paso del fichero explica por qué no se puede generar', async () => {
    const user = userEvent.setup()
    montar()
    await crearContraseña(user)
    await user.type(await screen.findByLabelText(/^Nombre del establecimiento/), 'Casa Rural Sin Código')
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar reserva' }))
    await user.click(await screen.findByRole('button', { name: /Siguiente/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Generar el primer fichero' })).toBeInTheDocument()
    expect(screen.getByText(/Sin código de establecimiento no se puede generar el fichero de partes de viajeros/)).toBeInTheDocument()
  })

  it('se puede saltar, y se retoma desde Ajustes en el mismo paso', async () => {
    const user = userEvent.setup()
    montar()
    await crearContraseña(user)
    await user.type(await screen.findByLabelText(/^Nombre del establecimiento/), 'Pensión Carmen')
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    await screen.findByRole('heading', { level: 2, name: 'Reserva de prueba' })
    await user.click(screen.getByRole('button', { name: 'Saltar los primeros pasos' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Lista del día' })).toBeInTheDocument()
    expect(screen.getByText(/Puedes retomarlos cuando quieras en Ajustes/)).toBeInTheDocument()

    window.location.hash = '#/ajustes'
    await user.click(await screen.findByRole('link', { name: /Primeros pasos/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Reserva de prueba' })).toBeInTheDocument()
    expect(screen.getByText('Paso 3 de 6')).toBeInTheDocument()
  })

  it('si se sale sin terminar ni saltar, «Hoy» ofrece continuar', async () => {
    const user = userEvent.setup()
    montar()
    await crearContraseña(user)
    await screen.findByRole('heading', { level: 2, name: 'Datos del establecimiento' })
    await user.click(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Hoy' }))
    await user.click(await screen.findByRole('button', { name: 'Continuar los primeros pasos (paso 2 de 6)' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Datos del establecimiento' })).toBeInTheDocument()
  })

  it('el foco va al título de cada paso al avanzar (lector de pantalla y teclado)', async () => {
    const user = userEvent.setup()
    montar()
    await crearContraseña(user)
    await user.type(await screen.findByLabelText(/^Nombre del establecimiento/), 'Pensión Carmen')
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    const h = await screen.findByRole('heading', { level: 2, name: 'Reserva de prueba' })
    await waitFor(() => expect(document.activeElement).toBe(h))
  })

  it('sin violaciones de axe en un paso con formulario', { timeout: TIMEOUT_AXE }, async () => {
    const user = userEvent.setup()
    const { container } = montar()
    await crearContraseña(user)
    await screen.findByRole('heading', { level: 2, name: 'Datos del establecimiento' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('recordatorio de copia en Hoy', () => {
  it('con reservas reales y sin ninguna copia: lo dice y lleva a hacerla', async () => {
    const user = userEvent.setup()
    montar()
    await crearContraseña(user)
    await user.click(await screen.findByRole('button', { name: 'Saltar los primeros pasos' }))
    await user.click(await screen.findByRole('button', { name: 'Nueva reserva' }))
    await user.type(await screen.findByLabelText(/Referencia de la reserva/), 'REAL-1')
    await user.type(screen.getByLabelText('Salida'), '2026-11-04T11:00')
    await user.click(screen.getByRole('button', { name: 'Guardar reserva' }))
    await screen.findByRole('heading', { level: 1, name: 'Reserva REAL-1' })
    await user.click(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Hoy' }))
    const aviso = (await screen.findByText(/Todavía no has hecho ninguna copia de seguridad/)).closest('.recordatorio-copia') as HTMLElement
    await user.click(within(aviso).getByRole('link', { name: 'Hacer una copia ahora' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Copia de seguridad' })).toBeInTheDocument()
  })
})
