import { beforeEach, describe, expect, it } from 'vitest'
import { Almacen } from '../../src/storage/almacen'

let n = 0
let nombre = ''
beforeEach(() => {
  nombre = `test-db-${++n}-${Math.random().toString(36).slice(2)}`
})
const opts = { iteraciones: 1000 }

/** Lee tal cual está en IndexedDB (sin pasar por el almacén). */
async function volcadoCrudo(db: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(db)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const bd = req.result
      const res: Record<string, unknown[]> = {}
      const nombres = Array.from(bd.objectStoreNames)
      const tx = bd.transaction(nombres, 'readonly')
      let pendientes = nombres.length
      for (const s of nombres) {
        const g = tx.objectStore(s).getAll()
        g.onsuccess = () => {
          res[s] = g.result
          if (--pendientes === 0) {
            bd.close()
            resolve(JSON.stringify(res))
          }
        }
      }
    }
  })
}

describe('Almacen — creación y desbloqueo', () => {
  it('al principio no existe; tras crear, sí', async () => {
    const a = await Almacen.abrir(nombre)
    expect(await a.existe()).toBe(false)
    await a.crear('clave-del-hostal', opts)
    expect(await a.existe()).toBe(true)
  })

  it('desbloquea con la contraseña correcta y rechaza la incorrecta', async () => {
    const a = await Almacen.abrir(nombre)
    await a.crear('buena', opts)
    a.bloquear()
    expect(await a.desbloquear('mala')).toBe(false)
    expect(a.desbloqueado).toBe(false)
    expect(await a.desbloquear('buena')).toBe(true)
    expect(a.desbloqueado).toBe(true)
  })

  it('persiste entre aperturas (otra instancia sobre la misma base)', async () => {
    const a = await Almacen.abrir(nombre)
    await a.crear('buena', opts)
    await a.guardar('reservas', 'r1', { nombre: 'Lucía' })
    a.cerrar()
    const b = await Almacen.abrir(nombre)
    expect(await b.existe()).toBe(true)
    expect(await b.desbloquear('buena')).toBe(true)
    expect(await b.obtener('reservas', 'r1')).toEqual({ nombre: 'Lucía' })
  })

  it('exige una contraseña de al menos 8 caracteres', async () => {
    const a = await Almacen.abrir(nombre)
    await expect(a.crear('corta', opts)).rejects.toThrow(/8/)
  })

  it('no se puede crear dos veces', async () => {
    const a = await Almacen.abrir(nombre)
    await a.crear('buena-clave', opts)
    await expect(a.crear('otra-clave-x', opts)).rejects.toThrow()
  })
})

describe('Almacen — datos', () => {
  async function abierto() {
    const a = await Almacen.abrir(nombre)
    await a.crear('clave-del-hostal', opts)
    return a
  }

  it('guarda, lee, lista por colección y borra', async () => {
    const a = await abierto()
    await a.guardar('reservas', 'r1', { x: 1 })
    await a.guardar('reservas', 'r2', { x: 2 })
    await a.guardar('config', 'establecimiento', { nombre: 'H' })
    expect(await a.obtener('reservas', 'r1')).toEqual({ x: 1 })
    expect((await a.listar<{ x: number }>('reservas')).map((r) => r.x).sort()).toEqual([1, 2])
    expect(await a.listar('config')).toHaveLength(1)
    await a.borrar('reservas', 'r1')
    expect(await a.obtener('reservas', 'r1')).toBeUndefined()
    expect(await a.listar('reservas')).toHaveLength(1)
  })

  it('sobrescribe al guardar con el mismo id', async () => {
    const a = await abierto()
    await a.guardar('reservas', 'r1', { v: 1 })
    await a.guardar('reservas', 'r1', { v: 2 })
    expect(await a.obtener('reservas', 'r1')).toEqual({ v: 2 })
    expect(await a.listar('reservas')).toHaveLength(1)
  })

  it('bloqueado no permite leer ni escribir', async () => {
    const a = await abierto()
    await a.guardar('reservas', 'r1', { v: 1 })
    a.bloquear()
    await expect(a.obtener('reservas', 'r1')).rejects.toThrow(/bloqueado/i)
    await expect(a.guardar('reservas', 'r2', {})).rejects.toThrow(/bloqueado/i)
    await expect(a.listar('reservas')).rejects.toThrow(/bloqueado/i)
  })

  it('EN IndexedDB NO HAY TEXTO EN CLARO: nombres, documentos ni siquiera las claves de contenido', async () => {
    const a = await abierto()
    await a.guardar('reservas', 'r1', { nombre: 'Lucía Prueba', doc: '12345678Z', correo: 'lucia@example.com' })
    const crudo = await volcadoCrudo(nombre)
    for (const secreto of ['Lucía', 'Prueba', '12345678Z', 'lucia@example.com', 'nombre', 'correo']) {
      expect(crudo).not.toContain(secreto)
    }
  })

  it('un registro no puede trasplantarse a otro id (AAD): se detecta al leer', async () => {
    const a = await abierto()
    await a.guardar('reservas', 'r1', { v: 'secreto-de-r1' })
    await a.guardar('reservas', 'r2', { v: 'secreto-de-r2' })
    // atacante con acceso al disco: copia el cifrado de r1 sobre r2
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(nombre)
      req.onsuccess = () => {
        const bd = req.result
        const tx = bd.transaction('registros', 'readwrite')
        const st = tx.objectStore('registros')
        const g = st.get('reservas/r1')
        g.onsuccess = () => {
          st.put({ ...g.result, id: 'reservas/r2' })
        }
        tx.oncomplete = () => {
          bd.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
    await expect(a.obtener('reservas', 'r2')).rejects.toThrow()
  })
})

describe('Almacen — cambio de contraseña', () => {
  it('re-cifra todo: la antigua deja de valer y los datos se conservan', async () => {
    const a = await Almacen.abrir(nombre)
    await a.crear('clave-antigua-1', opts)
    await a.guardar('reservas', 'r1', { v: 1 })
    await a.guardar('config', 'establecimiento', { n: 'H' })
    await a.cambiarPassword('clave-antigua-1', 'clave-nueva-22')
    a.bloquear()
    expect(await a.desbloquear('clave-antigua-1')).toBe(false)
    expect(await a.desbloquear('clave-nueva-22')).toBe(true)
    expect(await a.obtener('reservas', 'r1')).toEqual({ v: 1 })
    expect(await a.obtener('config', 'establecimiento')).toEqual({ n: 'H' })
  })

  it('falla si la contraseña actual es incorrecta y no cambia nada', async () => {
    const a = await Almacen.abrir(nombre)
    await a.crear('clave-antigua-1', opts)
    await expect(a.cambiarPassword('equivocada-1', 'clave-nueva-22')).rejects.toThrow()
    a.bloquear()
    expect(await a.desbloquear('clave-antigua-1')).toBe(true)
  })
})

describe('Almacen — borrado total', () => {
  it('"olvidar" elimina la base de datos entera', async () => {
    const a = await Almacen.abrir(nombre)
    await a.crear('clave-del-hostal', opts)
    await a.guardar('reservas', 'r1', { v: 1 })
    await a.destruir()
    const b = await Almacen.abrir(nombre)
    expect(await b.existe()).toBe(false)
  })
})
