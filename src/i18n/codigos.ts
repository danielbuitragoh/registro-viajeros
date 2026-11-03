/**
 * Texto visible de los códigos oficiales que ve el huésped, en los idiomas que no están en la transcripción
 * (src/oficial/codigos.ts trae es/en). Aquí SOLO se traduce la etiqueta: los códigos son siempre los de las tablas del
 * apartado 8 de docs/oficial/Instrucciones.pdf, y tsc + tests/i18n.test.ts comprueban que no falta ni sobra ninguno.
 */
import { PARENTESCO, SEXO, TIPO_DOCUMENTO, type CodigoParentesco, type CodigoSexo, type CodigoTipoDocumento } from '../oficial/codigos'
import type { Idioma } from './textos'

type IdiomaExtra = Exclude<Idioma, 'es' | 'en'>

interface Etiquetas {
  PARENTESCO: Record<CodigoParentesco, string>
  SEXO: Record<CodigoSexo, string>
  TIPO_DOCUMENTO: Record<CodigoTipoDocumento, string>
}

export const ETIQUETAS_CODIGOS: Record<IdiomaExtra, Etiquetas> = {
  fr: {
    PARENTESCO: { AB: 'Grand-parent', BA: 'Arrière-grand-parent', BN: 'Arrière-petit-enfant', CD: 'Beau-frère / belle-sœur', CY: 'Conjoint(e)', HJ: 'Fils / fille', HR: 'Frère / sœur', NI: 'Petit-enfant', PM: 'Père ou mère', SB: 'Neveu / nièce', SG: 'Beau-père / belle-mère', TI: 'Oncle / tante', YN: 'Gendre ou belle-fille', TU: 'Tuteur / tutrice légal(e)', OT: 'Autre' },
    SEXO: { H: 'Homme', M: 'Femme', O: 'Autre' },
    TIPO_DOCUMENTO: { NIF: 'Carte d’identité espagnole (DNI / NIF)', NIE: 'Numéro d’étranger en Espagne (NIE)', PAS: 'Passeport', OTRO: 'Autre document' },
  },
  de: {
    PARENTESCO: { AB: 'Großelternteil', BA: 'Urgroßelternteil', BN: 'Urenkel/in', CD: 'Schwager / Schwägerin', CY: 'Ehepartner/in', HJ: 'Sohn / Tochter', HR: 'Bruder / Schwester', NI: 'Enkel/in', PM: 'Vater oder Mutter', SB: 'Neffe / Nichte', SG: 'Schwiegervater / Schwiegermutter', TI: 'Onkel / Tante', YN: 'Schwiegersohn oder Schwiegertochter', TU: 'Vormund', OT: 'Sonstiges' },
    SEXO: { H: 'Männlich', M: 'Weiblich', O: 'Divers' },
    TIPO_DOCUMENTO: { NIF: 'Spanischer Personalausweis (DNI / NIF)', NIE: 'Ausländer-Identifikationsnummer in Spanien (NIE)', PAS: 'Reisepass', OTRO: 'Anderes Dokument' },
  },
  it: {
    PARENTESCO: { AB: 'Nonno/a', BA: 'Bisnonno/a', BN: 'Pronipote', CD: 'Cognato/a', CY: 'Coniuge', HJ: 'Figlio/a', HR: 'Fratello / sorella', NI: 'Nipote (di nonno)', PM: 'Padre o madre', SB: 'Nipote (di zio)', SG: 'Suocero/a', TI: 'Zio/a', YN: 'Genero o nuora', TU: 'Tutore legale', OT: 'Altro' },
    SEXO: { H: 'Uomo', M: 'Donna', O: 'Altro' },
    TIPO_DOCUMENTO: { NIF: 'Carta d’identità spagnola (DNI / NIF)', NIE: 'Numero di identità per stranieri in Spagna (NIE)', PAS: 'Passaporto', OTRO: 'Altro documento' },
  },
  pt: {
    PARENTESCO: { AB: 'Avô / avó', BA: 'Bisavô / bisavó', BN: 'Bisneto/a', CD: 'Cunhado/a', CY: 'Cônjuge', HJ: 'Filho/a', HR: 'Irmão / irmã', NI: 'Neto/a', PM: 'Pai ou mãe', SB: 'Sobrinho/a', SG: 'Sogro/a', TI: 'Tio/a', YN: 'Genro ou nora', TU: 'Tutor/a legal', OT: 'Outro' },
    SEXO: { H: 'Homem', M: 'Mulher', O: 'Outro' },
    TIPO_DOCUMENTO: { NIF: 'Documento de identidade espanhol (DNI / NIF)', NIE: 'Número de identificação de estrangeiro em Espanha (NIE)', PAS: 'Passaporte', OTRO: 'Outro documento' },
  },
}

const OFICIALES = { PARENTESCO, SEXO, TIPO_DOCUMENTO } as const

/** Etiqueta visible de un código oficial en el idioma pedido (es/en de la transcripción oficial; el resto, de aquí). */
export function etiquetaCodigo(tabla: keyof Etiquetas, codigo: string, idioma: Idioma): string {
  const oficial = (OFICIALES[tabla] as Record<string, { es: string; en: string }>)[codigo]
  if (!oficial) return codigo
  if (idioma === 'es' || idioma === 'en') return oficial[idioma]
  return (ETIQUETAS_CODIGOS[idioma][tabla] as Record<string, string>)[codigo] ?? oficial.en
}

/** Opciones de un desplegable de códigos oficiales, en su orden oficial. */
export const opcionesCodigo = (tabla: keyof Etiquetas, idioma: Idioma) => Object.keys(OFICIALES[tabla]).map((valor) => ({ valor, texto: etiquetaCodigo(tabla, valor, idioma) }))
