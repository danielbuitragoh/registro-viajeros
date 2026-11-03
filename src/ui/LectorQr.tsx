import { useEffect, useId, useRef, useState } from 'react'
import { clasificarLectura, crearDetector as crearDetectorPorDefecto, type Detector, type Lectura } from '../qr/lector'

const INTERVALO_MS = 250

const AVISO_LECTURA: Record<Exclude<Lectura['tipo'], 'codigo'>, string> = {
  enlace: 'Ese QR es el enlace para rellenar la ficha, no el código del huésped. Pide al huésped que termine y te muestre el QR de la pantalla «Listo: entrega este código en recepción».',
  otro: 'Ese QR no es un código de ficha de esta aplicación.',
}

function mensajeErrorCamara(e: unknown): string {
  const nombre = e instanceof DOMException || e instanceof Error ? e.name : ''
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError')
    return 'No se ha podido usar la cámara: el permiso está denegado. Permite la cámara para esta página en los ajustes del navegador, o usa la foto o pega el código.'
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') return 'No se ha encontrado ninguna cámara en este equipo. Usa la foto o pega el código.'
  if (nombre === 'NotReadableError') return 'La cámara está ocupada por otra aplicación. Ciérrala y vuelve a intentarlo.'
  return 'No se ha podido abrir la cámara. Usa la foto o pega el código.'
}

export interface LectorQrProps {
  /** Se llama con un código de ficha (RV1.…) ya validado en su forma. */
  onLeido: (codigo: string) => void | Promise<void>
  /** Solo pruebas: detector a medida. */
  crearDetector?: () => Promise<Detector>
}

/** Lector de QR para importar el código del huésped sin pegarlo: cámara (trasera) o foto. Todo local. */
export function LectorQr({ onLeido, crearDetector = crearDetectorPorDefecto }: LectorQrProps) {
  const [flujo, setFlujo] = useState<MediaStream | null>(null)
  const [estado, setEstado] = useState('')
  const [error, setError] = useState<string>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const idFoto = useId()
  // refs: si el padre se vuelve a pintar, la cámara NO se reinicia
  const onLeidoRef = useRef(onLeido)
  onLeidoRef.current = onLeido
  const crearRef = useRef(crearDetector)
  crearRef.current = crearDetector

  useEffect(() => {
    if (!flujo) return
    const video = videoRef.current as HTMLVideoElement
    video.srcObject = flujo
    void video.play()?.catch(() => undefined)
    let vivo = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let detector: Detector | null = null
    const paso = async () => {
      if (!vivo) return
      try {
        detector ??= await crearRef.current()
        const texto = await detector.detectar(video)
        if (!vivo) return
        if (texto) {
          const l = clasificarLectura(texto)
          if (l.tipo === 'codigo') {
            setEstado('')
            setFlujo(null)
            await onLeidoRef.current(l.codigo)
            return
          }
          setEstado(AVISO_LECTURA[l.tipo])
        }
      } catch {
        /* fotograma aún no disponible: se reintenta */
      }
      if (vivo) timer = setTimeout(paso, INTERVALO_MS)
    }
    timer = setTimeout(paso, 0)
    return () => {
      vivo = false
      clearTimeout(timer)
      flujo.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }, [flujo])

  async function abrirCamara() {
    setError(undefined)
    setEstado('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara aquí (hace falta HTTPS y un navegador actual). Usa la foto o pega el código.')
      return
    }
    try {
      setFlujo(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }))
    } catch (e) {
      setError(mensajeErrorCamara(e))
    }
  }

  async function leerFoto(archivo: File | undefined) {
    setError(undefined)
    setEstado('')
    if (!archivo) return
    try {
      const imagen = await createImageBitmap(archivo)
      const texto = await (await crearRef.current()).detectar(imagen)
      imagen.close?.()
      if (!texto) return setError('No se ha encontrado ningún código QR en la foto. Prueba con una foto más nítida y de cerca.')
      const l = clasificarLectura(texto)
      if (l.tipo === 'codigo') await onLeidoRef.current(l.codigo)
      else setError(AVISO_LECTURA[l.tipo])
    } catch {
      setError('No se ha podido leer la imagen.')
    }
  }

  return (
    <div className="lector-qr">
      {!flujo ? (
        <div className="acciones">
          <button type="button" className="secundario" onClick={abrirCamara}>
            Escanear el QR con la cámara
          </button>
        </div>
      ) : (
        <div className="lector-qr-camara">
          <p>Apunta la cámara al QR del código del huésped. Se importará solo en cuanto se lea.</p>
          <video ref={videoRef} muted playsInline aria-label="Imagen de la cámara" />
          <div className="acciones">
            <button type="button" className="secundario" onClick={() => setFlujo(null)}>
              Cancelar escaneo
            </button>
          </div>
        </div>
      )}
      <p role="status" className="ayuda">
        {estado}
      </p>
      <div className="campo">
        <label htmlFor={idFoto}>Leer el QR de una foto (si no hay cámara)</label>
        <input
          id={idFoto}
          type="file"
          accept="image/*"
          onChange={(e) => {
            void leerFoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mensaje mensaje-error">
          <span aria-hidden="true">✖ </span>
          {error}
        </p>
      )}
    </div>
  )
}
