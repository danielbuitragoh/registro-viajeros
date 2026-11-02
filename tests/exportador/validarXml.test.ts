import { describe, expect, it } from 'vitest'
import { construirXml } from '../../src/exportador/construir'
import { validarXml } from '../../src/exportador/validarXml'
import { adulto, establecimiento, extranjero, menor, reserva } from '../fixtures'

const buenoPartes = () =>
  construirXml(establecimiento(), [reserva({ viajeros: [adulto(), menor()], numPersonas: 2 })], 'partes')
const buenoReservas = () =>
  construirXml(establecimiento(), [reserva({ viajeros: [adulto({ esTitular: true }), extranjero()], numPersonas: 2 })], 'reservas')

const codigos = (xml: string, tipo: 'partes' | 'reservas') => validarXml(xml, tipo).map((e) => e.codigo)

describe('validarXml — el XML generado correctamente pasa', () => {
  it('partes', () => expect(validarXml(buenoPartes(), 'partes')).toEqual([]))
  it('reservas', () => expect(validarXml(buenoReservas(), 'reservas')).toEqual([]))
})

describe('validarXml — detecta ficheros defectuosos (segunda barrera independiente del constructor)', () => {
  it('XML mal formado', () => {
    expect(codigos('<peticion><solicitud>', 'partes')).toContain('xml_mal_formado')
    expect(codigos('', 'partes')).toContain('xml_mal_formado')
  })

  it('raíz incorrecta', () => {
    expect(codigos('<otra/>', 'partes')).toContain('xml_raiz_invalida')
  })

  it('falta un elemento obligatorio', () => {
    const xml = buenoPartes().replace(/<referencia>.*<\/referencia>\n\s*/, '')
    expect(codigos(xml, 'partes')).toContain('xml_elemento_falta')
  })

  it('elemento fuera de orden', () => {
    const xml = buenoPartes().replace(/(<nombre>.*<\/nombre>)(\s*)(<apellido1>.*<\/apellido1>)/, '$3$2$1')
    expect(codigos(xml, 'partes')).toContain('xml_orden_invalido')
  })

  it('elemento desconocido (no está en el documento oficial)', () => {
    const xml = buenoPartes().replace('</contrato>', '<campoInventado>x</campoInventado></contrato>')
    expect(codigos(xml, 'partes')).toContain('xml_elemento_desconocido')
  })

  it('"internet" no se emite hasta aclarar su formato (P3): si aparece, se avisa', () => {
    const xml = buenoPartes().replace('<pago>', '<internet>true</internet><pago>')
    expect(codigos(xml, 'partes')).toContain('xml_elemento_desconocido')
  })

  it('campo vacío', () => {
    const xml = buenoPartes().replace(/<nombre>[^<]*<\/nombre>/, '<nombre></nombre>')
    expect(codigos(xml, 'partes')).toContain('xml_valor_vacio')
  })

  it('longitud máxima (String(50) en nombre)', () => {
    const xml = buenoPartes().replace(/<nombre>[^<]*<\/nombre>/, `<nombre>${'x'.repeat(51)}</nombre>`)
    expect(codigos(xml, 'partes')).toContain('xml_longitud_max')
  })

  it('formato de fecha y de fecha-hora', () => {
    expect(codigos(buenoPartes().replace('2026-10-20', '20/10/2026'), 'partes')).toContain('xml_formato_fecha')
    expect(codigos(buenoPartes().replace('2026-11-02T15:00:00', '2026-11-02T15:00'), 'partes')).toContain('xml_formato_fecha')
  })

  it('código fuera de las tablas oficiales', () => {
    expect(codigos(buenoPartes().replace('<tipoPago>EFECT', '<tipoPago>BIZUM'), 'partes')).toContain('xml_codigo_invalido')
    expect(codigos(buenoPartes().replace('<rol>VI</rol>', '<rol>XX</rol>'), 'partes')).toContain('xml_codigo_invalido')
    expect(codigos(buenoPartes().replace('<sexo>M</sexo>', '<sexo>F</sexo>'), 'partes')).toContain('xml_codigo_invalido')
  })

  it('país no ISO alfa-3', () => {
    expect(codigos(buenoPartes().replaceAll('<pais>ESP</pais>', '<pais>ES</pais>'), 'partes')).toContain('xml_pais_invalido')
  })

  it('numPersonas no numérico', () => {
    expect(codigos(buenoPartes().replace('<numPersonas>2', '<numPersonas>dos'), 'partes')).toContain('xml_numero_invalido')
  })

  it('salida anterior a la entrada', () => {
    expect(codigos(buenoPartes().replace('2026-11-05T11:00:00', '2026-11-01T11:00:00'), 'partes')).toContain('xml_salida_anterior_entrada')
  })

  it('DNI con letra de control incorrecta', () => {
    expect(codigos(buenoPartes().replace('12345678Z', '12345678A'), 'partes')).toContain('xml_documento_invalido')
  })

  it('España sin código de municipio / extranjero sin nombre de municipio', () => {
    expect(codigos(buenoPartes().replace(/<codigoMunicipio>.*<\/codigoMunicipio>\s*/, ''), 'partes')).toContain('xml_municipio_requerido')
    const x = construirXml(establecimiento(), [reserva({ viajeros: [extranjero()] })], 'partes')
    expect(codigos(x.replace(/<nombreMunicipio>.*<\/nombreMunicipio>\s*/, ''), 'partes')).toContain('xml_municipio_requerido')
  })

  it('persona sin ningún medio de contacto', () => {
    const x = construirXml(establecimiento(), [reserva({ viajeros: [adulto({ telefono: undefined, correo: '' , telefono2: '600111222' })] })], 'partes')
    const sinContacto = x.replace(/<telefono2>.*<\/telefono2>\s*/, '')
    expect(codigos(sinContacto, 'partes')).toContain('xml_contacto_requerido')
  })

  it('apellido2 ausente con documento NIF; soporte ausente con NIF/NIE', () => {
    expect(codigos(buenoPartes().replace(/<apellido2>Ejemplo<\/apellido2>\s*/, ''), 'partes')).toContain('xml_apellido2_requerido')
    expect(codigos(buenoPartes().replace(/<soporteDocumento>.*<\/soporteDocumento>\s*/, ''), 'partes')).toContain('xml_soporte_requerido')
  })

  it('menor de edad sin ningún adulto con parentesco', () => {
    expect(codigos(buenoPartes().replace(/<parentesco>.*<\/parentesco>\s*/, ''), 'partes')).toContain('xml_parentesco_requerido')
  })

  it('adulto sin tipo/número de documento', () => {
    const xml = buenoPartes().replace(/<tipoDocumento>NIF<\/tipoDocumento>\s*<numeroDocumento>.*<\/numeroDocumento>\s*<soporteDocumento>.*<\/soporteDocumento>\s*/, '')
    expect(codigos(xml, 'partes')).toContain('xml_documento_requerido')
  })

  it('parte sin ningún viajero (VI)', () => {
    expect(codigos(buenoPartes().replaceAll('<rol>VI</rol>', '<rol>TI</rol>'), 'partes')).toContain('xml_viajero_requerido')
  })

  it('reserva sin titular (TI) o con establecimiento ambiguo', () => {
    expect(codigos(buenoReservas().replace('<rol>TI</rol>', '<rol>VI</rol>'), 'reservas')).toContain('xml_titular_requerido')
    const ambiguo = buenoReservas().replace('<codigo>0000012345</codigo>', '<codigo>0000012345</codigo><datosEstablecimiento><tipo>HOSTAL</tipo><nombre>X</nombre><direccion><direccion>c</direccion><codigoMunicipio>28079</codigoMunicipio><codigoPostal>28001</codigoPostal><pais>ESP</pais></direccion></datosEstablecimiento>')
    expect(codigos(ambiguo, 'reservas')).toContain('xml_establecimiento_ambiguo')
  })

  it('cada error indica la ruta del elemento', () => {
    const e = validarXml(buenoPartes().replace(/<nombre>[^<]*<\/nombre>/, '<nombre></nombre>'), 'partes')
    expect(e[0]?.campo).toMatch(/comunicacion\[1\]\/persona\[1\]\/nombre/)
  })
})
