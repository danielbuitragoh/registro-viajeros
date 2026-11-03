import { useMemo, useRef, useState } from 'react'
import type { Direccion, Incidencia, Viajero } from '../domain/tipos'
import { alfa3Espana, paisesOrdenados } from '../oficial/paises'
import { t } from '../i18n/textos'
import { opcionesCodigo } from '../i18n/codigos'
import { etiquetaCampo, mensajeIncidencia } from '../i18n/mensajes'
import type { Idioma } from '../huesped/enlace'
import { edadEn, esFechaValida } from '../validators/fechas'
import { validarViajero } from '../validators/viajero'
import { Entrada, Grupo, ResumenErrores, Selector } from './campos'
import { CampoMunicipio } from './CampoMunicipio'
import { useRelacionesIne } from '../ine/useIne'
import { fechaLegible } from '../ine/relacion'
import { REGLAS_DOCUMENTO, ejemploDocumento } from '../oficial/documentos'
import { esCodigo, TIPO_DOCUMENTO } from '../oficial/codigos'
import { Pista } from './Pista'
import { IlustracionSoporte } from './Ilustraciones'

/** Código INE de ejemplo: el de la muestra FICTICIA de la demo (provincia 99, que no existe). Nunca un código real inventado. */
const INE_EJEMPLO = { codigo: '99001', provincia: '99', municipio: '001' }

export interface AdultoRef {
  id: string
  nombre: string
}

export interface FormularioViajeroProps {
  inicial: Viajero
  idioma: Idioma
  /** huesped: no se guarda hasta que valida (salvo lo que recepción completa). recepcion: se guarda siempre. */
  modo: 'huesped' | 'recepcion'
  /** AAAA-MM-DD */
  fechaEntrada: string
  /** Otros adultos de la reserva (para elegir responsable si este viajero es menor). */
  adultos: AdultoRef[]
  numero: number
  /** Dirección del viajero 1, para no volver a escribirla (WCAG 3.3.7). */
  direccionCopiable?: Direccion
  /** Solo recepción, para reservas de hospedaje (rol TI). */
  permitirTitular?: boolean
  onGuardar: (v: Viajero) => void
  onCancelar?: () => void
}

const vacio = (s: string | undefined) => s === undefined || s.trim() === ''

/** Quita espacios y pasa las cadenas vacías a undefined. */
export function limpiarViajero(v: Viajero): Viajero {
  const o = (s: string | undefined) => (vacio(s) ? undefined : (s as string).trim())
  const d = v.direccion
  const out: Viajero = {
    ...v,
    nombre: v.nombre.trim(),
    apellido1: v.apellido1.trim(),
    apellido2: o(v.apellido2),
    numeroDocumento: o(v.numeroDocumento),
    soporteDocumento: o(v.soporteDocumento),
    nacionalidad: o(v.nacionalidad),
    telefono: o(v.telefono),
    telefono2: o(v.telefono2),
    correo: o(v.correo),
    tipoDocumento: v.tipoDocumento || undefined,
    sexo: v.sexo || undefined,
    direccion: {
      direccion: d.direccion.trim(),
      direccionComplementaria: o(d.direccionComplementaria),
      codigoMunicipio: o(d.codigoMunicipio),
      nombreMunicipio: o(d.nombreMunicipio),
      codigoPostal: d.codigoPostal.trim(),
      pais: d.pais,
    },
  }
  if (!out.responsable?.adultoId) delete out.responsable
  return out
}

export function viajeroVacio(id: string): Viajero {
  return { id, nombre: '', apellido1: '', fechaNacimiento: '', direccion: { direccion: '', codigoPostal: '', pais: alfa3Espana } }
}

export function FormularioViajero(props: FormularioViajeroProps) {
  const { idioma, modo, fechaEntrada, adultos, numero } = props
  const tr = (k: Parameters<typeof t>[1], p?: Record<string, string | number>) => t(idioma, k, p)
  const [v, setV] = useState<Viajero>(props.inicial)
  const [intentado, setIntentado] = useState(false)
  const [tocados, setTocados] = useState<Set<string>>(new Set())
  const resumenRef = useRef<HTMLDivElement>(null)
  const pref = `v${numero}`
  const fid = (campo: string) => `${pref}-${campo.replace(/\./g, '-')}`

  const set = <K extends keyof Viajero>(k: K, valor: Viajero[K]) => setV((x) => ({ ...x, [k]: valor }))
  const setDir = (k: keyof Direccion, valor: string) => setV((x) => ({ ...x, direccion: { ...x.direccion, [k]: valor } }))
  const tocar = (c: string) => setTocados((s) => (s.has(c) ? s : new Set(s).add(c)))

  const edad = esFechaValida(v.fechaNacimiento) && v.fechaNacimiento <= fechaEntrada ? edadEn(v.fechaNacimiento, fechaEntrada) : undefined
  const esMenor = edad !== undefined && edad < 18

  const esp = v.direccion.pais === alfa3Espana
  // Relación de municipios del INE: solo se carga si el domicilio está en España
  const ine = useRelacionesIne(esp)

  const incidencias: Incidencia[] = useMemo(() => {
    const todas = validarViajero(limpiarViajero(v), { fechaEntrada, modo: 'parte', adultosIds: adultos.map((a) => a.id), ine: ine.consulta })
    // El huésped no puede conocer el código INE: recepción lo completa.
    return modo === 'huesped' ? todas.filter((i) => !(i.campo === 'direccion.codigoMunicipio' && i.codigo === 'requerido')) : todas
  }, [v, fechaEntrada, adultos, modo, ine.consulta])

  const visibles = (campo: string) => incidencias.filter((i) => i.campo === campo && (intentado || tocados.has(campo)))
  const errorDe = (c: string) => {
    const e = visibles(c).find((i) => i.gravedad === 'error')
    return e ? mensajeIncidencia(e, idioma) : undefined
  }
  const avisoDe = (c: string) => {
    const a = visibles(c).find((i) => i.gravedad === 'aviso')
    return a ? mensajeIncidencia(a, idioma) : undefined
  }
  const props_ = (campo: string) => ({
    id: fid(campo),
    etiqueta: etiquetaCampo(campo, idioma),
    error: errorDe(campo),
    aviso: avisoDe(campo),
    onBlur: () => tocar(campo),
    etiquetaError: tr('f.error'),
    etiquetaAviso: tr('f.aviso'),
  })

  const errores = incidencias.filter((i) => i.gravedad === 'error')
  const itemsResumen = intentado ? errores.map((i) => ({ id: fid(i.campo), texto: `${etiquetaCampo(i.campo, idioma)}: ${mensajeIncidencia(i, idioma)}` })) : []

  const paises = useMemo(() => paisesOrdenados(idioma).map((p) => ({ valor: p.alfa3, texto: p.nombre })), [idioma])
  const tipoDocs = opcionesCodigo('TIPO_DOCUMENTO', idioma)
  const sexos = opcionesCodigo('SEXO', idioma)
  const parentescos = opcionesCodigo('PARENTESCO', idioma)
  const marca = (obligatorio: boolean) => (obligatorio ? undefined : tr('comun.opcional').replace(/[()]/g, ''))

  // Ayuda del código INE: qué municipio es según la relación, o cómo rellenarlo
  const codigoIne = v.direccion.codigoMunicipio?.trim() ?? ''
  const estadoIne = ine.consulta?.(codigoIne)
  const ayudaCodigo =
    estadoIne?.tipo === 'vigente'
      ? tr('f.municipio_ine_ok', { codigo: codigoIne, nombre: estadoIne.municipio.nombre, fecha: fechaLegible(estadoIne.fecha) })
      : modo === 'huesped'
        ? tr('f.municipio_ine_ayuda')
        : ine.relaciones?.length === 0
          ? tr('f.municipio_sin_relacion')
          : undefined
  const cp = v.direccion.codigoPostal.trim()

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (modo === 'huesped' && errores.length > 0) {
      setTimeout(() => resumenRef.current?.focus(), 0)
      return
    }
    props.onGuardar(limpiarViajero(v))
  }

  const docObligatorio = edad === undefined || !esMenor
  const tipoDoc = esCodigo(TIPO_DOCUMENTO, v.tipoDocumento) ? v.tipoDocumento : undefined
  const reglas = tipoDoc ? REGLAS_DOCUMENTO[tipoDoc] : undefined

  return (
    <form onSubmit={enviar} noValidate aria-labelledby={`${pref}-titulo`} lang={idioma}>
      <h2 id={`${pref}-titulo`}>{tr('h.viajero.titulo', { n: numero })}</h2>
      <ResumenErrores refResumen={resumenRef} titulo={itemsResumen.length === 1 ? tr('f.resumen_errores_uno') : tr('f.resumen_errores', { n: itemsResumen.length })} items={itemsResumen} />

      <Grupo leyenda={tr('f.seccion.datos')}>
        <Entrada {...props_('nombre')} valor={v.nombre} onCambio={(x) => set('nombre', x)} autoComplete="given-name" obligatorio />
        <Entrada {...props_('apellido1')} valor={v.apellido1} onCambio={(x) => set('apellido1', x)} autoComplete="family-name" obligatorio />
        <Entrada
          {...props_('apellido2')}
          valor={v.apellido2 ?? ''}
          onCambio={(x) => set('apellido2', x)}
          marca={marca(reglas?.apellido2Obligatorio ?? false)}
          pista={
            <Pista titulo={tr('f.apellido2.titulo')}>
              <p>{tr('f.apellido2.texto')}</p>
            </Pista>
          }
        />
        <Entrada {...props_('fechaNacimiento')} tipo="date" valor={v.fechaNacimiento} onCambio={(x) => set('fechaNacimiento', x)} autoComplete="bday" max={fechaEntrada} obligatorio />
        {esMenor && <p className="aviso-menor">{tr('h.menor', { edad: edad as number })}</p>}
        {modo === 'huesped' && (
          <Pista titulo={tr('f.menor.titulo')}>
            <p>{tr('f.menor.texto')}</p>
          </Pista>
        )}
        <Selector {...props_('nacionalidad')} valor={v.nacionalidad ?? ''} onCambio={(x) => set('nacionalidad', x || undefined)} opciones={paises} vacio={tr('comun.ninguno')} autoComplete="country-name" marca={marca(false)} />
        <Selector {...props_('sexo')} valor={v.sexo ?? ''} onCambio={(x) => set('sexo', (x || undefined) as Viajero['sexo'])} opciones={sexos} vacio={tr('comun.ninguno')} marca={marca(false)} />
      </Grupo>

      <Grupo leyenda={tr('f.seccion.documento')} ayuda={docObligatorio ? tr('f.documento.ayuda_mayor') : tr('f.documento.ayuda_menor')}>
        <Selector
          {...props_('tipoDocumento')}
          valor={v.tipoDocumento ?? ''}
          onCambio={(x) => set('tipoDocumento', (x || undefined) as Viajero['tipoDocumento'])}
          opciones={tipoDocs}
          vacio={tr('comun.elige')}
          obligatorio={docObligatorio}
          marca={marca(docObligatorio)}
          pista={
            <Pista titulo={tr('f.doc.elegir.titulo')}>
              <ul>
                {Object.keys(TIPO_DOCUMENTO).map((c) => (
                  <li key={c}>{tr(`f.doc.elegir.${c as keyof typeof TIPO_DOCUMENTO}`)}</li>
                ))}
              </ul>
              <p>{tr('f.doc.elegir.menor')}</p>
            </Pista>
          }
        />
        <Entrada
          {...props_('numeroDocumento')}
          valor={v.numeroDocumento ?? ''}
          onCambio={(x) => set('numeroDocumento', x)}
          obligatorio={docObligatorio}
          marca={marca(docObligatorio)}
          mayusculas
          maxLength={20}
          ayuda={tipoDoc ? tr(`f.doc.formato.${tipoDoc}`, { ejemplo: ejemploDocumento(tipoDoc) ?? '' }) : undefined}
        />
        {reglas?.soporteObligatorio && (
          <Entrada
            {...props_('soporteDocumento')}
            valor={v.soporteDocumento ?? ''}
            onCambio={(x) => set('soporteDocumento', x)}
            obligatorio
            mayusculas
            maxLength={12}
            ayuda={tr('f.soporte_ayuda')}
            pista={
              <Pista titulo={tr('f.soporte.titulo')}>
                <p>{tr('f.soporte.texto')}</p>
                <p>{tr('f.soporte.donde')}</p>
                <IlustracionSoporte numero={tr('f.soporte.ilu_numero')} soporte={tr('f.soporte.ilu_soporte')} nota={tr('f.ilustracion.nota')} />
              </Pista>
            }
          />
        )}
      </Grupo>

      <Grupo leyenda={tr('f.seccion.domicilio')}>
        {props.direccionCopiable && numero > 1 && (
          <button type="button" className="secundario" onClick={() => setV((x) => ({ ...x, direccion: { ...(props.direccionCopiable as Direccion) } }))}>
            {tr('f.misma_direccion')}
          </button>
        )}
        <Selector {...props_('direccion.pais')} valor={v.direccion.pais} onCambio={(x) => setDir('pais', x)} opciones={paises} vacio={tr('comun.elige')} autoComplete="country-name" obligatorio />
        <Entrada {...props_('direccion.direccion')} valor={v.direccion.direccion} onCambio={(x) => setDir('direccion', x)} autoComplete="street-address" obligatorio />
        <Entrada {...props_('direccion.direccionComplementaria')} valor={v.direccion.direccionComplementaria ?? ''} onCambio={(x) => setDir('direccionComplementaria', x)} marca={marca(false)} />
        <Entrada {...props_('direccion.codigoPostal')} valor={v.direccion.codigoPostal} onCambio={(x) => setDir('codigoPostal', x)} autoComplete="postal-code" obligatorio />
        {esp && ine.activa ? (
          <CampoMunicipio
            {...props_('direccion.nombreMunicipio')}
            etiqueta={tr('f.municipio_nombre_es')}
            idioma={idioma}
            valor={v.direccion.nombreMunicipio ?? ''}
            onCambio={(x) => setDir('nombreMunicipio', x)}
            onElegir={(m) => setV((x) => ({ ...x, direccion: { ...x.direccion, nombreMunicipio: m.nombre, codigoMunicipio: m.codigo } }))}
            relacion={ine.activa}
            // Pista para ordenar: las 2 primeras cifras del código postal suelen ser las de la provincia. No valida nada.
            provincia={/^\d{5}$/.test(cp) ? cp.slice(0, 2) : undefined}
            ayuda={`${tr('f.municipio_buscar_ayuda')}${ine.activa.ficticia ? ` ${tr('f.municipio_ficticia')}` : ''}`}
            // WCAG 1.3.5: el huésped escribe SU dirección; en recepción se teclean datos de otros
            autoComplete={modo === 'huesped' ? 'address-level2' : 'off'}
            marca={marca(false)}
          />
        ) : (
          <Entrada {...props_('direccion.nombreMunicipio')} etiqueta={esp ? tr('f.municipio_nombre_es') : etiquetaCampo('direccion.nombreMunicipio', idioma)} valor={v.direccion.nombreMunicipio ?? ''} onCambio={(x) => setDir('nombreMunicipio', x)} autoComplete="address-level2" obligatorio={!esp} marca={marca(!esp)} />
        )}
        {esp && (
          <Entrada
            {...props_('direccion.codigoMunicipio')}
            valor={v.direccion.codigoMunicipio ?? ''}
            onCambio={(x) => setDir('codigoMunicipio', x)}
            inputMode="numeric"
            maxLength={5}
            ayuda={ayudaCodigo}
            obligatorio={modo === 'recepcion'}
            marca={marca(modo === 'recepcion')}
            pista={
              <Pista titulo={tr('f.ine.titulo')}>
                <p>{tr('f.ine.texto')}</p>
                <p>{tr('f.ine.ejemplo', INE_EJEMPLO)}</p>
                <p>{modo === 'huesped' ? tr('f.ine.huesped') : tr('f.ine.recepcion')}</p>
              </Pista>
            }
          />
        )}
      </Grupo>

      <Grupo leyenda={tr('f.seccion.contacto')} ayuda={tr('f.contacto.ayuda')}>
        <Entrada
          {...props_('telefono')}
          tipo="tel"
          valor={v.telefono ?? ''}
          onCambio={(x) => set('telefono', x)}
          autoComplete="tel"
          inputMode="tel"
          pista={
            <Pista titulo={tr('f.telefono.titulo')}>
              <p>{tr('f.telefono.texto')}</p>
            </Pista>
          }
        />
        <Entrada {...props_('telefono2')} tipo="tel" valor={v.telefono2 ?? ''} onCambio={(x) => set('telefono2', x)} inputMode="tel" marca={marca(false)} />
        <Entrada {...props_('correo')} tipo="email" valor={v.correo ?? ''} onCambio={(x) => set('correo', x)} autoComplete="email" inputMode="email" />
      </Grupo>

      {esMenor && (
        <Grupo leyenda={tr('f.seccion.menor')} ayuda={adultos.length === 0 ? tr('f.menor.sin_adultos') : tr('f.menor.ayuda')}>
          <Selector
            {...props_('responsable')}
            etiqueta={tr('f.menor.adulto')}
            valor={v.responsable?.adultoId ?? ''}
            onCambio={(x) => setV((s) => ({ ...s, responsable: { adultoId: x, parentesco: s.responsable?.parentesco ?? ('' as never) } }))}
            opciones={adultos.map((a) => ({ valor: a.id, texto: a.nombre }))}
            vacio={tr('comun.elige')}
            obligatorio
          />
          <Selector
            {...props_('responsable.parentesco')}
            etiqueta={tr('f.menor.parentesco')}
            valor={v.responsable?.parentesco ?? ''}
            onCambio={(x) => setV((s) => ({ ...s, responsable: { adultoId: s.responsable?.adultoId ?? '', parentesco: x as never } }))}
            opciones={parentescos}
            vacio={tr('comun.elige')}
            obligatorio
          />
        </Grupo>
      )}

      {props.permitirTitular && (
        <div className="campo campo-check">
          <input id={`${pref}-titular`} type="checkbox" checked={!!v.esTitular} onChange={(e) => set('esTitular', e.target.checked)} />
          <label htmlFor={`${pref}-titular`}>Es el titular del contrato</label>
        </div>
      )}

      <div className="acciones">
        <button type="submit" className="primario">
          {tr('h.guardar')}
        </button>
        {props.onCancelar && (
          <button type="button" className="secundario" onClick={props.onCancelar}>
            {tr('h.volver')}
          </button>
        )}
      </div>
    </form>
  )
}
