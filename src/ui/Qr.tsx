import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

/** QR generado localmente como SVG (sin red, sin canvas). */
export function Qr({ texto, alt, nivel = 'M' }: { texto: string; alt: string; nivel?: 'L' | 'M' | 'Q' }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)
  useEffect(() => {
    let vivo = true
    QRCode.toString(texto, { type: 'svg', errorCorrectionLevel: nivel, margin: 2 })
      .then((s) => vivo && setSvg(s))
      .catch(() => vivo && setFallo(true))
    return () => {
      vivo = false
    }
  }, [texto, nivel])
  if (fallo) return null
  return <div className="qr" role="img" aria-label={alt} dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
}
