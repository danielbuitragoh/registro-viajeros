import { useState } from 'react'
import type { Establecimiento, Reserva, Viajero } from '../domain/tipos'
import { codificarEnlace, crearDatosEnlace, generarClaveEnlace, type Idioma } from '../huesped/enlace'
import { descifrarFicha, reservaDeCodigo } from '../huesped/ficha'
import { Qr } from './Qr'
import { LectorQr } from './LectorQr'
import type { Detector } from '../qr/lector'
import { Selector } from './campos'
import { IDIOMAS, t } from '../i18n/textos'

export interface EnlaceHuespedProps {
  reserva: Reserva
  establecimiento: Establecimiento
  onGuardar: (r: Reserva) => Promise<void>
  /** Solo pruebas: detector de QR a medida. */
  crearDetector?: () => Promise<Detector>
}

export function EnlaceHuesped({ reserva, establecimiento, onGuardar, crearDetector }: EnlaceHuespedProps) {
  const [idioma, setIdioma] = useState<Idioma>('es')
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string }>()
  const [copiado, setCopiado] = useState(false)

  const base = `${window.location.origin}${window.location.pathname}`
  const url = reserva.claveEnlace ? codificarEnlace(crearDatosEnlace(establecimiento, reserva, reserva.claveEnlace, idioma), base) : undefined

  async function crear() {
    await onGuardar({ ...reserva, claveEnlace: generarClaveEnlace(), modificadaEn: new Date().toISOString() })
  }

  async function importar(leido?: string) {
    setMensaje(undefined)
    try {
      if (!reserva.claveEnlace) throw new Error('Primero crea el enlace de esta reserva.')
      const texto = (leido ?? codigo).trim()
      const rid = reservaDeCodigo(texto)
      if (rid !== reserva.id) throw new Error('Este código pertenece a otra reserva.')
      const nuevos = await descifrarFicha(texto, reserva.claveEnlace, reserva.id)
      const porId = new Map<string, Viajero>(reserva.viajeros.map((v) => [v.id, v]))
      for (const v of nuevos) porId.set(v.id, v)
      await onGuardar({ ...reserva, viajeros: [...porId.values()], modificadaEn: new Date().toISOString() })
      setCodigo('')
      setMensaje({ tipo: 'ok', texto: `Se han importado ${nuevos.length} ${nuevos.length === 1 ? 'ficha' : 'fichas'}. Revisa los avisos de cada viajero (p. ej. el código INE del municipio).` })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <section aria-labelledby="t-enlace">
      <h2 id="t-enlace">Ficha rellenada por el huésped</h2>
      <p className="ayuda">
        El enlace no contiene datos personales y no pasa por ningún servidor. El huésped rellena su ficha en su móvil y te entrega un <strong>código cifrado</strong> que importas aquí.
      </p>
      {!url ? (
        <button type="button" className="secundario" onClick={crear}>
          Crear enlace para el huésped
        </button>
      ) : (
        <>
          <Selector id="idioma-enlace" etiqueta="Idioma inicial del formulario" valor={idioma} onCambio={(v) => setIdioma(v as Idioma)} opciones={IDIOMAS.map((l) => ({ valor: l, texto: t(l, 'idioma.nombre') }))} />
          <div className="campo">
            <label htmlFor="url-enlace">Enlace para el huésped</label>
            <textarea id="url-enlace" readOnly rows={3} value={url} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className="acciones">
            <button
              type="button"
              className="secundario"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  setCopiado(true)
                } catch {
                  document.getElementById('url-enlace')?.focus()
                }
              }}
            >
              Copiar enlace
            </button>
          </div>
          <p role="status" className="estado-copia">
            {copiado ? 'Enlace copiado' : ''}
          </p>
          <Qr texto={url} alt={`Código QR del enlace de la reserva ${reserva.referencia}`} nivel="M" />
        </>
      )}

      <h3>Importar el código del huésped</h3>
      <p className="ayuda">Escanea el QR que te enseña el huésped o pega el código que te ha enviado.</p>
      <LectorQr onLeido={(c) => importar(c)} crearDetector={crearDetector} />
      <div className="campo">
        <label htmlFor="codigo-importar">Código de envío (empieza por RV1.)</label>
        <textarea id="codigo-importar" rows={4} value={codigo} onChange={(e) => setCodigo(e.target.value)} spellCheck={false} autoComplete="off" />
      </div>
      <div className="acciones">
        <button type="button" className="secundario" onClick={() => importar()} disabled={codigo.trim() === ''}>
          Importar fichas
        </button>
      </div>
      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={`mensaje ${mensaje.tipo === 'error' ? 'mensaje-error' : 'mensaje-ok'}`}>
          <span aria-hidden="true">{mensaje.tipo === 'error' ? '✖ ' : '✔ '}</span>
          {mensaje.texto}
        </p>
      )}
    </section>
  )
}
