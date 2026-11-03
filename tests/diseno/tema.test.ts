import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aplicarTema, leerTema, TEMAS } from '../../src/diseno/tema'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('tema claro / oscuro', () => {
  it('por defecto sigue al sistema (no fija data-theme)', () => {
    expect(leerTema()).toBe('auto')
    aplicarTema(leerTema())
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('se puede fijar claro u oscuro, se recuerda en este navegador y se vuelve a automático', () => {
    expect([...TEMAS]).toEqual(['auto', 'claro', 'oscuro'])
    aplicarTema('oscuro')
    expect(document.documentElement.dataset.theme).toBe('oscuro')
    expect(leerTema()).toBe('oscuro')
    aplicarTema('claro')
    expect(document.documentElement.dataset.theme).toBe('claro')
    aplicarTema('auto')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(leerTema()).toBe('auto')
  })

  it('un valor guardado desconocido se ignora', () => {
    localStorage.setItem('rv-tema', 'fucsia')
    expect(leerTema()).toBe('auto')
  })

  it('si el navegador bloquea el almacenamiento, no rompe: aplica el tema solo en esta visita', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(leerTema()).toBe('auto')
    expect(() => aplicarTema('oscuro')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('oscuro')
    get.mockRestore()
    set.mockRestore()
  })
})
