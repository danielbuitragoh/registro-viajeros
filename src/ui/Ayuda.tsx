import { useMemo, useState, type ReactNode } from 'react'
import { Icono } from './Icono'

/**
 * Página «Ayuda» de recepción: preguntas frecuentes en lenguaje llano. Lo que viene del documento oficial
 * (docs/oficial/Instrucciones.pdf) cita su apartado; lo que el documento no dice se presenta como tal (PENDIENTE-OFICIAL).
 */
interface Pregunta {
  id: string
  pregunta: string
  /** Texto para el buscador (además de la pregunta). */
  claves: string
  respuesta: ReactNode
}

const PREGUNTAS: Pregunta[] = [
  {
    id: 'envia',
    pregunta: '¿La app envía los datos al Ministerio?',
    claves: 'enviar ministerio portal subir ses hospedajes comunicar',
    respuesta: (
      <>
        <p>
          <strong>No.</strong> Prepara y valida el fichero; <strong>tú lo subes</strong> al portal SES.Hospedajes. Hasta entonces la comunicación <strong>no está hecha</strong>, aunque la app marque el parte como «exportado».
        </p>
      </>
    ),
  },
  {
    id: 'plazos',
    pregunta: '¿Qué plazos tengo?',
    claves: 'plazo 24 horas tres años conservar conservación vencido real decreto',
    respuesta: (
      <>
        <p>
          Comunicar cada parte en <strong>24 horas</strong> y <strong>conservar los datos 3 años</strong>. Estos plazos vienen del Real Decreto 933/2021, no del documento técnico del fichero.
        </p>
        <p>
          La app cuenta las 24 h desde la <strong>entrada prevista</strong> y los 3 años desde la <strong>salida</strong>; confírmalo con tu asesoría (pendiente P12). En «Hoy» verás qué partes han vencido y cuáles vencen en menos de 6 h.
        </p>
      </>
    ),
  },
  {
    id: 'rechazo',
    pregunta: 'El portal rechaza el fichero: ¿qué hago?',
    claves: 'error rechazo rechazado fallo portal subir xml no acepta',
    respuesta: (
      <ol>
        <li>
          <strong>No lo vuelvas a subir a ciegas.</strong> Lee el mensaje del portal y apunta qué comunicación y qué dato señala. Si el portal aceptó alguna comunicación, no la repitas.
        </li>
        <li>Abre esa reserva aquí, corrige el dato y genera un fichero nuevo solo con las que faltan.</li>
        <li>
          Comprueba el <strong>código de establecimiento</strong> (Ajustes → Establecimiento) y que elegiste el <strong>tipo</strong> correcto: partes de viajeros o reservas de hospedaje (un fichero solo puede llevar un tipo, §2).
        </li>
        <li>
          La app no conoce los mensajes del portal y no se ha podido probar contra él (pendientes P1 y P14). Si el error habla del formato del fichero (plantilla, espacio de nombres), compáralo con la plantilla que ofrece el portal y abre una incidencia en el repositorio. Mientras tanto, puedes comunicar ese parte a mano en el portal.
        </li>
      </ol>
    ),
  },
  {
    id: 'menores',
    pregunta: '¿Qué pasa con los menores?',
    claves: 'menor menores niño niños hijo parentesco edad 18',
    respuesta: (
      <>
        <p>
          El documento (tipo y número) solo es obligatorio para los <strong>mayores de edad</strong> (§3). La app considera mayor de edad a partir de 18 años en la fecha de entrada (el documento no lo define: P6).
        </p>
        <p>
          Si hay un menor, al menos un adulto de la misma comunicación debe tener su <strong>parentesco</strong> (§3). En la ficha del menor se elige qué adulto le acompaña y el parentesco (tabla 8.3). Rellena primero la ficha del adulto.
        </p>
      </>
    ),
  },
  {
    id: 'extranjero',
    pregunta: 'El huésped no tiene documento español',
    claves: 'extranjero pasaporte otro documento carné identidad ue europeo nie dni',
    respuesta: (
      <>
        <p>
          El documento oficial admite cuatro tipos (tabla 8.5): <strong>DNI/NIF, NIE, pasaporte y «otro»</strong>. Con <strong>pasaporte</strong> u <strong>«otro documento»</strong> (por ejemplo, el carné de identidad de su país) no se pide número de soporte ni segundo apellido (§3).
        </p>
        <p>
          El documento no tiene un código propio para los carnés de identidad de otros países: la app usa «otro», el único genérico (pendiente P16). Si su domicilio está fuera de España, se escribe el <strong>nombre del municipio o ciudad</strong> en vez del código INE (§7.1), y el teléfono con prefijo internacional. El formulario del huésped está en 6 idiomas.
        </p>
      </>
    ),
  },
  {
    id: 'dispositivo',
    pregunta: '¿Qué hago para cambiar de ordenador o dispositivo?',
    claves: 'cambiar ordenador dispositivo tablet móvil nuevo equipo copia restaurar mover',
    respuesta: (
      <ol>
        <li>
          En el equipo actual: <a href="#/ajustes/copias">Ajustes → Copia de seguridad</a> → <strong>Descargar copia</strong> (con una contraseña para la copia).
        </li>
        <li>Lleva el fichero al nuevo equipo (memoria USB, correo a ti mismo…): va cifrado.</li>
        <li>
          En el nuevo: abre la app, crea la contraseña del establecimiento y en Ajustes → Copia de seguridad → <strong>Restaurar copia</strong>.
        </li>
        <li>Comprueba que están tus reservas. Si el equipo viejo no se va a usar más, en él: Ajustes → Borrar todos los datos.</li>
      </ol>
    ),
  },
  {
    id: 'pms',
    pregunta: 'Uso AM HOTEL u otro programa de gestión',
    claves: 'am hotel pms programa gestión recepción software dos veces duplicado pre-check-in',
    respuesta: (
      <>
        <p>
          Usa esta app <strong>solo como pre-check-in</strong>: el huésped rellena su ficha en el móvil y te la entrega en PDF, en papel o con el QR, y tú pasas los datos a tu programa.
        </p>
        <p>
          Si tu programa ya comunica los partes a SES.Hospedajes, <strong>no exportes ni subas el XML</strong> desde aquí: el mismo parte se comunicaría <strong>dos veces</strong>. Pregunta a tu proveedor qué comunica exactamente.
        </p>
      </>
    ),
  },
  {
    id: 'codigo-estab',
    pregunta: '¿Qué es el código de establecimiento y de dónde lo saco?',
    claves: 'código establecimiento registro alta ses hospedajes no lo tengo',
    respuesta: (
      <>
        <p>
          Es el código que el Sistema de Hospedajes asigna a tu establecimiento <strong>«en el momento del registro»</strong> (§3). Te lo da el propio sistema al dar de alta el establecimiento; si no lo encuentras, consúltalo en el portal SES.Hospedajes.
        </p>
        <p>
          <strong>¿Aún no lo tienes?</strong> Puedes usar la app (reservas y fichas de huéspedes) y añadirlo después en Ajustes → Establecimiento. Sin él no se puede generar el fichero de <strong>partes de viajeros</strong>, que lo exige (§3). El de <strong>reservas de hospedaje</strong> admite en su lugar el nombre, tipo y dirección del establecimiento (§4, «en caso de no disponer de un código»).
        </p>
      </>
    ),
  },
  {
    id: 'soporte',
    pregunta: '¿Qué es el número de soporte?',
    claves: 'soporte idesp núm soport dni nie tarjeta',
    respuesta: (
      <>
        <p>
          Es el número de la <strong>tarjeta física</strong> del DNI o del NIE, no el de la persona: cambia cada vez que se renueva el documento. Solo se pide con DNI o NIE (§3).
        </p>
        <p>Suele estar impreso en la tarjeta con el rótulo «NÚM SOPORT» (en algunos DNI más antiguos, «IDESP»). El documento oficial no indica dónde está ni su formato (pendiente P10).</p>
      </>
    ),
  },
  {
    id: 'ine',
    pregunta: '¿Qué es el código INE del municipio?',
    claves: 'ine municipio código postal cinco dígitos provincia',
    respuesta: (
      <>
        <p>
          Es el código oficial de <strong>5 números</strong> de cada municipio de España (2 de la provincia y 3 del municipio). <strong>No es el código postal.</strong> Es obligatorio si el domicilio está en España (§7.1).
        </p>
        <p>
          Escribe el nombre del municipio y elígelo en la lista: el código se rellena solo. Si esta versión no trae la relación de municipios, búscalo en la «Relación de municipios y sus códigos por provincias» del INE (README → «Códigos de municipio INE»). El huésped puede dejarlo en blanco: lo completas tú.
        </p>
      </>
    ),
  },
  {
    id: 'tipo-fichero',
    pregunta: '¿Qué fichero exporto: partes de viajeros o reservas de hospedaje?',
    claves: 'partes viajeros reservas hospedaje tipo fichero exportar apartado',
    respuesta: (
      <p>
        <strong>Partes de viajeros</strong> (§3): los datos de cada viajero al alojarse; es lo habitual en recepción. <strong>Reservas de hospedaje</strong> (§4): los datos de la reserva y del titular. Un fichero solo puede llevar comunicaciones de un mismo tipo (§2).
      </p>
    ),
  },
  {
    id: 'copias',
    pregunta: '¿Cada cuánto hago una copia de seguridad?',
    claves: 'copia seguridad backup perder datos semana recordatorio',
    respuesta: (
      <p>
        Al menos <strong>una vez por semana</strong>, y guárdala fuera de este equipo. Los datos solo viven aquí: si se estropea o se pierde sin copia, se pierden. «Hoy» te avisa cuando toca (lo cambias en <a href="#/ajustes/copias">Ajustes → Copia de seguridad</a>).
      </p>
    ),
  },
  {
    id: 'olvido',
    pregunta: 'He olvidado la contraseña',
    claves: 'contraseña olvidada olvido recuperar perder clave',
    respuesta: (
      <>
        <p>
          <strong>No se puede recuperar</strong>: no hay servidor ni cuenta, y los datos están cifrados con ella.
        </p>
        <p>Si tienes una copia de seguridad (y recuerdas la contraseña de la copia), borra los datos de este sitio en los ajustes del navegador, vuelve a abrir la app, crea una contraseña nueva y restaura la copia.</p>
      </>
    ),
  },
  {
    id: 'prueba',
    pregunta: '¿Para qué sirve la reserva de prueba?',
    claves: 'prueba ensayo primeros pasos asistente practicar',
    respuesta: (
      <p>
        Para practicar en los primeros pasos sin tocar datos reales. Lleva la marca «Prueba», no se preselecciona al exportar y el asistente ofrece borrarla al terminar. <strong>Nunca subas al portal un fichero con la reserva de prueba.</strong>
      </p>
    ),
  },
]

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

export function Ayuda() {
  const [q, setQ] = useState('')
  const lista = useMemo(() => {
    const t = normalizar(q.trim())
    return t ? PREGUNTAS.filter((p) => normalizar(`${p.pregunta} ${p.claves}`).includes(t)) : PREGUNTAS
  }, [q])
  return (
    <section aria-labelledby="t-ayuda">
      <h1 id="t-ayuda">Ayuda</h1>
      <p>Respuestas cortas a las dudas más habituales. Lo que sale del documento oficial lleva el apartado entre paréntesis (por ejemplo, §3).</p>
      <div className="tarjeta tarjeta-info">
        <p>
          <Icono nombre="bandera" /> ¿Empiezas ahora o quieres repasar? <a href="#/primeros-pasos">Vuelve a los primeros pasos</a>: un asistente de 6 pasos con una reserva de prueba.
        </p>
      </div>
      <div className="campo campo-corto">
        <label htmlFor="buscar-ayuda">Buscar en la ayuda</label>
        <input id="buscar-ayuda" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <p className="solo-lectores" aria-live="polite">
        {lista.length} {lista.length === 1 ? 'pregunta' : 'preguntas'}
      </p>
      {lista.length === 0 ? (
        <div className="vacio">
          <Icono nombre="ayuda" />
          <p>
            <strong>Ninguna pregunta coincide con «{q}».</strong>
          </p>
          <p>Prueba con otra palabra (por ejemplo «menores», «pasaporte» o «copia»).</p>
        </div>
      ) : (
        lista.map((p) => (
          <details key={p.id} className="faq" id={`ayuda-${p.id}`}>
            <summary>{p.pregunta}</summary>
            <div>{p.respuesta}</div>
          </details>
        ))
      )}
    </section>
  )
}
