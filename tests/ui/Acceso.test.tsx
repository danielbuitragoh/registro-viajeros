import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { describe, expect, it, vi } from 'vitest'
import { Acceso } from '../../src/ui/Acceso'

describe('Acceso — crear', () => {
  const montar = () => {
    const onCrear = vi.fn().mockResolvedValue(undefined)
    render(<Acceso modo="crear" onCrear={onCrear} onAbrir={vi.fn()} />)
    return onCrear
  }

  it('rechaza contraseñas cortas, distintas o sin confirmar la casilla', async () => {
    const user = userEvent.setup()
    const onCrear = montar()
    await user.type(screen.getByLabelText('Contraseña'), 'corta')
    await user.click(screen.getByRole('button', { name: 'Crear y seguir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 8/)
    await user.clear(screen.getByLabelText('Contraseña'))
    await user.type(screen.getByLabelText('Contraseña'), 'contraseña-larga')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'otra-distinta-1')
    await user.click(screen.getByRole('button', { name: 'Crear y seguir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no coinciden/)
    await user.clear(screen.getByLabelText('Repite la contraseña'))
    await user.type(screen.getByLabelText('Repite la contraseña'), 'contraseña-larga')
    await user.click(screen.getByRole('button', { name: 'Crear y seguir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Marca la casilla/)
    expect(onCrear).not.toHaveBeenCalled()
  })

  it('crea cuando todo es correcto', async () => {
    const user = userEvent.setup()
    const onCrear = montar()
    await user.type(screen.getByLabelText('Contraseña'), 'contraseña-larga')
    await user.type(screen.getByLabelText('Repite la contraseña'), 'contraseña-larga')
    await user.click(screen.getByLabelText(/no se pueden recuperar/))
    await user.click(screen.getByRole('button', { name: 'Crear y seguir' }))
    expect(onCrear).toHaveBeenCalledWith('contraseña-larga')
  })

  it('advierte de que no hay recuperación y permite pegar (WCAG 3.3.8: autocomplete correcto)', () => {
    montar()
    expect(screen.getByText(/Nadie puede recuperarla/)).toBeInTheDocument()
    expect(screen.getByText(/quedan ilegibles para siempre/)).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'new-password')
  })
})

describe('Acceso — abrir', () => {
  it('contraseña incorrecta → error anunciado; correcta → no hay error', async () => {
    const user = userEvent.setup()
    const onAbrir = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    render(<Acceso modo="abrir" onCrear={vi.fn()} onAbrir={onAbrir} />)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'current-password')
    await user.type(screen.getByLabelText('Contraseña'), 'mala-clave')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Contraseña incorrecta.')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('sin violaciones de accesibilidad (axe)', { timeout: TIMEOUT_AXE }, async () => {
    const { container } = render(<Acceso modo="crear" onCrear={vi.fn()} onAbrir={vi.fn()} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
