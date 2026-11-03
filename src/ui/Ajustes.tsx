import { useMemo, useRef, useState } from 'react'
import type { Establecimiento, Incidencia } from '../domain/tipos'
import { ANIOS_CONSERVACION, DIAS_AVISO_PURGA, fechaPurga } from '../domain/plazos'
import { TIPO_ESTABLECIMIENTO } from '../oficial/codigos'
import { alfa3Espana, paisesOrdenados } from '../oficial/paises'
import { etiquetaCampo, mensajeIncidencia } from '../i18n/mensajes'
import { validarEstablecimiento } from '../exportador'
import { validarDireccion } from '../validators/direccion'
import { validarCIF, validarDNI, validarNIE } from '../validators/documentos'
import { exportarCopia, importarCopia } from '../storage/copia'
import { LONGITUD_MINIMA_PASSWORD } from '../storage/almacen'
import { useApp } from '../app/AppContext'
import { Entrada, Grupo, Selector } from './campos'
import { CampoMunicipio } from './CampoMunicipio'
import { useRelacionesIne } from '../ine/useIne'
import { fechaLegible } from '../ine/relacion'
import { fechaCorta } from './formato'
import { Icono, type NombreIcono } from './Icono'
import { Migas } from './Migas'
import { Pista } from './Pista'
import { aplicarTema, leerTema, type Tema } from '../diseno/tema'
import { COPIA_POR_DEFECTO, FRECUENCIAS_COPIA } from '../domain/preferencias'

const vacio = (s: string | undefined) => s === undefined || s.trim() === ''

export function validarAjustesEstablecimiento(e: Establecimiento): Incidencia[] {
  const out: Incidencia[] = []
  if (vacio(e.nombre)) out.push({ campo: 'nombre_establecimiento', codigo: 'requerido', gravedad: 'error' })
  else if (e.nombre.length > 50) out.push({ campo: 'nombre_establecimiento', codigo: 'longitud_max', gravedad: 'error', params: { max: 50 } })
  // El código de establecimiento no es obligatorio aquí (hace falta para exportar partes; se valida allí).
  if (!vacio(e.codigoEstablecimiento)) out.push(...validarEstablecimiento({ ...e }, 'partes').filter((i) => i.campo === 'codigoEstablecimiento'))
  if (!vacio(e.nifCif)) {
    const v = e.nifCif as string
    if (!(validarCIF(v).ok || validarDNI(v).ok || validarNIE(v).ok)) out.push({ campo: 'nifCif', codigo: 'cif_invalido', gravedad: 'error' })
  }
  const d = e.direccion
  if (d && [d.direccion, d.codigoPostal, d.codigoMunicipio, d.nombreMunicipio].some((x) => !vacio(x))) {
    for (const i of validarDireccion(d)) out.push({ ...i, campo: `direccion.${i.campo}` })
  }
  return out
}

function descargarTexto(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export type SeccionAjustes = 'establecimiento' | 'copias' | 'apariencia' | 'seguridad' | 'conservacion' | 'borrar'

const APARTADOS: { ruta: string; titulo: string; texto: string; icono: NombreIcono }[] = [
  { ruta: '/ajustes/establecimiento', titulo: 'Establecimiento', texto: 'Nombre, tipo, código de SES.Hospedajes y dirección.', icono: 'inicio' },
  { ruta: '/ajustes/copias', titulo: 'Copia de seguridad', texto: 'Descargar o restaurar una copia cifrada, y el recordatorio.', icono: 'copia' },
  { ruta: '/primeros-pasos', titulo: 'Primeros pasos', texto: 'El asistente de 6 pasos, con una reserva de prueba.', icono: 'bandera' },
  { ruta: '/ajustes/apariencia', titulo: 'Apariencia', texto: 'Tema claro u oscuro.', icono: 'tema' },
  { ruta: '/ajustes/seguridad', titulo: 'Seguridad', texto: 'Bloqueo automático y cambio de contraseña.', icono: 'candado' },
  { ruta: '/ajustes/conservacion', titulo: 'Conservación y purga', texto: 'Los datos se borran solos a los 3 años de la salida.', icono: 'hoy' },
  { ruta: '/ajustes/borrar', titulo: 'Borrar todos los datos', texto: 'Eliminar todo de este dispositivo.', icono: 'papelera' },
]

const TITULOS: Record<SeccionAjustes, string> = {
  establecimiento: 'Establecimiento',
  copias: 'Copia de seguridad',
  apariencia: 'Apariencia',
  seguridad: 'Seguridad',
  conservacion: 'Conservación y purga',
  borrar: 'Borrar todos los datos',
}

export const esSeccionAjustes = (s: string | undefined): s is SeccionAjustes => !!s && s in TITULOS

/** Ajustes: un índice y una subpágina por apartado (antes era una sola página muy larga). */
export function Ajustes({ seccion }: { seccion?: SeccionAjustes }) {
  const app = useApp()
  if (!seccion) {
    return (
      <section aria-labelledby="t-ajustes">
        <h1 id="t-ajustes">Ajustes</h1>
        <ul className="indice" aria-label="Apartados de Ajustes">
          {APARTADOS.filter((a) => a.ruta !== '/ajustes/borrar' || app.fase === 'listo').map((a) => (
            <li key={a.ruta}>
              <a href={`#${a.ruta}`}>
                <Icono nombre={a.icono} />
                <span>
                  <strong>{a.titulo}</strong>
                  <span className="ayuda">{a.texto}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Acerca />
      </section>
    )
  }
  return (
    <section aria-labelledby="t-seccion">
      <Migas items={[{ texto: 'Ajustes', ruta: '/ajustes' }, { texto: TITULOS[seccion] }]} />
      <h1 id="t-seccion">{TITULOS[seccion]}</h1>
      {seccion === 'establecimiento' && <FormEstablecimiento />}
      {seccion === 'copias' && <Copias />}
      {seccion === 'apariencia' && <Apariencia />}
      {seccion === 'seguridad' && <Seguridad />}
      {seccion === 'conservacion' && <Conservacion />}
      {seccion === 'borrar' && <ZonaPeligro />}
    </section>
  )
}

function Apariencia() {
  const [tema, setTema] = useState<Tema>(leerTema)
  const opciones: { valor: Tema; texto: string }[] = [
    { valor: 'auto', texto: 'Automático (como el sistema del dispositivo)' },
    { valor: 'claro', texto: 'Claro' },
    { valor: 'oscuro', texto: 'Oscuro' },
  ]
  return (
    <fieldset>
      <legend>Tema de color</legend>
      <p className="ayuda">Se recuerda en este navegador. El oscuro cansa menos la vista de noche; los dos cumplen el contraste AA.</p>
      {opciones.map((o) => (
        <div key={o.valor} className="campo campo-check">
          <input
            id={`tema-${o.valor}`}
            type="radio"
            name="tema"
            checked={tema === o.valor}
            onChange={() => {
              aplicarTema(o.valor)
              setTema(o.valor)
            }}
          />
          <label htmlFor={`tema-${o.valor}`}>{o.texto}</label>
        </div>
      ))}
    </fieldset>
  )
}

function FormEstablecimiento() {
  const app = useApp()
  const [e, setE] = useState<Establecimiento>(
    app.establecimiento ?? { codigoEstablecimiento: '', nombre: '', tipo: 'HOSTAL', direccion: { direccion: '', codigoPostal: '', pais: alfa3Espana } },
  )
  const [intentado, setIntentado] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const inc = useMemo(() => validarAjustesEstablecimiento(e), [e])
  const error = (c: string) => {
    const i = inc.find((x) => x.campo === c)
    return intentado && i ? mensajeIncidencia(i, 'es') : undefined
  }
  const d = e.direccion ?? { direccion: '', codigoPostal: '', pais: alfa3Espana }
  const setD = (k: keyof typeof d, v: string) => setE({ ...e, direccion: { ...d, [k]: v } })
  const ine = useRelacionesIne(d.pais === alfa3Espana)
  const codigoIne = d.codigoMunicipio?.trim() ?? ''
  const estadoIne = ine.consulta?.(codigoIne)
  const ayudaIne =
    estadoIne?.tipo === 'vigente'
      ? `Código ${codigoIne}: ${estadoIne.municipio.nombre} (relación del INE a ${fechaLegible(estadoIne.fecha)}).`
      : estadoIne?.tipo === 'baja'
        ? `⚠ ${codigoIne} (${estadoIne.municipio.nombre}) figuraba en la relación del INE a ${fechaLegible(estadoIne.fechaAnterior)}, pero ya no en la de ${fechaLegible(estadoIne.fecha)}: busca el municipio actual.`
        : estadoIne?.tipo === 'no_figura'
          ? `⚠ ${codigoIne} no figura en la relación de municipios del INE a ${fechaLegible(estadoIne.fecha)}. Compruébalo.`
          : ine.relaciones?.length === 0
            ? '5 dígitos. Esta versión no incluye la relación de municipios del INE: escríbelo a mano.'
            : '5 dígitos.'
  const paises = useMemo(() => paisesOrdenados('es').map((p) => ({ valor: p.alfa3, texto: p.nombre })), [])

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault()
    setIntentado(true)
    setGuardado(false)
    if (inc.some((i) => i.gravedad === 'error')) return
    await app.guardarEstablecimiento(e)
    setGuardado(true)
  }

  return (
    <form onSubmit={guardar} noValidate aria-label="Datos del establecimiento">
      <Grupo leyenda="Identificación">
        <Entrada id="e-nombre" etiqueta={etiquetaCampo('nombre_establecimiento', 'es')} valor={e.nombre} onCambio={(v) => setE({ ...e, nombre: v })} error={error('nombre_establecimiento')} obligatorio />
        <Selector id="e-tipo" etiqueta={etiquetaCampo('tipo', 'es')} valor={e.tipo} onCambio={(v) => setE({ ...e, tipo: v as Establecimiento['tipo'] })} opciones={Object.entries(TIPO_ESTABLECIMIENTO).map(([k, x]) => ({ valor: k, texto: x.es }))} />
        <Entrada
          id="e-codigo"
          etiqueta="Código de establecimiento"
          valor={e.codigoEstablecimiento}
          onCambio={(v) => setE({ ...e, codigoEstablecimiento: v })}
          error={error('codigoEstablecimiento')}
          ayuda="Lo asigna el Sistema de Hospedajes al registrar el establecimiento (máx. 10 caracteres). Necesario para exportar partes de viajeros."
          maxLength={10}
          mayusculas
          marca="si aún no lo tienes, déjalo en blanco"
          pista={<PistaCodigoEstablecimiento />}
        />
        <Entrada id="e-arrendador" etiqueta="Código de arrendador" valor={e.codigoArrendador ?? ''} onCambio={(v) => setE({ ...e, codigoArrendador: v || undefined })} marca="opcional" ayuda="Solo para tu referencia: el documento oficial no incluye este campo, así que no se exporta." pista={<Pista titulo="¿Qué es el código de arrendador?"><p>Algunas comunidades o plataformas lo usan, pero el documento oficial del fichero <strong>no lo incluye</strong> (solo pide el código de establecimiento). Si no sabes qué es, déjalo en blanco: no afecta al fichero.</p></Pista>} />
        <Entrada id="e-nif" etiqueta="NIF/CIF del titular" valor={e.nifCif ?? ''} onCambio={(v) => setE({ ...e, nifCif: v || undefined })} error={error('nifCif')} marca="opcional" ayuda="Solo informativo: se comprueba la letra o dígito de control, pero no se exporta." mayusculas maxLength={12} />
      </Grupo>
      <Grupo leyenda="Dirección del establecimiento" ayuda="Se usa solo en reservas de hospedaje cuando no se informa el código de establecimiento.">
        <Selector id="e-pais" etiqueta="País" valor={d.pais} onCambio={(v) => setD('pais', v)} opciones={paises} vacio="Elige una opción" error={error('direccion.pais')} />
        <Entrada id="e-dir" etiqueta="Dirección" valor={d.direccion} onCambio={(v) => setD('direccion', v)} error={error('direccion.direccion')} autoComplete="street-address" />
        <Entrada id="e-cp" etiqueta="Código postal" valor={d.codigoPostal} onCambio={(v) => setD('codigoPostal', v)} error={error('direccion.codigoPostal')} autoComplete="postal-code" />
        {d.pais === alfa3Espana ? (
          <>
            {ine.activa && (
              <CampoMunicipio
                id="e-mun-es"
                etiqueta="Nombre del municipio"
                idioma="es"
                valor={d.nombreMunicipio ?? ''}
                onCambio={(v) => setD('nombreMunicipio', v)}
                onElegir={(m) => setE((x) => ({ ...x, direccion: { ...(x.direccion ?? d), nombreMunicipio: m.nombre, codigoMunicipio: m.codigo } }))}
                relacion={ine.activa}
                provincia={/^\d{5}$/.test(d.codigoPostal.trim()) ? d.codigoPostal.trim().slice(0, 2) : undefined}
                ayuda={`Escribe el nombre y elige el municipio en la lista: el código INE se rellena solo.${ine.activa.ficticia ? ' Demo: relación de municipios FICTICIA, no son códigos reales.' : ''}`}
                marca="opcional"
              />
            )}
            <Entrada id="e-ine" etiqueta="Código INE del municipio" valor={d.codigoMunicipio ?? ''} onCambio={(v) => setD('codigoMunicipio', v)} error={error('direccion.codigoMunicipio')} inputMode="numeric" maxLength={5} ayuda={ayudaIne} />
          </>
        ) : (
          <Entrada id="e-mun" etiqueta="Municipio o ciudad" valor={d.nombreMunicipio ?? ''} onCambio={(v) => setD('nombreMunicipio', v)} error={error('direccion.nombreMunicipio')} />
        )}
      </Grupo>
      <div className="acciones">
        <button type="submit" className="primario">
          Guardar establecimiento
        </button>
      </div>
      {guardado && (
        <p role="status" className="mensaje mensaje-ok">
          <span aria-hidden="true">✔ </span>Establecimiento guardado.
        </p>
      )}
    </form>
  )
}

/** De dónde sale el código de establecimiento y qué hacer si aún no se tiene (§3 y §4 del documento oficial). */
export function PistaCodigoEstablecimiento() {
  return (
    <Pista titulo="¿De dónde sale este código? ¿Y si aún no lo tengo?">
      <p>
        Es el código que el Sistema de Hospedajes asigna a tu establecimiento <strong>«en el momento del registro»</strong> (documento oficial, §3). Te lo da el propio sistema al dar de alta el establecimiento en SES.Hospedajes.
      </p>
      <p>
        <strong>Si aún no lo tienes:</strong> déjalo en blanco y sigue; podrás crear reservas y recibir las fichas de los huéspedes. Añádelo aquí cuando lo tengas: sin él no se puede generar el fichero de <strong>partes de viajeros</strong> (§3). El de <strong>reservas de hospedaje</strong> admite en su lugar el nombre, tipo y dirección del establecimiento (§4).
      </p>
    </Pista>
  )
}

function Seguridad() {
  const app = useApp()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repite, setRepite] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string }>()

  async function cambiar(ev: React.FormEvent) {
    ev.preventDefault()
    setMsg(undefined)
    if (nueva.length < LONGITUD_MINIMA_PASSWORD) return setMsg({ ok: false, texto: `La nueva contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.` })
    if (nueva !== repite) return setMsg({ ok: false, texto: 'Las contraseñas nuevas no coinciden.' })
    try {
      await app.almacen?.cambiarPassword(actual, nueva)
      setActual('')
      setNueva('')
      setRepite('')
      setMsg({ ok: true, texto: 'Contraseña cambiada: todos los datos se han vuelto a cifrar.' })
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : String(e) })
    }
  }
  return (
    <form onSubmit={cambiar} noValidate aria-label="Seguridad">
      <p className="ayuda">El registro se bloquea solo tras 15 minutos sin actividad.</p>
      <div className="acciones">
        <button type="button" className="secundario" onClick={app.bloquear}>
          Bloquear ahora
        </button>
      </div>
      <Grupo leyenda="Cambiar la contraseña del establecimiento">
        <Entrada id="p-actual" tipo="password" etiqueta="Contraseña actual" valor={actual} onCambio={setActual} autoComplete="current-password" />
        <Entrada id="p-nueva" tipo="password" etiqueta="Contraseña nueva" valor={nueva} onCambio={setNueva} autoComplete="new-password" />
        <Entrada id="p-repite" tipo="password" etiqueta="Repite la contraseña nueva" valor={repite} onCambio={setRepite} autoComplete="new-password" />
      </Grupo>
      <div className="acciones">
        <button type="submit" className="secundario">
          Cambiar contraseña
        </button>
      </div>
      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`mensaje ${msg.ok ? 'mensaje-ok' : 'mensaje-error'}`}>
          <span aria-hidden="true">{msg.ok ? '✔ ' : '✖ '}</span>
          {msg.texto}
        </p>
      )}
    </form>
  )
}

/** Descargar una copia cifrada; anota la fecha para el recordatorio de «Hoy». */
export function DescargarCopia() {
  const app = useApp()
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string }>()
  async function exportar(ev: React.FormEvent) {
    ev.preventDefault()
    setMsg(undefined)
    try {
      const json = await exportarCopia(app.almacen as NonNullable<typeof app.almacen>, pass)
      descargarTexto(`copia-registro-viajeros_${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json')
      await app.guardarPreferencias({ ...app.preferencias, copias: { ...COPIA_POR_DEFECTO, ...app.preferencias.copias, ultima: new Date().toISOString() } })
      setMsg({ ok: true, texto: 'Copia cifrada descargada. Guárdala fuera de este equipo (memoria USB, otro ordenador…) y no pierdas su contraseña.' })
      setPass('')
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : String(e) })
    }
  }
  const ultima = app.preferencias.copias?.ultima
  return (
    <form onSubmit={exportar} noValidate>
      <Grupo leyenda="Crear copia" ayuda="Un fichero cifrado con AES-GCM. Sin su contraseña es ilegible; puede ser distinta de la del establecimiento.">
        <p className="ayuda">{ultima ? `Última copia en este dispositivo: ${fechaCorta(ultima)}.` : 'Todavía no has hecho ninguna copia en este dispositivo.'}</p>
        <Entrada id="c-pass-exp" tipo="password" etiqueta="Contraseña de la copia" valor={pass} onCambio={setPass} autoComplete="new-password" />
      </Grupo>
      <div className="acciones">
        <button type="submit" className="primario">
          <Icono nombre="copia" />
          Descargar copia
        </button>
      </div>
      <Mensaje msg={msg} />
    </form>
  )
}

/** Cada cuánto recordar la copia en «Hoy». */
export function FrecuenciaCopia() {
  const app = useApp()
  const copias = { ...COPIA_POR_DEFECTO, ...app.preferencias.copias }
  return (
    <Selector
      id="c-frecuencia"
      etiqueta="Recordarme hacer una copia"
      valor={String(copias.cadaDias)}
      onCambio={(v) => void app.guardarPreferencias({ ...app.preferencias, copias: { ...copias, cadaDias: Number(v) } })}
      opciones={FRECUENCIAS_COPIA.map((f) => ({ valor: String(f.dias), texto: f.texto }))}
      ayuda="El aviso sale en «Hoy». Sin notificaciones ni servidores: solo lo ves al abrir la app."
    />
  )
}

function Mensaje({ msg }: { msg?: { ok: boolean; texto: string } }) {
  if (!msg) return null
  return (
    <p role={msg.ok ? 'status' : 'alert'} className={`mensaje ${msg.ok ? 'mensaje-ok' : 'mensaje-error'}`}>
      <span aria-hidden="true">{msg.ok ? '✔ ' : '✖ '}</span>
      {msg.texto}
    </p>
  )
}

function Copias() {
  const app = useApp()
  const [passImp, setPassImp] = useState('')
  const [modo, setModo] = useState<'fusionar' | 'reemplazar'>('fusionar')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string }>()
  const fichero = useRef<HTMLInputElement>(null)

  async function importar(ev: React.FormEvent) {
    ev.preventDefault()
    setMsg(undefined)
    const f = fichero.current?.files?.[0]
    if (!f) return setMsg({ ok: false, texto: 'Elige primero el fichero de la copia.' })
    try {
      const r = await importarCopia(app.almacen as NonNullable<typeof app.almacen>, await f.text(), passImp, modo)
      await app.recargar()
      setMsg({ ok: true, texto: `Copia restaurada: ${r.reservas} ${r.reservas === 1 ? 'reserva' : 'reservas'}${r.configuracion ? ' y configuración del establecimiento' : ''}.` })
      setPassImp('')
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : String(e) })
    }
  }
  return (
    <div>
      <p>Los datos solo viven en este dispositivo. Haz una copia al menos una vez por semana y guárdala fuera de él: es la única forma de recuperarlos si el equipo se estropea o se pierde, o de pasarlos a otro.</p>
      <DescargarCopia />
      <FrecuenciaCopia />
      <form onSubmit={importar} noValidate>
        <Grupo leyenda="Restaurar copia" ayuda="Por ejemplo, al cambiar de ordenador: restaura aquí la copia que descargaste en el antiguo.">
          <div className="campo">
            <label htmlFor="c-fichero">Fichero de la copia</label>
            <input id="c-fichero" type="file" accept="application/json,.json" ref={fichero} />
          </div>
          <Entrada id="c-pass-imp" tipo="password" etiqueta="Contraseña de la copia que restauras" valor={passImp} onCambio={setPassImp} autoComplete="current-password" />
          <Selector id="c-modo" etiqueta="Qué hacer con los datos actuales" valor={modo} onCambio={(v) => setModo(v as typeof modo)} opciones={[{ valor: 'fusionar', texto: 'Fusionar (gana la versión más reciente de cada reserva)' }, { valor: 'reemplazar', texto: 'Reemplazar todo por el contenido de la copia' }]} />
        </Grupo>
        <div className="acciones">
          <button type="submit" className="secundario">
            Restaurar copia
          </button>
        </div>
        <Mensaje msg={msg} />
      </form>
    </div>
  )
}

function Conservacion() {
  const app = useApp()
  const [msg, setMsg] = useState<string>()
  const p = app.purga
  return (
    <div>
      <p>
        Los datos de cada reserva se conservan <strong>{ANIOS_CONSERVACION} años desde la fecha de salida</strong> y después se eliminan automáticamente al desbloquear la aplicación. Se avisa {DIAS_AVISO_PURGA} días antes.
      </p>
      {p && p.conAviso.length > 0 && (
        <div className="aviso-plazo aviso-plazo-proximo" role="status">
          <strong>
            <span aria-hidden="true">⚠ </span>Próximas purgas
          </strong>
          <ul>
            {p.conAviso.map((r) => (
              <li key={r.id}>
                Reserva {r.referencia}: se eliminará el {fechaCorta(fechaPurga(r.salida))}.
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="acciones">
        <button
          type="button"
          className="secundario"
          onClick={async () => {
            const r = await app.purgarAhora()
            setMsg(r.eliminadas.length === 0 ? 'No hay reservas con 3 años cumplidos.' : `Se han eliminado ${r.eliminadas.length} reservas con 3 años cumplidos.`)
          }}
        >
          Ejecutar purga ahora
        </button>
      </div>
      {msg && (
        <p role="status" className="mensaje mensaje-ok">
          {msg}
        </p>
      )}
    </div>
  )
}

function Acerca() {
  return (
    <section aria-labelledby="t-acerca">
      <h2 id="t-acerca">Acerca de</h2>
      <p>
        <strong>Herramienta no oficial.</strong> No está afiliada al Ministerio del Interior. El establecimiento sigue siendo el responsable de comunicar los datos a tiempo y de que sean correctos. Sin analítica ni llamadas externas; licencia MIT.
      </p>
    </section>
  )
}

function ZonaPeligro() {
  const app = useApp()
  const [texto, setTexto] = useState('')
  return (
    <div>
      <p>Elimina la base de datos cifrada, la configuración y todas las reservas. No se puede deshacer. Haz antes una copia de seguridad.</p>
      <Entrada id="borrar-confirma" etiqueta="Escribe BORRAR para confirmar" valor={texto} onCambio={setTexto} />
      <div className="acciones">
        <button type="button" className="peligro" disabled={texto !== 'BORRAR'} onClick={() => app.destruirTodo()}>
          Borrar todo
        </button>
      </div>
    </div>
  )
}
