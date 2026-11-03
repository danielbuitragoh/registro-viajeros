import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { FormularioViajero, viajeroVacio } from '../../src/ui/FormularioViajero'
import { Pista } from '../../src/ui/Pista'
import { Huesped } from '../../src/ui/Huesped'
import { crearDatosEnlace, generarClaveEnlace } from '../../src/huesped/enlace'
import type { Idioma } from '../../src/huesped/enlace'
import { establecimiento, reserva } from '../fixtures'

beforeEach(() => sessionStorage.clear())

const formulario = (idioma: Idioma = 'es', modo: 'huesped' | 'recepcion' = 'huesped') =>
  render(<FormularioViajero inicial={viajeroVacio('n1')} idioma={idioma} modo={modo} fechaEntrada="2026-11-02" adultos={[]} numero={1} onGuardar={vi.fn()} />)

/** Abre una pista «¿Qué es…?» por su texto y devuelve su contenido. */
async function abrir(user: ReturnType<typeof userEvent.setup>, titulo: RegExp | string) {
  const resumen = screen.getByText(titulo, { selector: 'summary, summary *' }).closest('summary') as HTMLElement
  await user.click(resumen)
  const detalles = resumen.closest('details') as HTMLDetailsElement
  expect(detalles.open).toBe(true)
  return detalles.querySelector('.pista-contenido') as HTMLElement
}

describe('Pista «¿Qué es…?»', () => {
  it('es un desplegable nativo: cerrado al principio, se abre con clic o teclado y se vuelve a cerrar', async () => {
    const user = userEvent.setup()
    render(<Pista titulo="¿Qué es esto?">Explicación corta</Pista>)
    const det = screen.getByText('¿Qué es esto?').closest('details') as HTMLDetailsElement
    expect(det.open).toBe(false)
    screen.getByText('¿Qué es esto?').closest('summary')?.focus()
    await user.keyboard('{Enter}')
    expect(det.open).toBe(true)
    expect(screen.getByText('Explicación corta')).toBeVisible()
    await user.keyboard('{Enter}')
    expect(det.open).toBe(false)
  })
})

describe('Guía contextual en la ficha del viajero', () => {
  it('«¿Qué documento elijo?» explica los 4 tipos oficiales, incluido «Otro documento» para un carné de otro país', async () => {
    const user = userEvent.setup()
    formulario('es')
    const c = await abrir(user, '¿Qué documento elijo?')
    for (const t of [/«DNI \/ NIF»/, /«NIE»/, /«Pasaporte»/, /«Otro documento».*carné de identidad de tu país/]) expect(within(c).getByText(t)).toBeInTheDocument()
    expect(within(c).getAllByRole('listitem')).toHaveLength(4)
  })

  it('el campo del número explica el formato del tipo elegido, con un ejemplo ficticio válido', async () => {
    const user = userEvent.setup()
    formulario('es')
    const num = screen.getByLabelText(/^Número de documento/)
    await user.selectOptions(screen.getByLabelText(/^Tipo de documento/), 'NIF')
    expect(num).toHaveAccessibleDescription(/8 números y una letra.*12345678Z/)
    await user.selectOptions(screen.getByLabelText(/^Tipo de documento/), 'NIE')
    expect(num).toHaveAccessibleDescription(/X, Y o Z.*X1234567L/)
    await user.selectOptions(screen.getByLabelText(/^Tipo de documento/), 'OTRO')
    expect(num).toHaveAccessibleDescription(/hasta 15 letras o números/)
  })

  it('«¿Qué es el número de soporte?» solo con DNI o NIE, con ilustración orientativa (no un documento real)', async () => {
    const user = userEvent.setup()
    formulario('es')
    await user.selectOptions(screen.getByLabelText(/^Tipo de documento/), 'PAS')
    expect(screen.queryByText('¿Qué es el número de soporte?')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/^Tipo de documento/), 'NIF')
    const c = await abrir(user, '¿Qué es el número de soporte?')
    expect(within(c).getByText(/cambia cada vez que se renueva/)).toBeInTheDocument()
    const ilu = within(c).getByRole('img', { name: /Número de soporte/ })
    expect(ilu).toBeInTheDocument()
    expect(within(c).getByText(/no es un documento real/)).toBeInTheDocument()
  })

  it('«¿Qué es el código INE?»: 5 números, no es el código postal; ejemplo de la muestra FICTICIA; el huésped puede dejarlo en blanco', async () => {
    const user = userEvent.setup()
    formulario('es', 'huesped')
    const c = await abrir(user, '¿Qué es el código INE?')
    expect(within(c).getByText(/No es el código postal/)).toBeInTheDocument()
    expect(within(c).getByText(/Ejemplo \(ficticio\): 99001 = provincia 99 \+ municipio 001/)).toBeInTheDocument()
    expect(within(c).getByText(/déjalo en blanco: recepción lo completa/)).toBeInTheDocument()
  })

  it('en recepción, la ayuda del INE explica cómo encontrarlo (en vez de «déjalo en blanco»)', async () => {
    const user = userEvent.setup()
    formulario('es', 'recepcion')
    const c = await abrir(user, '¿Qué es el código INE?')
    expect(within(c).getByText(/Relación de municipios y sus códigos por provincias/)).toBeInTheDocument()
    expect(within(c).queryByText(/déjalo en blanco/)).not.toBeInTheDocument()
  })

  it('teléfono de otro país, segundo apellido y menores tienen su pista', () => {
    formulario('es', 'huesped')
    for (const t of ['¿Teléfono de otro país?', '¿Hace falta el segundo apellido?', '¿Viajas con menores?']) expect(screen.getByText(t)).toBeInTheDocument()
  })

  it.each([
    ['en', 'Which document should I choose?', 'What is the INE code?'],
    ['fr', 'Quel document choisir ?', 'Qu’est-ce que le code INE ?'],
    ['de', 'Welches Dokument wähle ich?', 'Was ist der INE-Code?'],
    ['it', 'Quale documento scelgo?', 'Che cos’è il codice INE?'],
    ['pt', 'Que documento escolho?', 'O que é o código INE?'],
  ] as const)('traducida (%s)', (idioma, doc, ine) => {
    formulario(idioma)
    expect(screen.getByText(doc)).toBeInTheDocument()
    expect(screen.getByText(ine)).toBeInTheDocument()
  })

  it(
    'sin violaciones de axe con todas las pistas abiertas',
    async () => {
      const user = userEvent.setup()
      const { container } = formulario('de')
      await user.selectOptions(screen.getByLabelText(/^Art des Dokuments/), 'NIF')
      for (const s of container.querySelectorAll('details.pista > summary')) await user.click(s as HTMLElement)
      expect(await axe(container)).toHaveNoViolations()
    },
    TIMEOUT_AXE,
  )
})

describe('Ayuda del huésped', () => {
  const datos = crearDatosEnlace(establecimiento(), reserva({ id: 'res-g', numPersonas: 2 }), generarClaveEnlace(), 'fr')

  it('preguntas frecuentes en su idioma desde la bienvenida, y el progreso «Étape 1 sur 3»', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    expect(screen.getByText('Étape 1 sur 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Questions fréquentes' })).toBeInTheDocument()
    await user.click(screen.getByText('Je n’ai pas de document espagnol'))
    expect(screen.getByText(/choisissez « Passeport » ou « Autre document »/)).toBeVisible()
  })

  it('lista vacía: dice qué hacer a continuación con el nombre real del botón', async () => {
    const user = userEvent.setup()
    render(<Huesped datos={datos} />)
    await user.click(screen.getByRole('button', { name: 'Commencer' }))
    expect(screen.getByText('Étape 2 sur 3')).toBeInTheDocument()
    expect(screen.getByText('Touchez « Ajouter un voyageur » pour remplir la fiche de la première personne.')).toBeInTheDocument()
  })

  it(
    'sin violaciones de axe en la bienvenida con las preguntas abiertas',
    async () => {
      const user = userEvent.setup()
      const { container } = render(<Huesped datos={datos} />)
      for (const s of container.querySelectorAll('details > summary')) await user.click(s as HTMLElement)
      expect(await axe(container)).toHaveNoViolations()
    },
    TIMEOUT_AXE,
  )
})
