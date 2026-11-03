import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../../src/app/AppContext'
import { Puerta } from '../../src/App'

let bd = ''
beforeEach(() => {
  bd = `app-${Math.random().toString(36).slice(2)}`
  window.location.hash = ''
})
const montar = () =>
  render(
    <AppProvider nombreBd={bd} iteraciones={1000}>
      <Puerta />
    </AppProvider>,
  )

describe('Aplicación con almacén cifrado real (IndexedDB en memoria)', () => {
  it('primer uso: crear contraseña → entra en recepción; al bloquear pide la contraseña; incorrecta no entra; correcta sí', async () => {
    const user = userEvent.setup()
    const { unmount } = montar()
    await user.type(await screen.findByLabelText('Contraseña'), 'clave-del-hostal')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'clave-del-hostal')
    await user.click(screen.getByLabelText(/no se pueden recuperar/))
    await user.click(screen.getByRole('button', { name: 'Crear y entrar' }))

    expect(await screen.findByRole('heading', { name: 'Lista del día' })).toBeInTheDocument()
    expect(screen.getByText(/Configura tu establecimiento/)).toBeInTheDocument()
    expect(screen.getByText(/no oficial/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(await screen.findByRole('heading', { name: 'Desbloquea el registro' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Lista del día' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Contraseña'), 'equivocada-1')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Contraseña incorrecta.')

    await user.clear(screen.getByLabelText('Contraseña'))
    await user.type(screen.getByLabelText('Contraseña'), 'clave-del-hostal')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByRole('heading', { name: 'Lista del día' })).toBeInTheDocument()
    unmount()
  })

  it('crea una reserva desde la interfaz y persiste cifrada al reabrir', async () => {
    const user = userEvent.setup()
    const a = montar()
    await user.type(await screen.findByLabelText('Contraseña'), 'clave-del-hostal')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'clave-del-hostal')
    await user.click(screen.getByLabelText(/no se pueden recuperar/))
    await user.click(screen.getByRole('button', { name: 'Crear y entrar' }))
    await screen.findByRole('heading', { name: 'Lista del día' })

    await user.click(screen.getByRole('button', { name: 'Nueva reserva' }))
    await user.type(await screen.findByLabelText(/Referencia de la reserva/), 'RES-UI-1')
    const salida = screen.getByLabelText('Salida')
    await user.type(salida, '2099-01-05T11:00')
    await user.click(screen.getByRole('button', { name: 'Guardar reserva' }))
    expect(await screen.findByRole('heading', { name: /Reserva RES-UI-1/ })).toBeInTheDocument()
    a.unmount()

    window.location.hash = '#/reservas'
    montar()
    await user.type(await screen.findByLabelText('Contraseña'), 'clave-del-hostal')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    await waitFor(() => expect(screen.getAllByText(/RES-UI-1/).length).toBeGreaterThan(0))
  })

  it('al cambiar de pantalla vuelve arriba y lleva el foco al contenido (en el móvil se ve el título de la reserva abierta)', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    montar()
    await user.type(await screen.findByLabelText('Contraseña'), 'clave-del-hostal')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'clave-del-hostal')
    await user.click(screen.getByLabelText(/no se pueden recuperar/))
    await user.click(screen.getByRole('button', { name: 'Crear y entrar' }))
    await screen.findByRole('heading', { name: 'Lista del día' })
    scrollTo.mockClear()

    await user.click(screen.getByRole('button', { name: 'Nueva reserva' }))
    await screen.findByRole('heading', { name: 'Nueva reserva' })
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0))
    expect(document.activeElement).toBe(document.getElementById('contenido'))

    scrollTo.mockClear()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await screen.findByRole('heading', { name: 'Lista del día' })
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0))
    scrollTo.mockRestore()
  })
})
