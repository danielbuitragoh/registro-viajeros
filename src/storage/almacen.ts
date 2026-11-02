/**
 * Almacén local en IndexedDB. TODO el contenido va cifrado (AES-GCM) con una clave derivada de la contraseña del
 * establecimiento. En disco solo quedan: la sal, el nº de iteraciones, un verificador cifrado y, por registro, la
 * colección, el IV y el texto cifrado. Cada registro se cifra con su ruta (`coleccion/id`) como dato asociado (AAD),
 * de modo que no se puede copiar un cifrado de un registro a otro sin que se detecte.
 */
import { ITERACIONES_PBKDF2, a64, cifrar, de64, derivarClave, descifrar, nuevaSal, type Sobre } from '../crypto/cifrado'

export type Coleccion = 'reservas' | 'config'

const VERSION_BD = 1
const VERIFICADOR_TEXTO = 'registro-viajeros:v1'
const AAD_VERIFICADOR = 'meta/verificador'
export const LONGITUD_MINIMA_PASSWORD = 8

interface MetaVault {
  version: 1
  kdf: 'PBKDF2-SHA256'
  iteraciones: number
  sal: string
  verificador: Sobre
}

interface Registro extends Sobre {
  id: string
  coleccion: Coleccion
}

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

const fin = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'))
  })

export interface OpcionesCreacion {
  /** Solo para pruebas: en producción se usa ITERACIONES_PBKDF2. */
  iteraciones?: number
}

export class Almacen {
  private clave: CryptoKey | null = null

  private constructor(
    private bd: IDBDatabase,
    readonly nombre: string,
  ) {}

  static abrir(nombre = 'registro-viajeros'): Promise<Almacen> {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(nombre, VERSION_BD)
      r.onupgradeneeded = () => {
        const bd = r.result
        bd.createObjectStore('meta')
        const reg = bd.createObjectStore('registros', { keyPath: 'id' })
        reg.createIndex('coleccion', 'coleccion')
      }
      r.onsuccess = () => resolve(new Almacen(r.result, nombre))
      r.onerror = () => reject(r.error)
    })
  }

  get desbloqueado(): boolean {
    return this.clave !== null
  }

  private async leerMeta(): Promise<MetaVault | undefined> {
    return req(this.bd.transaction('meta', 'readonly').objectStore('meta').get('vault') as IDBRequest<MetaVault | undefined>)
  }

  async existe(): Promise<boolean> {
    return (await this.leerMeta()) !== undefined
  }

  async crear(password: string, opciones: OpcionesCreacion = {}): Promise<void> {
    if (password.length < LONGITUD_MINIMA_PASSWORD) throw new Error(`La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`)
    if (await this.existe()) throw new Error('El almacén ya existe')
    const iteraciones = opciones.iteraciones ?? ITERACIONES_PBKDF2
    const sal = nuevaSal()
    const clave = await derivarClave(password, sal, iteraciones)
    const meta: MetaVault = {
      version: 1,
      kdf: 'PBKDF2-SHA256',
      iteraciones,
      sal: a64(sal),
      verificador: await cifrar(clave, VERIFICADOR_TEXTO, AAD_VERIFICADOR),
    }
    const tx = this.bd.transaction('meta', 'readwrite')
    tx.objectStore('meta').put(meta, 'vault')
    await fin(tx)
    this.clave = clave
  }

  /** Devuelve false si la contraseña es incorrecta. */
  async desbloquear(password: string): Promise<boolean> {
    const clave = await this.verificarPassword(password)
    if (!clave) return false
    this.clave = clave
    return true
  }

  private async verificarPassword(password: string): Promise<CryptoKey | null> {
    const meta = await this.leerMeta()
    if (!meta) throw new Error('El almacén no existe')
    const clave = await derivarClave(password, de64(meta.sal), meta.iteraciones)
    try {
      return (await descifrar(clave, meta.verificador, AAD_VERIFICADOR)) === VERIFICADOR_TEXTO ? clave : null
    } catch {
      return null
    }
  }

  bloquear(): void {
    this.clave = null
  }

  cerrar(): void {
    this.clave = null
    this.bd.close()
  }

  /** Borra la base de datos entera (todos los datos del dispositivo). */
  async destruir(): Promise<void> {
    this.cerrar()
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(this.nombre)
      r.onsuccess = () => resolve()
      r.onerror = () => reject(r.error)
      r.onblocked = () => reject(new Error('No se pudo borrar: hay otra pestaña abierta con la aplicación'))
    })
  }

  private exigirClave(): CryptoKey {
    if (!this.clave) throw new Error('El almacén está bloqueado')
    return this.clave
  }

  async guardar(coleccion: Coleccion, id: string, valor: unknown): Promise<void> {
    const clave = this.exigirClave()
    const ruta = `${coleccion}/${id}`
    const sobre = await cifrar(clave, JSON.stringify(valor), ruta)
    const tx = this.bd.transaction('registros', 'readwrite')
    tx.objectStore('registros').put({ id: ruta, coleccion, ...sobre } satisfies Registro)
    await fin(tx)
  }

  async obtener<T = unknown>(coleccion: Coleccion, id: string): Promise<T | undefined> {
    const clave = this.exigirClave()
    const r = await req(this.bd.transaction('registros', 'readonly').objectStore('registros').get(`${coleccion}/${id}`) as IDBRequest<Registro | undefined>)
    return r ? (JSON.parse(await descifrar(clave, r, r.id)) as T) : undefined
  }

  async listar<T = unknown>(coleccion: Coleccion): Promise<T[]> {
    const clave = this.exigirClave()
    const filas = await req(
      this.bd.transaction('registros', 'readonly').objectStore('registros').index('coleccion').getAll(coleccion) as IDBRequest<Registro[]>,
    )
    return Promise.all(filas.map(async (r) => JSON.parse(await descifrar(clave, r, r.id)) as T))
  }

  async borrar(coleccion: Coleccion, id: string): Promise<void> {
    this.exigirClave()
    const tx = this.bd.transaction('registros', 'readwrite')
    tx.objectStore('registros').delete(`${coleccion}/${id}`)
    await fin(tx)
  }

  /** Re-cifra todo el contenido con la nueva contraseña (nueva sal) en una única transacción. */
  async cambiarPassword(actual: string, nueva: string): Promise<void> {
    if (nueva.length < LONGITUD_MINIMA_PASSWORD) throw new Error(`La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`)
    const claveVieja = await this.verificarPassword(actual)
    if (!claveVieja) throw new Error('La contraseña actual es incorrecta')
    const meta = (await this.leerMeta()) as MetaVault
    const filas = await req(this.bd.transaction('registros', 'readonly').objectStore('registros').getAll() as IDBRequest<Registro[]>)

    const sal = nuevaSal()
    const claveNueva = await derivarClave(nueva, sal, meta.iteraciones)
    const nuevasFilas: Registro[] = await Promise.all(
      filas.map(async (r) => ({ id: r.id, coleccion: r.coleccion, ...(await cifrar(claveNueva, await descifrar(claveVieja, r, r.id), r.id)) })),
    )
    const nuevaMeta: MetaVault = { ...meta, sal: a64(sal), verificador: await cifrar(claveNueva, VERIFICADOR_TEXTO, AAD_VERIFICADOR) }

    const tx = this.bd.transaction(['meta', 'registros'], 'readwrite')
    for (const f of nuevasFilas) tx.objectStore('registros').put(f)
    tx.objectStore('meta').put(nuevaMeta, 'vault')
    await fin(tx)
    this.clave = claveNueva
  }
}
