import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnlaceHuesped } from '../../src/ui/EnlaceHuesped'
import { generarClaveEnlace } from '../../src/huesped/enlace'
import { cifrarFicha } from '../../src/huesped/ficha'
import type { Reserva } from '../../src/domain/tipos'
import { adulto, establecimiento, reserva } from '../fixtures'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('EnlaceHuesped: importar el código escaneando el QR (sin pegarlo)', () => {
  it('al leer el QR con la cámara, las fichas se importan directamente', async () => {
    const user = userEvent.setup()
    const clave = generarClaveEnlace()
    const r = reserva({ id: 'res-esc', viajeros: [], claveEnlace: clave })
    const codigo = await cifrarFicha('res-esc', clave, [adulto({ id: 'g1', nombre: 'Escaneada' })])
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) } })
    const onGuardar = vi.fn(async (_: Reserva) => undefined)

    render(<EnlaceHuesped reserva={r} establecimiento={establecimiento()} onGuardar={onGuardar} crearDetector={async () => ({ tipo: 'local', detectar: async () => codigo })} />)
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))

    await waitFor(() => expect(onGuardar).toHaveBeenCalled())
    expect(onGuardar.mock.calls[0]?.[0].viajeros).toEqual([expect.objectContaining({ id: 'g1', nombre: 'Escaneada', origen: 'huesped' })])
    expect(await screen.findByText(/Se han importado 1 ficha/)).toBeInTheDocument()
  })

  it('un QR de otra reserva no se importa', async () => {
    const user = userEvent.setup()
    const clave = generarClaveEnlace()
    const codigo = await cifrarFicha('OTRA', clave, [adulto()])
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) } })
    const onGuardar = vi.fn(async () => undefined)
    render(<EnlaceHuesped reserva={reserva({ id: 'res-esc', claveEnlace: clave })} establecimiento={establecimiento()} onGuardar={onGuardar} crearDetector={async () => ({ tipo: 'local', detectar: async () => codigo })} />)
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este código pertenece a otra reserva.')
    expect(onGuardar).not.toHaveBeenCalled()
  })
})
