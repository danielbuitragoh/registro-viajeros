import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Viajero } from '../domain/tipos'
import { cifrarFicha } from '../huesped/ficha'
import type { DatosEnlace, Idioma } from '../huesped/enlace'
import { IDIOMAS, esIdioma, idiomaDelNavegador, t, type ClaveTexto } from '../i18n/textos'
import { edadEn, esFechaValida, soloFecha } from '../validators/fechas'
import { FormularioViajero, viajeroVacio } from './FormularioViajero'
import { Qr } from './Qr'

const MAX_CARACTERES_QR = 1800

function leerBorrador(rid: string): Viajero[] {
  try {
    const s = sessionStorage.getItem(`rv-huesped-${rid}`)
    return s ? (JSON.parse(s) as Viajero[]) : []
  } catch {
    return []
  }
}
function guardarBorrador(rid: string, v: Viajero[]) {
  try {
    sessionStorage.setItem(`rv-huesped-${rid}`, JSON.stringify(v))
  } catch {
    /* sin almacenamiento: el borrador solo vive en memoria */
  }
}

const fechaLarga = (s: string, idioma: Idioma) => {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat(idioma, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

type Pantalla = { tipo: 'inicio' } | { tipo: 'lista' } | { tipo: 'editar'; id: string } | { tipo: 'codigo' }

export function Huesped({ datos }: { datos: DatosEnlace }) {
  const [idioma, setIdioma] = useState<Idioma>(datos.l)
  const [viajeros, setViajeros] = useState<Viajero[]>(() => leerBorrador(datos.rid))
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'inicio' })
  const tr = useCallback((k: ClaveTexto, p?: Record<string, string | number>) => t(idioma, k, p), [idioma])
  const fechaEntrada = soloFecha(datos.ent)

  useEffect(() => {
    document.documentElement.lang = idioma
    document.title = `${tr('app.titulo')} · ${datos.est}`
  }, [idioma, datos.est, tr])

  const actualizar = (v: Viajero[]) => {
    setViajeros(v)
    guardarBorrador(datos.rid, v)
  }

  const esAdulto = (v: Viajero) => esFechaValida(v.fechaNacimiento) && edadEn(v.fechaNacimiento, fechaEntrada) >= 18
  const nombreCompleto = (v: Viajero) => `${v.nombre} ${v.apellido1}`.trim()

  return (
    <>
      <a className="saltar" href="#contenido">
        {tr('comun.saltar')}
      </a>
      <header className="cabecera">
        <p className="marca-app">{tr('app.titulo')}</p>
        <SelectorIdioma idioma={idioma} onCambio={setIdioma} />
      </header>
      <main id="contenido" tabIndex={-1} className="pagina-huesped" lang={idioma}>
        {pantalla.tipo === 'inicio' && (
          <section aria-labelledby="t-inicio">
            <h1 id="t-inicio">{tr('h.bienvenida.titulo')}</h1>
            <p>{tr('h.bienvenida.intro')}</p>
            <div className="tarjeta">
              <h2>{tr('h.bienvenida.reserva', { establecimiento: datos.est })}</h2>
              <p>{tr('h.bienvenida.fechas', { entrada: fechaLarga(datos.ent, idioma), salida: fechaLarga(datos.sal, idioma) })}</p>
              <p>{tr('h.bienvenida.personas', { n: datos.n })}</p>
            </div>
            <div className="tarjeta tarjeta-info">
              <h2>{tr('h.privacidad.titulo')}</h2>
              <p>{tr('h.privacidad.texto')}</p>
            </div>
            <button type="button" className="primario" onClick={() => setPantalla({ tipo: 'lista' })}>
              {tr('h.empezar')}
            </button>
          </section>
        )}

        {pantalla.tipo === 'lista' && (
          <section aria-labelledby="t-lista">
            <h1 id="t-lista">{tr('h.resumen.titulo')}</h1>
            {viajeros.length === 0 ? (
              <p>{tr('h.resumen.vacio')}</p>
            ) : (
              <ul className="lista-tarjetas">
                {viajeros.map((v, i) => (
                  <li key={v.id} className="tarjeta">
                    <p className="nombre-viajero">
                      {i + 1}. {nombreCompleto(v)}
                    </p>
                    <div className="acciones">
                      <button type="button" className="secundario" onClick={() => setPantalla({ tipo: 'editar', id: v.id })}>
                        {tr('h.editar')}
                        <span className="solo-lectores"> {nombreCompleto(v)}</span>
                      </button>
                      <button type="button" className="peligro" onClick={() => actualizar(viajeros.filter((x) => x.id !== v.id))}>
                        {tr('h.quitar')}
                        <span className="solo-lectores"> {nombreCompleto(v)}</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {viajeros.length > 0 && viajeros.length < datos.n && <p className="ayuda">{tr('h.resumen.faltan', { n: viajeros.length, total: datos.n })}</p>}
            <div className="acciones">
              <button type="button" className="secundario" onClick={() => setPantalla({ tipo: 'editar', id: crypto.randomUUID() })}>
                {tr(viajeros.length === 0 ? 'h.anadir_primero' : 'h.anadir')}
              </button>
              <button type="button" className="primario" disabled={viajeros.length === 0} onClick={() => setPantalla({ tipo: 'codigo' })}>
                {tr('h.terminar')}
              </button>
            </div>
          </section>
        )}

        {pantalla.tipo === 'editar' && (
          <EditarViajero
            key={pantalla.id}
            id={pantalla.id}
            idioma={idioma}
            viajeros={viajeros}
            fechaEntrada={fechaEntrada}
            total={datos.n}
            esAdulto={esAdulto}
            onGuardar={(v) => {
              const existe = viajeros.some((x) => x.id === v.id)
              actualizar(existe ? viajeros.map((x) => (x.id === v.id ? v : x)) : [...viajeros, v])
              setPantalla({ tipo: 'lista' })
            }}
            onCancelar={() => setPantalla({ tipo: 'lista' })}
          />
        )}

        {pantalla.tipo === 'codigo' && <Resultado datos={datos} viajeros={viajeros} idioma={idioma} onVolver={() => setPantalla({ tipo: 'lista' })} />}
      </main>
    </>
  )
}

function EditarViajero(props: {
  id: string
  idioma: Idioma
  viajeros: Viajero[]
  fechaEntrada: string
  total: number
  esAdulto: (v: Viajero) => boolean
  onGuardar: (v: Viajero) => void
  onCancelar: () => void
}) {
  const existente = props.viajeros.find((v) => v.id === props.id)
  const numero = existente ? props.viajeros.indexOf(existente) + 1 : props.viajeros.length + 1
  const adultos = useMemo(
    () => props.viajeros.filter((v) => v.id !== props.id && props.esAdulto(v)).map((v) => ({ id: v.id, nombre: `${v.nombre} ${v.apellido1}`.trim() })),
    [props],
  )
  return (
    <FormularioViajero
      inicial={existente ?? { ...viajeroVacio(props.id), origen: 'huesped' }}
      idioma={props.idioma}
      modo="huesped"
      fechaEntrada={props.fechaEntrada}
      adultos={adultos}
      numero={numero}
      direccionCopiable={props.viajeros[0]?.direccion}
      onGuardar={props.onGuardar}
      onCancelar={props.onCancelar}
    />
  )
}

function Resultado({ datos, viajeros, idioma, onVolver }: { datos: DatosEnlace; viajeros: Viajero[]; idioma: Idioma; onVolver: () => void }) {
  const tr = (k: ClaveTexto, p?: Record<string, string | number>) => t(idioma, k, p)
  const [codigo, setCodigo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let vivo = true
    cifrarFicha(datos.rid, datos.k, viajeros)
      .then((c) => vivo && setCodigo(c))
      .catch((e: unknown) => vivo && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      vivo = false
    }
  }, [datos.rid, datos.k, viajeros])

  async function copiar() {
    if (!codigo) return
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
    } catch {
      document.getElementById('codigo-envio')?.focus()
      ;(document.getElementById('codigo-envio') as HTMLTextAreaElement | null)?.select()
    }
  }
  function descargar() {
    if (!codigo) return
    const url = URL.createObjectURL(new Blob([codigo], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `ficha-viajeros-${datos.rid.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <section aria-labelledby="t-codigo">
      <h1 id="t-codigo">{tr('h.resultado.titulo')}</h1>
      <p>{tr('h.resultado.texto')}</p>
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      {codigo && (
        <>
          <div className="campo">
            <label htmlFor="codigo-envio">{tr('h.resultado.codigo')}</label>
            <textarea id="codigo-envio" readOnly rows={5} value={codigo} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className="acciones">
            <button type="button" className="primario" onClick={copiar}>
              {tr('h.resultado.copiar')}
            </button>
            {puedeCompartir && (
              <button type="button" className="secundario" onClick={() => navigator.share({ title: datos.est, text: codigo }).catch(() => undefined)}>
                {tr('h.resultado.compartir')}
              </button>
            )}
            <button type="button" className="secundario" onClick={descargar}>
              {tr('h.resultado.descargar')}
            </button>
          </div>
          <p role="status" className="estado-copia">
            {copiado ? tr('h.resultado.copiado') : ''}
          </p>
          {codigo.length <= MAX_CARACTERES_QR ? <Qr texto={codigo} alt={tr('h.resultado.qr')} nivel="L" /> : <p className="ayuda">{tr('h.resultado.qr_grande')}</p>}
        </>
      )}
      <div className="acciones">
        <button type="button" className="secundario" onClick={onVolver}>
          {tr('h.resultado.modificar')}
        </button>
      </div>
    </section>
  )
}

/** Selector de idioma: cada opción se nombra en su propia lengua y lleva su atributo lang (WCAG 3.1.2). */
function SelectorIdioma({ idioma, onCambio }: { idioma: Idioma; onCambio: (i: Idioma) => void }) {
  return (
    <div className="selector-idioma">
      <label htmlFor="idioma-huesped">
        <span aria-hidden="true">🌐 </span>
        {t(idioma, 'idioma.etiqueta')}
        {idioma !== 'en' && <span lang="en"> / Language</span>}
      </label>
      <select id="idioma-huesped" value={idioma} onChange={(e) => esIdioma(e.target.value) && onCambio(e.target.value)}>
        {IDIOMAS.map((l) => (
          <option key={l} value={l} lang={l}>
            {t(l, 'idioma.nombre')}
          </option>
        ))}
      </select>
    </div>
  )
}

export function EnlaceInvalido() {
  const idioma = idiomaDelNavegador()
  return (
    <main className="pagina-huesped" id="contenido" lang={idioma}>
      <h1>{t(idioma, 'h.enlace_invalido.titulo')}</h1>
      <p>{t(idioma, 'h.enlace_invalido.texto')}</p>
    </main>
  )
}
