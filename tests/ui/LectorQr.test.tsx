import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { LectorQr } from '../../src/ui/LectorQr'
import type { Detector } from '../../src/qr/lector'

const pista = () => ({ stop: vi.fn() })
let pistas: ReturnType<typeof pista>[] = []
const flujo = () => {
  pistas = [pista()]
  return { getTracks: () => pistas } as unknown as MediaStream
}
const detectorQueDevuelve = (...lecturas: (string | null)[]): (() => Promise<Detector>) => {
  const detectar = vi.fn(async () => (lecturas.length > 1 ? lecturas.shift() ?? null : lecturas[0] ?? null))
  return async () => ({ tipo: 'local', detectar })
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const camara = (getUserMedia: () => Promise<MediaStream>) => vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: vi.fn(getUserMedia) } })

describe('LectorQr (recepción)', () => {
  it('escanea con la cámara trasera, entrega el código y apaga la cámara', async () => {
    const user = userEvent.setup()
    camara(async () => flujo())
    const onLeido = vi.fn()
    render(<LectorQr onLeido={onLeido} crearDetector={detectorQueDevuelve(null, null, 'RV1.codigo-leido')} />)
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: expect.objectContaining({ facingMode: 'environment' }) }))
    expect(await screen.findByText(/Apunta la cámara al QR/)).toBeInTheDocument()
    await waitFor(() => expect(onLeido).toHaveBeenCalledWith('RV1.codigo-leido'))
    expect(pistas[0]?.stop).toHaveBeenCalled()
    expect(screen.queryByText(/Apunta la cámara al QR/)).not.toBeInTheDocument()
  })

  it('si lee el QR del ENLACE (no el del código), lo explica y sigue buscando', async () => {
    const user = userEvent.setup()
    camara(async () => flujo())
    const onLeido = vi.fn()
    render(<LectorQr onLeido={onLeido} crearDetector={detectorQueDevuelve('https://x.test/#/huesped/abc', 'RV1.bueno')} />)
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))
    expect(await screen.findByText(/Ese QR es el enlace para rellenar la ficha/)).toBeInTheDocument()
    await waitFor(() => expect(onLeido).toHaveBeenCalledWith('RV1.bueno'))
    expect(onLeido).toHaveBeenCalledTimes(1)
  })

  it('permiso de cámara denegado: mensaje claro y la alternativa de la foto sigue disponible', async () => {
    const user = userEvent.setup()
    camara(async () => {
      throw new DOMException('denegado', 'NotAllowedError')
    })
    render(<LectorQr onLeido={vi.fn()} crearDetector={detectorQueDevuelve(null)} />)
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/permiso/)
    expect(screen.getByLabelText(/Leer el QR de una foto/)).toBeInTheDocument()
  })

  it('sin cámara en el equipo (o sin HTTPS): lo dice en lugar de fallar en silencio', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: undefined })
    render(<LectorQr onLeido={vi.fn()} crearDetector={detectorQueDevuelve(null)} />)
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no permite usar la cámara/)
  })

  it('cancelar apaga la cámara', async () => {
    const user = userEvent.setup()
    camara(async () => flujo())
    render(<LectorQr onLeido={vi.fn()} crearDetector={detectorQueDevuelve(null)} />)
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar escaneo' }))
    expect(pistas[0]?.stop).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Escanear el QR con la cámara' })).toBeInTheDocument()
  })

  it('lee el QR desde una foto', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ close: vi.fn() }))
    const onLeido = vi.fn()
    render(<LectorQr onLeido={onLeido} crearDetector={detectorQueDevuelve('RV1.desde-foto')} />)
    fireEvent.change(screen.getByLabelText(/Leer el QR de una foto/), { target: { files: [new File(['x'], 'qr.png', { type: 'image/png' })] } })
    await waitFor(() => expect(onLeido).toHaveBeenCalledWith('RV1.desde-foto'))
  })

  it('foto sin QR: lo dice', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ close: vi.fn() }))
    render(<LectorQr onLeido={vi.fn()} crearDetector={detectorQueDevuelve(null)} />)
    fireEvent.change(screen.getByLabelText(/Leer el QR de una foto/), { target: { files: [new File(['x'], 'qr.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se ha encontrado ningún código QR/)
  })

  it('sin violaciones de accesibilidad (axe), también con la cámara abierta', { timeout: TIMEOUT_AXE }, async () => {
    const user = userEvent.setup()
    camara(async () => flujo())
    const { container } = render(<LectorQr onLeido={vi.fn()} crearDetector={detectorQueDevuelve(null)} />)
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole('button', { name: 'Escanear el QR con la cámara' }))
    await screen.findByText(/Apunta la cámara al QR/)
    expect(await axe(container)).toHaveNoViolations()
  })
})
