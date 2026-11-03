import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { AvisoActualizacion } from '../../src/pwa/AvisoActualizacion'

describe('aviso de nueva versión disponible', () => {
  it('no muestra nada si no hay versión nueva', () => {
    const { container } = render(<AvisoActualizacion hayNuevaVersion={false} idioma="es" recepcion actualizar={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('en recepción: lo anuncia (región de estado), avisa de que se recargará y pedirá la contraseña, y actualiza al pulsar', async () => {
    const user = userEvent.setup()
    const actualizar = vi.fn()
    render(<AvisoActualizacion hayNuevaVersion idioma="es" recepcion actualizar={actualizar} />)
    const region = screen.getByRole('region', { name: 'Nueva versión disponible' })
    expect(screen.getByRole('status')).toHaveTextContent('Hay una nueva versión de la app.')
    expect(region).toHaveTextContent(/se recargará/)
    expect(region).toHaveTextContent(/contraseña/)
    await user.click(screen.getByRole('button', { name: 'Actualizar ahora' }))
    expect(actualizar).toHaveBeenCalledOnce()
  })

  it('«Más tarde» lo cierra sin actualizar', async () => {
    const user = userEvent.setup()
    const actualizar = vi.fn()
    render(<AvisoActualizacion hayNuevaVersion idioma="es" recepcion actualizar={actualizar} />)
    await user.click(screen.getByRole('button', { name: 'Más tarde' }))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(actualizar).not.toHaveBeenCalled()
  })

  it('en el móvil del huésped, en su idioma y sin hablar de contraseñas (sus datos siguen en la pestaña)', () => {
    render(<AvisoActualizacion hayNuevaVersion idioma="de" recepcion={false} actualizar={vi.fn()} />)
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('lang', 'de')
    expect(screen.getByRole('button', { name: 'Jetzt aktualisieren' })).toBeInTheDocument()
    expect(region).not.toHaveTextContent(/contraseña|Passwort/)
  })

  it(
    'sin violaciones de axe',
    async () => {
      const { container } = render(<AvisoActualizacion hayNuevaVersion idioma="fr" recepcion={false} actualizar={vi.fn()} />)
      expect(await axe(container)).toHaveNoViolations()
    },
    TIMEOUT_AXE,
  )
})
