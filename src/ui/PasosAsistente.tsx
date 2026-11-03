import { PASOS_ASISTENTE, TOTAL_PASOS } from '../domain/preferencias'

/** Indicador de progreso del asistente: número, nombre y estado de cada paso (también para lectores de pantalla). */
export function PasosAsistente({ actual }: { actual: number }) {
  return (
    <>
      <p className="progreso-texto">{`Paso ${actual} de ${TOTAL_PASOS}`}</p>
      <ol className="pasos" aria-label="Progreso de los primeros pasos">
        {PASOS_ASISTENTE.map((nombre, i) => {
          const n = i + 1
          const estado = n < actual ? 'hecho' : n === actual ? 'paso actual' : 'pendiente'
          return (
            <li key={nombre} className={n < actual ? 'hecho' : undefined} aria-current={n === actual ? 'step' : undefined}>
              <span className="nombre-paso">{nombre}</span>
              <span className="solo-lectores"> ({estado})</span>
            </li>
          )
        })}
      </ol>
    </>
  )
}
