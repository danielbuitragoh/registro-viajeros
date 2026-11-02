import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeSinContraste as axe } from '../axe'
import { describe, expect, it, vi } from 'vitest'
import { ListaDia } from '../../src/ui/ListaDia'
import { adulto, reserva } from '../fixtures'

const ahora = new Date('2026-11-02T20:00:00')
const completa = reserva({ id: 'c', referencia: 'COMPLETA', entrada: '2026-11-02T15:00', habitacion: '101' }) // vence 3-nov 15:00 → quedan 19 h
const pendiente = reserva({ id: 'p', referencia: 'PEND', entrada: '2026-11-02T18:00', numPersonas: 3, habitacion: '102' })
const exportada = reserva({ id: 'e', referencia: 'EXPO', entrada: '2026-11-02T10:00', habitacion: '103', exportadaEn: '2026-11-02T12:00:00.000Z', modificadaEn: '2026-11-02T11:00:00.000Z' })
const proxima = reserva({ id: 'x', referencia: 'PROX', entrada: '2026-11-02T00:30', habitacion: '104' }) // vence 3-nov 00:30 → 4 h 30
const vencida = reserva({ id: 'v', referencia: 'VENC', entrada: '2026-10-31T09:00', habitacion: '105', viajeros: [adulto({ nombre: '' })] })

const props = (reservas = [completa, pendiente, exportada], fecha = '2026-11-02') => ({
  reservas,
  fecha,
  ahora,
  onFecha: vi.fn(),
  onAbrir: vi.fn(),
  onNueva: vi.fn(),
})

describe('ListaDia', () => {
  it('muestra las entradas del día con su estado en texto (pendiente / completo / exportado)', () => {
    render(<ListaDia {...props()} />)
    const tabla = screen.getByRole('table', { name: 'Entradas del día' })
    const fila = (ref: string) => within(tabla).getByText(ref === 'COMPLETA' ? '101' : ref === 'PEND' ? '102' : '103').closest('tr') as HTMLElement
    expect(within(fila('COMPLETA')).getByText('Completo')).toBeInTheDocument()
    expect(within(fila('PEND')).getByText('Pendiente')).toBeInTheDocument()
    expect(within(fila('EXPO')).getByText('Exportado')).toBeInTheDocument()
    expect(within(fila('PEND')).getByText('1/3')).toBeInTheDocument()
  })

  it('resumen del día con recuentos', () => {
    render(<ListaDia {...props()} />)
    expect(screen.getByText(/3 entradas · 1 pendientes · 1 completas · 1 exportadas/)).toBeInTheDocument()
  })

  it('aviso de las 24 h: vencidos y próximos a vencer (< 6 h)', () => {
    render(<ListaDia {...props([completa, proxima, vencida], '2026-11-02')} />)
    const aviso = screen.getByText('Aviso de las 24 h').closest('div') as HTMLElement
    expect(within(aviso).getByText(/1 parte sin exportar ha superado el plazo/)).toBeInTheDocument()
    expect(within(aviso).getByText(/1 parte vence en menos de 6 h/)).toBeInTheDocument()
  })

  it('sin avisos si todo está en plazo', () => {
    render(<ListaDia {...props([completa, exportada])} />)
    expect(screen.queryByText('Aviso de las 24 h')).not.toBeInTheDocument()
  })

  it('el plazo se muestra con texto (no solo color): "Quedan…" / "Vencido hace…"', () => {
    render(<ListaDia {...props([completa, proxima, vencida])} />)
    expect(screen.getByText(/Quedan 19 h/)).toBeInTheDocument()
    expect(screen.getByText(/Quedan 4 h 30 min/)).toBeInTheDocument()
    expect(screen.getByText(/Vencido hace/)).toBeInTheDocument()
  })

  it('las pendientes de días anteriores aparecen aparte; las exportadas no', () => {
    const vieja = reserva({ id: 'o', referencia: 'OLD', entrada: '2026-10-30T10:00', exportadaEn: '2026-10-30T12:00:00.000Z', modificadaEn: '2026-10-30T11:00:00.000Z', habitacion: '999' })
    render(<ListaDia {...props([vencida, vieja])} />)
    expect(screen.getByRole('heading', { name: 'Pendientes de días anteriores' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Reservas de días anteriores sin exportar' })).toBeInTheDocument()
    expect(screen.queryByText('999')).not.toBeInTheDocument()
  })

  it('abrir una reserva y crear una nueva', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<ListaDia {...p} />)
    await user.click(screen.getByRole('button', { name: /Abrir reserva PEND/ }))
    expect(p.onAbrir).toHaveBeenCalledWith('p')
    await user.click(screen.getByRole('button', { name: 'Nueva reserva' }))
    expect(p.onNueva).toHaveBeenCalled()
  })

  it('día sin entradas', () => {
    render(<ListaDia {...props([completa], '2026-12-25')} />)
    expect(screen.getByText('No hay entradas previstas este día.')).toBeInTheDocument()
  })

  it('sin violaciones de accesibilidad (axe)', async () => {
    const { container } = render(<ListaDia {...props([completa, pendiente, exportada, proxima, vencida])} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
