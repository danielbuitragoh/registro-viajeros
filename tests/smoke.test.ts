describe('entorno de pruebas', () => {
  it('tiene Web Crypto con subtle (AES-GCM / PBKDF2)', () => {
    expect(globalThis.crypto.subtle).toBeDefined()
  })
  it('tiene IndexedDB (fake-indexeddb)', () => {
    expect(globalThis.indexedDB).toBeDefined()
  })
  it('tiene DOMParser (jsdom) para validar el XML exportado', () => {
    const doc = new DOMParser().parseFromString('<a><b/></a>', 'application/xml')
    expect(doc.documentElement.nodeName).toBe('a')
  })
})
