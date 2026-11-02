import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { Huesped } from '../../src/ui/Huesped'
import { crearDatosEnlace, generarClaveEnlace } from '../../src/huesped/enlace'
import { descifrarFicha } from '../../src/huesped/ficha'
import { establecimiento, reserva } from '../fixtures'

const clave = generarClaveEnlace()
const datos = crearDatosEnlace(establecimiento(), reserva({ id: 'res-test', numPersonas: 2 }), clave, 'es')

beforeEach(() => sessionStorage.clear())

async function anadirAdulto(user: ReturnType<typeof userEvent.setup>, nombre = 'Lucía') {
  await user.click(screen.getByRole('button', { name: 'Añadir otro viajero' }))
  await user.type(screen.getByLabelText('Nombre'), nombre)
  await user.type(screen.getByLabelText('Primer apellido'), 'Prueba')
  await user.type(screen.getByLabelText(/^Segundo apellido/), 'Ejemplo')
  fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: '1985-04-12' } })
  await user.selectOptions(screen.getByLabelText(/Tipo de documento/), 'NIF')
  await user.type(screen.getByLabelText(/Número de documento/), '12345678Z')
  await user.type(screen.getByLabelText(/Número de soporte/), 'ABC123456')
  await user.type(screen.getByLabelText(/Dirección \(calle/), 'Calle Falsa 123')
  await user.type(screen.getByLabelText(/Código postal/), '28001')
  await user.type(screen.getByLabelText(/Nombre del municipio/), 'Madrid')
  await user.type(screen.getByLabelText('Teléfono'), '600123456')
  await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
}

describe('Modo huésped — flujo completo', () => {
  it('pantalla de bienvenida: establecimiento, fechas y aviso de privacidad', () => {
    render(<Huesped datos={datos} />)
    expect(screen.getByRole('heading', { name: 'Datos de los viajeros' })).toBeInTheDocument()
    expect(screen.getByText(/Tu reserva en Hostal Demo/)).toBeInTheDocument()
    expect(screen.getByText(/lo que escribes se queda en tu móvil/)).toBeInTheDocument()
  })

  it('rellenar → terminar → código cifrado que recepción puede descifrar con la clave del enlace', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await anadirAdulto(user)
    expect(await screen.findByRole('heading', { name: 'Viajeros añadidos' })).toBeInTheDocument()
    expect(screen.getByText(/has añadido 1/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Terminar y obtener el código' }))

    const campo = (await screen.findByLabelText('Código de envío')) as HTMLTextAreaElement
    await vi_waitFor(() => campo.value.startsWith('RV1.'))
    expect(await screen.findByRole('img', { name: /Código QR/ })).toBeInTheDocument()

    const v = await descifrarFicha(campo.value, clave, 'res-test')
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ nombre: 'Lucía', apellido1: 'Prueba', numeroDocumento: '12345678Z', origen: 'huesped' })
  })

  it('el borrador sobrevive a una recarga accidental (sessionStorage) y se puede editar o quitar', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await anadirAdulto(user)
    unmount()
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    expect(screen.getByText(/1\. Lucía Prueba/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Quitar/ }))
    expect(screen.getByText('Todavía no has añadido ningún viajero.')).toBeInTheDocument()
  })

  it('cambia de idioma: textos y atributo lang del documento', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Switch to English' }))
    expect(screen.getByRole('heading', { name: 'Traveller details' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    // el propio botón de cambio de idioma está marcado con el idioma de destino (WCAG 3.1.2)
    expect(screen.getByRole('button', { name: 'Cambiar a español' })).toHaveAttribute('lang', 'es')
  })

  it('se puede terminar con menos viajeros de los de la reserva (recepción lo revisará)', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    expect(screen.getByRole('button', { name: 'Terminar y obtener el código' })).toBeDisabled()
    await anadirAdulto(user)
    expect(screen.getByRole('button', { name: 'Terminar y obtener el código' })).toBeEnabled()
  })

  it('sin violaciones de accesibilidad (axe) en inicio y formulario', { timeout: TIMEOUT_AXE }, async () => {
    const user = userEvent.setup()
    const { container } = render(<Huesped datos={datos} />)
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(screen.getByRole('button', { name: 'Añadir otro viajero' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})

async function vi_waitFor(cond: () => boolean) {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => expect(cond()).toBe(true))
}
