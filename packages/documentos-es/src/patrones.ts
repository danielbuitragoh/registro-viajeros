/** DNI: 8 cifras y una letra. */
export const RE_DNI = /^(\d{8})([A-Z])$/
/** NIE: X, Y o Z, 7 cifras y una letra. */
export const RE_NIE = /^([XYZ])(\d{7})([A-Z])$/
/** NIF de persona física «especial»: K, L o M, 7 cifras y una letra (menores, residentes en el extranjero…). */
export const RE_NIF_ESPECIAL = /^[KLM]\d{7}[A-Z]$/
/** CIF: letra de entidad, 7 cifras y un carácter de control (cifra o letra de J, A–I). */
export const RE_CIF = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/
