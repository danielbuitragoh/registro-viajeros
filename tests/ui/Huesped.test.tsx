import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { Huesped } from '../../src/ui/Huesped'
import { crearDatosEnlace, generarClaveEnlace } from '../../src/huesped/enlace'
import { descifrarFicha } from '../../src/huesped/ficha'
import { establecimiento, reserva } from '../fixtures'

const clave = generarClaveEnlace()
const datos = crearDatosEnlace(establecimiento(), reserva({ id: 'res-test', numPersonas: 2 }), clave, 'es')

beforeEach(() => sessionStorage.clear())

async function anadirAdulto(user: ReturnType<typeof userEvent.setup>, nombre = 'Lucía') {
  await user.click(screen.getByRole('button', { name: /^Añadir (otro )?viajero$/ }))
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

  it('el botón dice «Añadir viajero» con la lista vacía y «Añadir otro viajero» cuando ya hay alguno', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    expect(screen.getByRole('button', { name: 'Añadir viajero' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir otro viajero' })).not.toBeInTheDocument()
    await anadirAdulto(user)
    expect(await screen.findByRole('button', { name: 'Añadir otro viajero' })).toBeInTheDocument()
  })

  it('cambia de idioma con el selector: textos, atributo lang del documento y cada opción marcada con su idioma', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    const selector = screen.getByRole('combobox', { name: /Idioma/ })
    // cada opción se nombra en su lengua y lleva su lang (WCAG 3.1.2)
    expect(within(selector).getByRole('option', { name: 'Deutsch' })).toHaveAttribute('lang', 'de')
    await user.selectOptions(selector, 'en')
    expect(screen.getByRole('heading', { name: 'Traveller details' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    for (const [l, titulo] of [
      ['fr', 'Données des voyageurs'],
      ['de', 'Angaben der Reisenden'],
      ['it', 'Dati dei viaggiatori'],
      ['pt', 'Dados dos viajantes'],
    ] as const) {
      await user.selectOptions(screen.getByRole('combobox', { name: /Language|Langue|Sprache|Lingua|Idioma/ }), l)
      expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
      expect(document.documentElement.lang).toBe(l)
    }
  })

  it('formulario completo en alemán: etiquetas y opciones oficiales traducidas', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={{ ...datos, l: 'de' }} />)
    await user.click(screen.getByRole('button', { name: 'Starten' }))
    await user.click(screen.getByRole('button', { name: 'Person hinzufügen' }))
    expect(screen.getByLabelText('Vorname')).toBeInTheDocument()
    expect(within(screen.getByLabelText(/Ausweisart/)).getByRole('option', { name: 'Reisepass' })).toHaveAttribute('value', 'PAS')
    expect(within(screen.getAllByLabelText(/Staatsangehörigkeit/)[0] as HTMLElement).getByRole('option', { name: 'Deutschland' })).toHaveAttribute('value', 'DEU')
  })

  it('pre-check-in: la ficha se puede descargar en PDF o imprimir (legible, bilingüe, sin servidor)', async () => {
    const user = userEvent.setup()
    const crearUrl = vi.fn((_: Blob) => 'blob:ficha')
    URL.createObjectURL = crearUrl
    URL.revokeObjectURL = vi.fn()
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const clicEnlace = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await anadirAdulto(user)
    await user.click(screen.getByRole('button', { name: 'Terminar y obtener el código' }))
    await screen.findByLabelText('Código de envío')

    await user.click(screen.getByRole('button', { name: 'Descargar ficha en PDF' }))
    const blob = crearUrl.mock.calls.at(-1)?.[0] as Blob
    expect(blob.type).toBe('application/pdf')
    const cabecera = await new Promise<string>((ok) => {
      const fr = new FileReader()
      fr.onload = () => ok(String(fr.result).slice(0, 8))
      fr.readAsText(blob.slice(0, 8))
    })
    expect(cabecera).toBe('%PDF-1.4')
    expect(clicEnlace).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Imprimir ficha' }))
    expect(imprimir).toHaveBeenCalled()
    // vista de impresión presente (oculta en pantalla), con los datos legibles
    const hoja = document.querySelector('.hoja-impresion') as HTMLElement
    expect(hoja).toHaveTextContent('Lucía')
    expect(hoja).toHaveTextContent('12345678Z')
    expect(screen.getByText(/la ficha NO está cifrada/)).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('se puede terminar con menos viajeros de los de la reserva (recepción lo revisará)', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    // Sin viajeros no hay botón de terminar (un botón deshabilitado no explica nada): el estado vacío dice qué hacer
    expect(screen.queryByRole('button', { name: 'Terminar y obtener el código' })).not.toBeInTheDocument()
    expect(screen.getByText(/Pulsa «Añadir viajero» para rellenar/)).toBeInTheDocument()
    await anadirAdulto(user)
    expect(screen.getByRole('button', { name: 'Terminar y obtener el código' })).toBeEnabled()
  })

  it('sin violaciones de accesibilidad (axe) en inicio y formulario', { timeout: TIMEOUT_AXE }, async () => {
    const user = userEvent.setup()
    const { container } = render(<Huesped datos={datos} />)
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(screen.getByRole('button', { name: 'Añadir viajero' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})

async function vi_waitFor(cond: () => boolean) {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => expect(cond()).toBe(true))
}
