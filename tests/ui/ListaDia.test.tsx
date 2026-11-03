import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { describe, expect, it, vi } from 'vitest'
import { ListaDia } from '../../src/ui/ListaDia'
import { adulto, reserva } from '../fixtures'

const ahora = new Date('2026-11-02T20:00:00')
const completa = reserva({ id: 'c', referencia: 'COMPLETA', entrada: '2026-11-02T15:00', habitacion: '101' }) // vence 3-nov 15:00 → quedan 19 h
const pendiente = reserva({ id: 'p', referencia: 'PEND', entrada: '2026-11-02T18:00', numPersonas: 3, habitacion: '102' })
const exportada = reserva({ id: 'e', referencia: 'EXPO', entrada: '2026-11-02T10:00', habitacion: '103', exportadaEn: '2026-11-02T12:00:00.000Z', modificadaEn: '2026-11-02T11:00:00.000Z' })
const proxima = reserva({ id: 'x', referencia: 'PROX', entrada: '2026-11-02T00:30', habitacion: '104' }) // vence 3-nov 00:30 → 4 h 30
const vencida = reserva({ id: 'v', referencia: 'VENC', entrada: '2026-10-31T09:00', habitacion: '105', viajeros: [adulto({ nombre: '' })] })
const vacia = reserva({ id: 'n', referencia: 'NUEVA', entrada: '2026-11-02T21:00', habitacion: '106', viajeros: [] })

const props = (reservas = [completa, pendiente, exportada], fecha = '2026-11-02') => ({
  reservas,
  fecha,
  ahora,
  onFecha: vi.fn(),
  onAbrir: vi.fn(),
  onNueva: vi.fn(),
  onEscanear: vi.fn(),
  onExportar: vi.fn(),
})

/** Tarjeta (elemento de lista) de una reserva por su habitación. */
const tarjeta = (lista: HTMLElement, hab: string) => within(lista).getByText(new RegExp(`Hab\\. ${hab}\\b`)).closest('li') as HTMLElement

describe('ListaDia (Hoy)', () => {
  it('atajos de lo de cada día: nueva reserva, escanear el QR de un huésped y exportar los partes listos', async () => {
    const user = userEvent.setup()
    const p = props([completa, pendiente, exportada])
    render(<ListaDia {...p} />)
    const atajos = screen.getByRole('navigation', { name: 'Atajos' })
    await user.click(within(atajos).getByRole('button', { name: 'Nueva reserva' }))
    expect(p.onNueva).toHaveBeenCalled()
    await user.click(within(atajos).getByRole('button', { name: 'Escanear el QR de un huésped' }))
    expect(p.onEscanear).toHaveBeenCalled()
    await user.click(within(atajos).getByRole('button', { name: 'Exportar 1 parte listo' }))
    expect(p.onExportar).toHaveBeenCalled()
  })

  it('las entradas del día son tarjetas (sin tabla ancha) con estado en texto, fichas y habitación', () => {
    render(<ListaDia {...props()} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const lista = screen.getByRole('list', { name: 'Entradas del día' })
    expect(within(tarjeta(lista, '101')).getByText('Completo')).toBeInTheDocument()
    expect(within(tarjeta(lista, '102')).getByText('Pendiente')).toBeInTheDocument()
    expect(within(tarjeta(lista, '103')).getByText('Exportado')).toBeInTheDocument()
    expect(within(tarjeta(lista, '102')).getByText(/1\/3 fichas/)).toBeInTheDocument()
  })

  it('cada tarjeta dice el siguiente paso', () => {
    render(<ListaDia {...props([completa, pendiente, exportada, vacia])} />)
    const lista = screen.getByRole('list', { name: 'Entradas del día' })
    expect(within(tarjeta(lista, '101')).getByText(/Siguiente paso: exportar el parte/)).toBeInTheDocument()
    expect(within(tarjeta(lista, '102')).getByText(/Siguiente paso: faltan fichas \(1 de 3\)/)).toBeInTheDocument()
    expect(within(tarjeta(lista, '103')).getByText(/Siguiente paso: subir el fichero al portal SES\.Hospedajes/)).toBeInTheDocument()
    expect(within(tarjeta(lista, '106')).getByText(/Siguiente paso: enviar el enlace al huésped/)).toBeInTheDocument()
  })

  it('resumen del día con recuentos', () => {
    render(<ListaDia {...props()} />)
    expect(screen.getByText(/3 entradas · 1 pendientes · 1 completas · 1 exportadas/)).toBeInTheDocument()
  })

  it('aviso de las 24 h: vencidos y próximos, con un enlace a CADA reserva afectada', async () => {
    const user = userEvent.setup()
    const p = props([completa, proxima, vencida], '2026-11-02')
    render(<ListaDia {...p} />)
    const aviso = screen.getByText('Aviso de las 24 h').closest('div') as HTMLElement
    expect(within(aviso).getByText(/1 parte sin exportar ha superado el plazo/)).toBeInTheDocument()
    expect(within(aviso).getByText(/1 parte vence en menos de 6 h/)).toBeInTheDocument()
    await user.click(within(aviso).getByRole('button', { name: /VENC/ }))
    expect(p.onAbrir).toHaveBeenCalledWith('v')
    await user.click(within(aviso).getByRole('button', { name: /PROX/ }))
    expect(p.onAbrir).toHaveBeenCalledWith('x')
  })

  it('sin avisos si todo está en plazo', () => {
    render(<ListaDia {...props([completa, exportada])} />)
    expect(screen.queryByText('Aviso de las 24 h')).not.toBeInTheDocument()
  })

  it('el plazo se muestra con texto (no solo color): "Quedan…" / "Vencido hace…"', () => {
    render(<ListaDia {...props([completa, proxima, vencida])} />)
    expect(screen.getAllByText(/Quedan 19 h/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Quedan 4 h 30 min/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Vencido hace/).length).toBeGreaterThan(0)
  })

  it('las pendientes de días anteriores aparecen aparte; las exportadas no', () => {
    const vieja = reserva({ id: 'o', referencia: 'OLD', entrada: '2026-10-30T10:00', exportadaEn: '2026-10-30T12:00:00.000Z', modificadaEn: '2026-10-30T11:00:00.000Z', habitacion: '999' })
    render(<ListaDia {...props([vencida, vieja])} />)
    expect(screen.getByRole('heading', { name: 'Pendientes de días anteriores' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Reservas de días anteriores sin exportar' })).toBeInTheDocument()
    expect(screen.queryByText(/Hab\. 999/)).not.toBeInTheDocument()
  })

  it('orden estable: con la misma hora de entrada, el orden no depende del orden en que llegan los datos', () => {
    const a = reserva({ id: 'id-b', referencia: 'AAA', entrada: '2026-11-02T15:00', habitacion: '201' })
    const b = reserva({ id: 'id-a', referencia: 'BBB', entrada: '2026-11-02T15:00', habitacion: '202' })
    const orden = () => screen.getAllByRole('button', { name: /Abrir reserva/ }).map((x) => x.textContent)
    const { unmount } = render(<ListaDia {...props([a, b])} />)
    const primero = orden()
    unmount()
    render(<ListaDia {...props([b, a])} />)
    expect(orden()).toEqual(primero)
    expect(primero).toEqual(['Abrir reserva AAA', 'Abrir reserva BBB'])
  })

  it('cada botón «Abrir» abre la reserva de SU tarjeta, también tras recibir nuevas reservas que se intercalan', async () => {
    const user = userEvent.setup()
    const p = props([completa, exportada])
    const { rerender } = render(<ListaDia {...p} />)
    rerender(<ListaDia {...p} reservas={[completa, exportada, pendiente, proxima]} />)
    for (const [ref, id, hab] of [['COMPLETA', 'c', '101'], ['EXPO', 'e', '103'], ['PEND', 'p', '102'], ['PROX', 'x', '104']] as const) {
      const boton = screen.getByRole('button', { name: `Abrir reserva ${ref}` })
      expect(within(boton.closest('li') as HTMLElement).getByText(new RegExp(`Hab\\. ${hab}\\b`))).toBeInTheDocument()
      await user.click(boton)
      expect(p.onAbrir).toHaveBeenLastCalledWith(id)
    }
  })

  it('día sin entradas: estado vacío que dice qué hacer, con su botón', async () => {
    const user = userEvent.setup()
    const p = props([completa], '2026-12-25')
    render(<ListaDia {...p} />)
    const vacio = screen.getByText('No hay entradas previstas este día.').closest('.vacio') as HTMLElement
    await user.click(within(vacio).getByRole('button', { name: 'Crear una reserva para este día' }))
    expect(p.onNueva).toHaveBeenCalled()
  })

  it('sin violaciones de accesibilidad (axe)', { timeout: TIMEOUT_AXE }, async () => {
    const { container } = render(<ListaDia {...props([completa, pendiente, exportada, proxima, vencida])} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
