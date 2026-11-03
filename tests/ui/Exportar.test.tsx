import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { Exportar } from '../../src/ui/Exportar'
import { adulto, establecimiento, reserva } from '../fixtures'

const ahora = new Date('2026-11-02T20:00:00')
const buena = reserva({ id: 'ok', referencia: 'BUENA' })
const mala = reserva({ id: 'mal', referencia: 'MALA', viajeros: [adulto({ numeroDocumento: '12345678A' })] })

let clic: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:fake')
  URL.revokeObjectURL = vi.fn()
  clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})
afterEach(() => clic.mockRestore())

const montar = (reservas = [buena, mala], onExportadas = vi.fn().mockResolvedValue(undefined)) => {
  render(<Exportar reservas={reservas} establecimiento={establecimiento()} ahora={ahora} onExportadas={onExportadas} onIrAjustes={vi.fn()} />)
  return onExportadas
}

describe('Exportar', () => {
  it('avisa claramente de que la app NO envía nada al Ministerio', () => {
    montar()
    expect(screen.getByRole('note')).toHaveTextContent(/no envía nada al Ministerio/i)
  })

  it('preselecciona solo las reservas completas', () => {
    montar()
    expect(screen.getByLabelText(/BUENA/)).toBeChecked()
    expect(screen.getByLabelText(/MALA/)).not.toBeChecked()
  })

  it('la reserva de prueba (asistente) no se preselecciona, lleva la marca «Prueba» y, si se incluye, avisa de no subirla', async () => {
    const user = userEvent.setup()
    const prueba = reserva({ id: 'pr', referencia: 'PRUEBA-1', prueba: true })
    montar([buena, prueba])
    const casilla = screen.getByLabelText(/PRUEBA-1/)
    expect(casilla).not.toBeChecked()
    expect(screen.getByText('Prueba', { selector: '.chip' })).toBeInTheDocument()
    await user.click(casilla)
    await user.click(screen.getByRole('button', { name: 'Validar y generar fichero' }))
    expect(await screen.findByText(/incluye la reserva de prueba PRUEBA-1: NO subas este fichero al portal/)).toBeInTheDocument()
  })

  it('el siguiente paso tras descargar es subirlo al portal: lo dice como paso destacado', async () => {
    const user = userEvent.setup()
    montar([buena])
    await user.click(screen.getByRole('button', { name: 'Validar y generar fichero' }))
    await user.click(await screen.findByRole('button', { name: 'Descargar XML' }))
    const paso = (await screen.findByRole('heading', { name: 'Último paso: súbelo tú al portal SES.Hospedajes' })).closest('section') as HTMLElement
    expect(paso).toHaveTextContent(/hasta entonces, la comunicación NO está hecha/)
    expect(paso).toHaveTextContent(/programa de gestión/)
  })

  it('sin reservas: estado vacío que dice qué hacer', () => {
    montar([])
    expect(screen.getByText(/Todavía no hay reservas que exportar/)).toBeInTheDocument()
  })

  it('valida, permite descargar y marca las reservas como exportadas', async () => {
    const user = userEvent.setup()
    const onExportadas = montar()
    await user.click(screen.getByRole('button', { name: 'Validar y generar fichero' }))
    expect(await screen.findByRole('heading', { name: 'Fichero validado' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descargar XML' }))
    expect(clic).toHaveBeenCalled()
    await waitFor(() => expect(onExportadas).toHaveBeenCalledWith(['ok'], ahora.toISOString()))
    expect(await screen.findByText(/la comunicación NO está hecha/)).toBeInTheDocument()
    expect(screen.getByText(/<peticion>/)).toBeInTheDocument()
  })

  it('con una reserva errónea no genera fichero y localiza el error (reserva › viajero › campo)', async () => {
    const user = userEvent.setup()
    const onExportadas = montar()
    await user.click(screen.getByLabelText(/MALA/))
    await user.click(screen.getByRole('button', { name: 'Validar y generar fichero' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/No se puede generar el fichero/)
    expect(alerta).toHaveTextContent(/Reserva MALA › Lucía Prueba/)
    expect(alerta).toHaveTextContent(/debería ser Z/)
    expect(screen.queryByRole('button', { name: 'Descargar XML' })).not.toBeInTheDocument()
    expect(onExportadas).not.toHaveBeenCalled()
  })

  it('reservas de hospedaje: pide titular y NO marca las reservas como exportadas', async () => {
    const user = userEvent.setup()
    montar([buena])
    await user.click(screen.getByLabelText(/Reservas de hospedaje/))
    await user.click(screen.getByRole('button', { name: 'Validar y generar fichero' }))
    expect(await screen.findByText(/Marca un viajero como titular/)).toBeInTheDocument()
  })

  it('sin establecimiento configurado: aviso y botón desactivado', () => {
    render(<Exportar reservas={[buena]} establecimiento={undefined} ahora={ahora} onExportadas={vi.fn()} onIrAjustes={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Falta configurar el establecimiento/)
    expect(screen.getByRole('button', { name: 'Validar y generar fichero' })).toBeDisabled()
  })

  it('sin violaciones de accesibilidad (axe)', { timeout: TIMEOUT_AXE }, async () => {
    const user = userEvent.setup()
    const { container } = render(<Exportar reservas={[buena, mala]} establecimiento={establecimiento()} ahora={ahora} onExportadas={vi.fn()} onIrAjustes={vi.fn()} />)
    await user.click(screen.getByLabelText(/MALA/))
    await user.click(screen.getByRole('button', { name: 'Validar y generar fichero' }))
    await screen.findByRole('alert')
    expect(await axe(container)).toHaveNoViolations()
  })
})
