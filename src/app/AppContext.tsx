import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Establecimiento, Reserva } from '../domain/tipos'
import { Almacen } from '../storage/almacen'
import { ejecutarPurga, type ResultadoPurga } from '../storage/purga'

export type Fase = 'cargando' | 'sin_almacen' | 'bloqueado' | 'listo' | 'error'

export interface AppValor {
  fase: Fase
  error?: string
  establecimiento?: Establecimiento
  reservas: Reserva[]
  purga?: ResultadoPurga
  almacen: Almacen | null
  ahora: () => Date
  crear: (password: string) => Promise<void>
  desbloquear: (password: string) => Promise<boolean>
  bloquear: () => void
  guardarReserva: (r: Reserva) => Promise<void>
  borrarReserva: (id: string) => Promise<void>
  guardarEstablecimiento: (e: Establecimiento) => Promise<void>
  recargar: () => Promise<void>
  purgarAhora: () => Promise<ResultadoPurga>
  destruirTodo: () => Promise<void>
}

const Ctx = createContext<AppValor | null>(null)

export function useApp(): AppValor {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}

/** Minutos de inactividad tras los que el almacén se bloquea solo (equipo compartido en recepción). */
export const MINUTOS_AUTOBLOQUEO = 15

export interface AppProviderProps {
  children: ReactNode
  nombreBd?: string
  /** Solo pruebas: iteraciones de PBKDF2. */
  iteraciones?: number
  ahora?: () => Date
  autobloqueoMs?: number
}

export function AppProvider({ children, nombreBd = 'registro-viajeros', iteraciones, ahora = () => new Date(), autobloqueoMs = MINUTOS_AUTOBLOQUEO * 60_000 }: AppProviderProps) {
  const [fase, setFase] = useState<Fase>('cargando')
  const [error, setError] = useState<string>()
  const [establecimiento, setEstablecimiento] = useState<Establecimiento>()
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [purga, setPurga] = useState<ResultadoPurga>()
  const almacenRef = useRef<Almacen | null>(null)
  const ahoraRef = useRef(ahora)
  ahoraRef.current = ahora

  const abrir = useCallback(async () => {
    try {
      almacenRef.current?.cerrar()
      const a = await Almacen.abrir(nombreBd)
      almacenRef.current = a
      setFase((await a.existe()) ? 'bloqueado' : 'sin_almacen')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setFase('error')
    }
  }, [nombreBd])

  useEffect(() => {
    void abrir()
    return () => almacenRef.current?.cerrar()
  }, [abrir])

  const cargarDatos = useCallback(async () => {
    const a = almacenRef.current as Almacen
    // Purga automática al desbloquear (todo va cifrado: solo se puede con la clave en memoria).
    const p = await ejecutarPurga(a, ahoraRef.current())
    setPurga(p)
    setEstablecimiento(await a.obtener<Establecimiento>('config', 'establecimiento'))
    setReservas(await a.listar<Reserva>('reservas'))
  }, [])

  const bloquear = useCallback(() => {
    almacenRef.current?.bloquear()
    setEstablecimiento(undefined)
    setReservas([])
    setPurga(undefined)
    setFase((f) => (f === 'listo' ? 'bloqueado' : f))
  }, [])

  // Autobloqueo por inactividad
  useEffect(() => {
    if (fase !== 'listo') return
    let timer = window.setTimeout(bloquear, autobloqueoMs)
    const reiniciar = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(bloquear, autobloqueoMs)
    }
    const eventos = ['pointerdown', 'keydown', 'touchstart'] as const
    eventos.forEach((e) => window.addEventListener(e, reiniciar))
    return () => {
      window.clearTimeout(timer)
      eventos.forEach((e) => window.removeEventListener(e, reiniciar))
    }
  }, [fase, autobloqueoMs, bloquear])

  const valor = useMemo<AppValor>(
    () => ({
      fase,
      error,
      establecimiento,
      reservas,
      purga,
      almacen: almacenRef.current,
      ahora: () => ahoraRef.current(),
      crear: async (password) => {
        const a = almacenRef.current as Almacen
        await a.crear(password, iteraciones ? { iteraciones } : {})
        await cargarDatos()
        setFase('listo')
      },
      desbloquear: async (password) => {
        const ok = await (almacenRef.current as Almacen).desbloquear(password)
        if (ok) {
          await cargarDatos()
          setFase('listo')
        }
        return ok
      },
      bloquear,
      guardarReserva: async (r) => {
        await (almacenRef.current as Almacen).guardar('reservas', r.id, r)
        setReservas((rs) => (rs.some((x) => x.id === r.id) ? rs.map((x) => (x.id === r.id ? r : x)) : [...rs, r]))
      },
      borrarReserva: async (id) => {
        await (almacenRef.current as Almacen).borrar('reservas', id)
        setReservas((rs) => rs.filter((x) => x.id !== id))
      },
      guardarEstablecimiento: async (e) => {
        await (almacenRef.current as Almacen).guardar('config', 'establecimiento', e)
        setEstablecimiento(e)
      },
      recargar: cargarDatos,
      purgarAhora: async () => {
        const p = await ejecutarPurga(almacenRef.current as Almacen, ahoraRef.current())
        setPurga(p)
        setReservas(await (almacenRef.current as Almacen).listar<Reserva>('reservas'))
        return p
      },
      destruirTodo: async () => {
        await (almacenRef.current as Almacen).destruir()
        setEstablecimiento(undefined)
        setReservas([])
        setPurga(undefined)
        await abrir()
      },
    }),
    [fase, error, establecimiento, reservas, purga, bloquear, cargarDatos, abrir, iteraciones],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
