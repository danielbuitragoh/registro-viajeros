import { writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

/**
 * Vídeo Y4M (formato que Chromium acepta como cámara falsa) que muestra un QR con el texto dado.
 * Así la prueba usa la cámara «de verdad»: getUserMedia → <video> → lector de la app.
 */
export function videoConQr(texto: string, ruta: string, ancho = 640, alto = 480): string {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: 'L' })
  const zona = modules.size + 8 // margen silencioso de 4 módulos
  const escala = Math.floor((Math.min(ancho, alto) - 20) / zona)
  const x0 = Math.floor((ancho - zona * escala) / 2)
  const y0 = Math.floor((alto - zona * escala) / 2)
  const luma = Buffer.alloc(ancho * alto, 200) // fondo gris claro
  for (let y = 0; y < zona * escala; y++)
    for (let x = 0; x < zona * escala; x++) {
      const my = Math.floor(y / escala) - 4
      const mx = Math.floor(x / escala) - 4
      const negro = my >= 0 && mx >= 0 && my < modules.size && mx < modules.size && modules.get(my, mx)
      luma[(y0 + y) * ancho + x0 + x] = negro ? 16 : 235
    }
  const croma = Buffer.alloc((ancho / 2) * (alto / 2) * 2, 128)
  const cuadro = Buffer.concat([Buffer.from('FRAME\n'), luma, croma])
  const cabecera = Buffer.from(`YUV4MPEG2 W${ancho} H${alto} F10:1 Ip A1:1 C420jpeg\n`)
  writeFileSync(ruta, Buffer.concat([cabecera, ...Array.from({ length: 10 }, () => cuadro)]))
  return ruta
}
