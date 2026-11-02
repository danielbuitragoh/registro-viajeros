import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { FormularioViajero, viajeroVacio } from '../../src/ui/FormularioViajero'
import type { Viajero } from '../../src/domain/tipos'

const base = (over: Partial<Parameters<typeof FormularioViajero>[0]> = {}) => ({
  inicial: viajeroVacio('v1'),
  idioma: 'es' as const,
  modo: 'huesped' as const,
  fechaEntrada: '2026-11-02',
  adultos: [],
  numero: 1,
  onGuardar: vi.fn() as Mock<(v: Viajero) => void>,
  ...over,
})

function rellenarAdulto(user: ReturnType<typeof userEvent.setup>, doc = '12345678Z') {
  return (async () => {
    await user.type(screen.getByLabelText('Nombre'), 'Lucía')
    await user.type(screen.getByLabelText(/^Primer apellido/), 'Prueba')
    await user.type(screen.getByLabelText(/^Segundo apellido/), 'Ejemplo')
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: '1985-04-12' } })
    await user.selectOptions(screen.getByLabelText(/Tipo de documento/), 'NIF')
    await user.type(screen.getByLabelText(/Número de documento/), doc)
    await user.type(screen.getByLabelText(/Número de soporte/), 'ABC123456')
    await user.type(screen.getByLabelText(/Dirección \(calle/), 'Calle Falsa 123')
    await user.type(screen.getByLabelText(/Código postal/), '28001')
    await user.type(screen.getByLabelText(/Nombre del municipio/), 'Madrid')
    await user.type(screen.getByLabelText(/^Teléfono/), '600123456')
  })()
}

describe('FormularioViajero (huésped)', () => {
  it('al enviar vacío muestra un resumen de errores con foco y NO guarda', async () => {
    const user = userEvent.setup()
    const p = base()
    render(<FormularioViajero {...p} />)
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    const resumen = await screen.findByRole('alert')
    expect(within(resumen).getByText(/datos por revisar/)).toBeInTheDocument()
    await vi.waitFor(() => expect(resumen).toHaveFocus())
    expect(p.onGuardar).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true')
  })

  it('los enlaces del resumen llevan el foco al campo con error', async () => {
    const user = userEvent.setup()
    render(<FormularioViajero {...base()} />)
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    await user.click(await screen.findByRole('link', { name: /Nombre: Este dato es obligatorio/ }))
    expect(screen.getByLabelText('Nombre')).toHaveFocus()
  })

  it('el error de un campo está asociado con aria-describedby (lectores de pantalla)', async () => {
    const user = userEvent.setup()
    render(<FormularioViajero {...base()} />)
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    const campo = screen.getByLabelText('Nombre')
    const id = campo.getAttribute('aria-describedby') as string
    expect(document.getElementById(id)).toHaveTextContent('Este dato es obligatorio')
  })

  it('letra de control incorrecta: dice cuál debería ser', async () => {
    const user = userEvent.setup()
    const p = base()
    render(<FormularioViajero {...p} />)
    await rellenarAdulto(user, '12345678A')
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    expect((await screen.findAllByText(/debería ser Z/)).length).toBeGreaterThan(0)
    expect(p.onGuardar).not.toHaveBeenCalled()
  })

  it('con datos válidos guarda normalizando (sin código INE: el huésped no puede conocerlo)', async () => {
    const user = userEvent.setup()
    const p = base()
    render(<FormularioViajero {...p} />)
    await rellenarAdulto(user, '12.345.678-z')
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    expect(p.onGuardar).toHaveBeenCalledTimes(1)
    const v = (p.onGuardar as Mock).mock.calls[0]?.[0] as Viajero
    expect(v.nombre).toBe('Lucía')
    expect(v.apellido2).toBe('Ejemplo')
    expect(v.direccion.codigoMunicipio).toBeUndefined()
  })

  it('un menor muestra adulto responsable y parentesco, y el documento pasa a opcional', async () => {
    const user = userEvent.setup()
    render(<FormularioViajero {...base({ adultos: [{ id: 'a1', nombre: 'Lucía Prueba' }] })} />)
    expect(screen.queryByLabelText(/Adulto que le acompaña/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/), { target: { value: '2016-07-20' } })
    expect(screen.getByLabelText(/Adulto que le acompaña/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Parentesco del adulto/)).toBeInTheDocument()
    expect(screen.getByText(/Opcional para menores de edad/)).toBeInTheDocument()
    expect(screen.getByText(/es menor de edad/)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/Adulto que le acompaña/), 'a1')
    await user.selectOptions(screen.getByLabelText(/Parentesco del adulto/), 'PM')
  })

  it('permite copiar la dirección del viajero 1 (WCAG 3.3.7: no pedir dos veces lo mismo)', async () => {
    const user = userEvent.setup()
    const dir = { direccion: 'Calle Copiada 9', codigoPostal: '28001', codigoMunicipio: '28079', pais: 'ESP' }
    render(<FormularioViajero {...base({ numero: 2, direccionCopiable: dir })} />)
    await user.click(screen.getByRole('button', { name: /misma dirección que el viajero 1/ }))
    expect(screen.getByLabelText(/Dirección \(calle/)).toHaveValue('Calle Copiada 9')
  })

  it('los campos de contacto y fecha llevan autocomplete (WCAG 1.3.5)', () => {
    render(<FormularioViajero {...base()} />)
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('autocomplete', 'given-name')
    expect(screen.getByLabelText(/^Primer apellido/)).toHaveAttribute('autocomplete', 'family-name')
    expect(screen.getByLabelText(/Fecha de nacimiento/)).toHaveAttribute('autocomplete', 'bday')
    expect(screen.getByLabelText(/^Teléfono/)).toHaveAttribute('autocomplete', 'tel')
    expect(screen.getByLabelText(/Correo/)).toHaveAttribute('autocomplete', 'email')
  })

  it('en inglés: etiquetas y mensajes en inglés', async () => {
    const user = userEvent.setup()
    render(<FormularioViajero {...base({ idioma: 'en' })} />)
    expect(screen.getByLabelText('First name')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: /Traveller 1 details/ })).toHaveAttribute('lang', 'en')
    await user.click(screen.getByRole('button', { name: 'Save traveller' }))
    expect(await screen.findByText(/items need your attention/)).toBeInTheDocument()
    expect(screen.getAllByText(/This field is required/).length).toBeGreaterThan(0)
  })

  it('sin violaciones de accesibilidad (axe), también con errores visibles', { timeout: TIMEOUT_AXE }, async () => {
    const user = userEvent.setup()
    const { container } = render(<FormularioViajero {...base()} />)
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    await screen.findByRole('alert')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('FormularioViajero (recepción)', () => {
  it('guarda aunque falten datos (borrador) y muestra los errores', async () => {
    const user = userEvent.setup()
    const p = base({ modo: 'recepcion' })
    render(<FormularioViajero {...p} />)
    await user.type(screen.getByLabelText('Nombre'), 'Parcial')
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    expect(p.onGuardar).toHaveBeenCalledTimes(1)
  })

  it('exige el código INE si la dirección es española', async () => {
    const user = userEvent.setup()
    render(<FormularioViajero {...base({ modo: 'recepcion' })} />)
    await user.click(screen.getByRole('button', { name: 'Guardar viajero' }))
    expect(screen.getByLabelText(/Código INE/)).toHaveAttribute('aria-required', 'true')
  })
})
