import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { AppProvider, useApp, type DatosIniciales } from '../../src/app/AppContext'
import { Recepcion } from '../../src/ui/Recepcion'
import { adulto, establecimiento, reserva } from '../fixtures'

beforeEach(() => {
  window.location.hash = ''
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

/** Crea un almacén con estos datos y muestra la recepción (sin pasar por la pantalla de contraseña). */
function Sembrar({ datos }: { datos: DatosIniciales }) {
  const app = useApp()
  const hecho = useRef(false)
  useEffect(() => {
    if (app.fase !== 'sin_almacen' || hecho.current) return
    hecho.current = true
    void app.crear('clave-de-pruebas', datos)
  }, [app, datos])
  return app.fase === 'listo' ? <Recepcion /> : null
}
const montar = (datos: DatosIniciales = { establecimiento: establecimiento(), reservas: [] }) =>
  render(
    <AppProvider nombreBd={`nav-${Math.random().toString(36).slice(2)}`} iteraciones={1000} ahora={() => new Date('2026-11-02T20:00:00')}>
      <Sembrar datos={datos} />
    </AppProvider>,
  )
const ir = (ruta: string) => {
  window.location.hash = ruta
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('navegación principal por frecuencia de uso', () => {
  it('Hoy → Reservas → Exportar → Ajustes → Ayuda, cada uno con icono Y texto, y el actual marcado', async () => {
    montar()
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    const enlaces = within(nav).getAllByRole('link')
    expect(enlaces.map((a) => a.textContent)).toEqual(['Hoy', 'Reservas', 'Exportar', 'Ajustes', 'Ayuda'])
    for (const a of enlaces) expect(a.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
    expect(within(nav).getByRole('link', { name: 'Hoy' })).toHaveAttribute('aria-current', 'page')
    ir('/ayuda')
    await screen.findByRole('heading', { level: 1, name: 'Ayuda' })
    expect(within(nav).getByRole('link', { name: 'Ayuda' })).toHaveAttribute('aria-current', 'page')
  })

  it('«Bloquear» está en la cabecera con icono y texto, pero con menos peso que las acciones del día', async () => {
    montar()
    const b = await screen.findByRole('button', { name: 'Bloquear' })
    expect(b).toHaveClass('discreto')
  })
})

describe('reserva: migas de pan, siguiente paso y orden por uso', () => {
  const r = reserva({ id: 'r1', referencia: 'RES-1', entrada: '2026-11-02T15:00', numPersonas: 2, viajeros: [adulto()] })

  it('migas «Reservas › Reserva RES-1» y la sección Reservas marcada en el menú', async () => {
    montar({ establecimiento: establecimiento(), reservas: [r] })
    ir('/reservas/r1')
    const migas = await screen.findByRole('navigation', { name: 'Migas de pan' })
    expect(within(migas).getByRole('link', { name: 'Reservas' })).toHaveAttribute('href', '#/reservas')
    expect(within(migas).getByText('Reserva RES-1')).toHaveAttribute('aria-current', 'page')
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Reservas' })).toHaveAttribute('aria-current', 'page')
  })

  it('arriba, el siguiente paso; después viajeros, ficha del huésped, revisión, datos y eliminar', async () => {
    montar({ establecimiento: establecimiento(), reservas: [r] })
    ir('/reservas/r1')
    await screen.findByRole('heading', { level: 1, name: 'Reserva RES-1' })
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.replace(/\s+/g, ' ').trim())
    expect(h2).toEqual(['Siguiente paso', 'Viajeros (1/2)', 'Ficha rellenada por el huésped', 'Revisión del parte', 'Datos de la reserva', 'Eliminar reserva'])
    expect(screen.getByText(/Faltan fichas: hay 1 de 2/)).toBeInTheDocument()
  })

  it('el pago se muestra con su nombre, no con el código oficial', async () => {
    montar({ establecimiento: establecimiento(), reservas: [r] })
    ir('/reservas/r1')
    await screen.findByRole('heading', { level: 1, name: 'Reserva RES-1' })
    expect(screen.getByText('Efectivo')).toBeInTheDocument()
    expect(screen.queryByText('EFECT')).not.toBeInTheDocument()
  })

  it('nueva reserva: migas «Reservas › Nueva reserva»', async () => {
    montar()
    ir('/reservas/nueva')
    const migas = await screen.findByRole('navigation', { name: 'Migas de pan' })
    expect(within(migas).getByText('Nueva reserva')).toHaveAttribute('aria-current', 'page')
  })

  it('Reservas sin ninguna: estado vacío con lo que hay que hacer', async () => {
    montar()
    ir('/reservas')
    expect(await screen.findByText('Todavía no hay reservas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear la primera reserva' })).toBeInTheDocument()
  })
})

describe('Ajustes dividido en subpáginas', () => {
  it('índice con cada apartado; al entrar en uno, migas «Ajustes › …»', async () => {
    const user = userEvent.setup()
    montar()
    ir('/ajustes')
    await screen.findByRole('heading', { level: 1, name: 'Ajustes' })
    const indice = screen.getByRole('list', { name: 'Apartados de Ajustes' })
    expect(within(indice).getAllByRole('link').map((a) => a.querySelector('strong')?.textContent)).toEqual([
      'Establecimiento',
      'Copia de seguridad',
      'Primeros pasos',
      'Apariencia',
      'Seguridad',
      'Conservación y purga',
      'Borrar todos los datos',
    ])
    await user.click(within(indice).getByRole('link', { name: /Establecimiento/ }))
    await screen.findByRole('heading', { level: 1, name: 'Establecimiento' })
    const migas = screen.getByRole('navigation', { name: 'Migas de pan' })
    expect(within(migas).getByRole('link', { name: 'Ajustes' })).toHaveAttribute('href', '#/ajustes')
    expect(screen.getByLabelText(/^Código de establecimiento/)).toHaveValue('0000012345')
  })

  it('Apariencia: claro, oscuro o según el sistema (se aplica al momento)', async () => {
    const user = userEvent.setup()
    montar()
    ir('/ajustes/apariencia')
    await user.click(await screen.findByLabelText('Oscuro'))
    expect(document.documentElement.dataset.theme).toBe('oscuro')
    await user.click(screen.getByLabelText('Claro'))
    expect(document.documentElement.dataset.theme).toBe('claro')
    await user.click(screen.getByLabelText(/Automático/))
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('una subpágina que no existe vuelve al índice', async () => {
    montar()
    ir('/ajustes/no-existe')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument()
  })

  it('sin violaciones de axe en el índice', { timeout: TIMEOUT_AXE }, async () => {
    const { container } = montar()
    ir('/ajustes')
    await screen.findByRole('heading', { level: 1, name: 'Ajustes' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('página Ayuda', () => {
  it('preguntas frecuentes con lo que pide recepción', async () => {
    montar()
    ir('/ayuda')
    await screen.findByRole('heading', { level: 1, name: 'Ayuda' })
    const preguntas = [...document.querySelectorAll('details.faq > summary')].map((s) => s.textContent)
    for (const p of [/plazo/i, /portal.*rechaza/i, /menores/i, /no tiene documento español/i, /cambiar de (ordenador|dispositivo)/i, /AM HOTEL/, /código de establecimiento/i, /soporte/i, /código INE/i, /olvidado la contraseña/i, /envía.*Ministerio/i]) {
      expect(preguntas.some((x) => p.test(x ?? '')), String(p)).toBe(true)
    }
  })

  it('AM HOTEL u otros programas: solo como pre-check-in y no enviar dos veces', async () => {
    const user = userEvent.setup()
    montar()
    ir('/ayuda')
    await user.click(await screen.findByText(/AM HOTEL/))
    expect(screen.getByText(/solo como pre-check-in/)).toBeVisible()
    expect(screen.getByText(/no exportes ni subas el XML/)).toBeVisible()
  })

  it('el buscador filtra las preguntas y, si no hay resultados, lo dice', async () => {
    const user = userEvent.setup()
    montar()
    ir('/ayuda')
    await user.type(await screen.findByLabelText('Buscar en la ayuda'), 'menores')
    await waitFor(() => expect(document.querySelectorAll('details.faq').length).toBeGreaterThan(0))
    for (const s of document.querySelectorAll('details.faq > summary')) expect(s.closest('details')?.textContent).toMatch(/menor/i)
    await user.clear(screen.getByLabelText('Buscar en la ayuda'))
    await user.type(screen.getByLabelText('Buscar en la ayuda'), 'zzzzzz')
    expect(screen.getByText(/Ninguna pregunta coincide/)).toBeInTheDocument()
  })

  it('enlaza a los primeros pasos', async () => {
    montar()
    ir('/ayuda')
    expect(await screen.findByRole('link', { name: /primeros pasos/i })).toHaveAttribute('href', '#/primeros-pasos')
  })

  it('sin violaciones de axe', { timeout: TIMEOUT_AXE }, async () => {
    const { container } = montar()
    ir('/ayuda')
    await screen.findByRole('heading', { level: 1, name: 'Ayuda' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
