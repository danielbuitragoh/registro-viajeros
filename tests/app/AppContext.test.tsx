import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppProvider, useApp } from '../../src/app/AppContext'
import { establecimiento, reserva } from '../fixtures'

function Sonda({ registro }: { registro: number[] }) {
  const app = useApp()
  if (app.fase === 'listo') registro.push(app.reservas.length)
  return (
    <>
      <p>fase: {app.fase}</p>
      <button type="button" onClick={() => void app.crear('clave-del-hostal', { establecimiento: establecimiento(), reservas: [reserva({ id: 'a' }), reserva({ id: 'b' }), reserva({ id: 'c' })] })}>
        crear
      </button>
    </>
  )
}

describe('AppProvider.crear con datos iniciales', () => {
  it('guarda todo antes de pasar a «listo»: la recepción nunca se ve con datos a medias', async () => {
    const registro: number[] = []
    render(
      <AppProvider nombreBd={`ctx-${Math.random().toString(36).slice(2)}`} iteraciones={1000}>
        <Sonda registro={registro} />
      </AppProvider>,
    )
    await screen.findByText('fase: sin_almacen')
    screen.getByRole('button', { name: 'crear' }).click()
    await waitFor(() => expect(registro.length).toBeGreaterThan(0))
    expect(new Set(registro)).toEqual(new Set([3]))
  })
})
