import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Error visto en la demo publicada: al pulsar «Abrir» en la lista del día se abrió una reserva distinta a la de esa fila.
 * Causa: al entrar en la demo, la recepción se mostraba ANTES de guardar los datos y las filas iban apareciendo (y
 * reordenándose por hora de entrada) una a una, con el aviso de configuración y el de 24 h apareciendo y desapareciendo
 * encima. En un móvil, el toque se resuelve donde se levanta el dedo: si la tabla se mueve en ese instante, se abre la
 * fila que queda debajo. La lista debe aparecer ya completa y no moverse.
 */
beforeEach(() => {
  vi.stubEnv('VITE_DEMO', 'true')
  vi.resetModules()
  window.location.hash = ''
})
afterEach(() => vi.unstubAllEnvs())

const instantanea = () =>
  [
    ...[...document.querySelectorAll('table button')].map((b) => b.textContent),
    document.body.textContent?.includes('Configura tu establecimiento') ? '+aviso-config' : '',
    document.querySelector('.aviso-plazo-vencido, .aviso-plazo-proximo') ? '+aviso-plazo' : '',
  ].join('|')

describe('Entrar en la demo', () => {
  it('la lista del día aparece ya completa: ninguna fila cambia de sitio después de mostrarse', async () => {
    const { AppProvider } = await import('../../src/app/AppContext')
    const { Puerta } = await import('../../src/App')
    const estados: string[] = []
    const obs = new MutationObserver(() => {
      if (!document.getElementById('t-hoy')) return
      const s = instantanea()
      if (estados.at(-1) !== s) estados.push(s)
    })
    obs.observe(document.body, { childList: true, subtree: true, characterData: true })

    const user = userEvent.setup()
    render(
      <AppProvider nombreBd={`demo-${Math.random().toString(36).slice(2)}`} iteraciones={1000}>
        <Puerta />
      </AppProvider>,
    )
    await user.click(await screen.findByRole('button', { name: 'Entrar a la demo con datos ficticios' }))
    await screen.findByRole('heading', { name: 'Lista del día' })
    await waitFor(() => expect(screen.getAllByText('Hostal Demo (ficticio)').length).toBeGreaterThan(0))
    // margen para que terminen guardados pendientes (si los hubiera)
    await new Promise((r) => setTimeout(r, 300))
    obs.disconnect()

    expect(screen.getAllByRole('button', { name: /Abrir reserva DEMO-/ }).length).toBeGreaterThan(0)
    expect(estados, estados.join('\n')).toHaveLength(1)
    expect(estados[0]).not.toContain('+aviso-config')
  })
})
