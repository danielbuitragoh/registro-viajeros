# Lectura del documento oficial (Instrucciones.pdf v1.1.0)

Fuente única de verdad del formato: `docs/oficial/Instrucciones.pdf`
("Alta masiva de comunicaciones – Hospedajes", v1.1.0, 08-01-2024, Ministerio del Interior, SGSICS).
Este fichero resume **lo que dice el documento** y **lo que NO dice** (pendientes).
Si el código y este fichero discrepan con el PDF, manda el PDF.

## Lo que el documento establece (y el código implementa)

- Formato del fichero: **XML**. Un fichero puede contener varias comunicaciones, pero **todas del mismo tipo**
  (partes de viajeros, reservas de hospedaje, alquileres de vehículos…). (§2)
- Estructura (figuras 1 y 2): `peticion > solicitud > …`
  - **Parte de viajeros (§3)**: `solicitud` = `codigoEstablecimiento` + `comunicacion` (1..n).
    `comunicacion` = `contrato` + `persona` (1..n).
  - **Reserva de hospedaje (§4)**: `solicitud` = `comunicacion` (1..n).
    `comunicacion` = `establecimiento` (`codigo` | `datosEstablecimiento{tipo,nombre,direccion}`) + `contrato` + `persona` (1..n).
  - Los apartados 5 y 6 (vehículos) **no aplican** a un alojamiento y no se implementan.
- `contrato`: `referencia` String(50) · `fechaContrato` AAAA-MM-DD · `fechaEntrada` y `fechaSalida`
  AAAA-MM-DDThh:mm:ss (si se desconoce la hora, `T00:00:00`, solo §4) · `numPersonas` · `numHabitaciones` (opc.)
  · `internet` (opc.) · `pago`.
- `persona` (§3): `rol` (TI|VI; al menos un VI) · `nombre` ≤50 · `apellido1` ≤50 · `apellido2` ≤50 (obligatorio si tipoDocumento = NIF)
  · `tipoDocumento` (obligatorio si mayor de edad) · `documento/numeroDocumento` ≤15 (ídem; formato válido para NIF/NIE)
  · `soporteDocumento` ≤9 (obligatorio si NIF o NIE) · `fechaNacimiento` (obligatoria) · `nacionalidad` ISO 3166-1 alfa-3 (opc.)
  · `sexo` (opc.) · `direccion` (obligatoria) · `telefono`/`telefono2`/`correo`: **al menos uno de los tres**
  · `parentesco` (obligatorio en al menos un adulto si hay un menor en la comunicación).
- `persona` (§4): casi todo opcional salvo `rol`, `nombre`, `apellido1`; no existe `soporteDocumento` ni `parentesco`;
  debe haber un bloque TI (titular) y tantos VI como viajeros se conozcan.
- `direccion` (§7.1): `direccion` ≤100 · `direccionComplementaria` ≤100 (opc.) · `codigoMunicipio` 5 dígitos INE
  (obligatorio si país = España) · `nombreMunicipio` ≤100 (obligatorio si país ≠ España) · `codigoPostal` ≤20 · `pais` ISO 3166-1 alfa-3.
- `pago` (§7.2): `tipoPago` (obligatorio) · `fechaPago` AAAA-MM-DD · `medioPago` ≤50 · `titular` ≤100 · `caducidadTarjeta` MM/AAAA.
- Tablas de códigos usadas (§8): parentesco (8.3), sexo (8.4), tipos de documento (8.5), tipos de establecimiento (8.6), tipos de pago (8.7).
  Se transcriben en `src/oficial/codigos.ts` y un test comprueba su contenido.

## Pendientes: lo que el documento NO deja claro

Cada punto está marcado en el código con `// PENDIENTE-OFICIAL:` y listado en el README.

| # | Pendiente | Qué hace la app mientras tanto |
|---|-----------|--------------------------------|
| P1 | No se incluye el XSD ni la plantilla descargable: no hay **espacio de nombres**, prefijos ni declaración XML. | Emite `<?xml version="1.0" encoding="UTF-8"?>` y elementos sin espacio de nombres. **Contrastar con la plantilla real del portal antes de enviar.** |
| P2 | Discrepancia §3: la tabla llama `documento` al campo que la figura 1 y el §4 llaman `numeroDocumento`. | Usa `numeroDocumento` (figura = esquema). |
| P3 | No se define el formato del campo `internet` (Booleano): ¿`true/false`, `1/0`, `S/N`? | **No se emite** (es opcional). |
| P4 | No hay tabla de **códigos de municipio INE** ni de países (solo se cita ISO 3166-1 alfa-3 y "INE, 5 dígitos"). | El INE se valida por formato (5 dígitos). Si se añade el fichero oficial del INE en `docs/oficial/ine/` (README → «Códigos de municipio INE»), autocompletado y **avisos** (no errores) de códigos que no figuran o se dieron de baja. Sin ese fichero no hay ningún código en la app. Los países usan la lista ISO 3166-1 (estándar citado, no incluido en el PDF); revisar vigencia. |
| P5 | El documento **no incluye el "código de arrendador"** (solo `codigoEstablecimiento`). | Se guarda como dato interno opcional y **no se exporta**. |
| P6 | No define **cuándo es "mayor de edad"** ni respecto a qué fecha se calcula. | 18 años (mayoría de edad en España), calculada a la fecha de entrada. |
| P7 | `parentesco` es un único campo por persona sin indicar a qué menor se refiere. | Se exporta en el adulto designado como acompañante; con varios menores y parentescos distintos se avisa. |
| P8 | No dice si el titular que también se aloja debe repetirse (TI + VI) ni si el TI es obligatorio en partes de viajeros. | En partes: solo bloques VI. En reservas: un TI (el viajero marcado como titular) + los VI. |
| P9 | No define el formato de teléfono ni de correo más allá de longitud y "formato válido". | Validación permisiva (E.164-like y correo básico). |
| P10 | Longitudes del `soporteDocumento` y formatos concretos por país de pasaporte: no están en el documento. | Soporte: alfanumérico ≤9. Pasaporte: formato por país **orientativo** (aviso, no bloqueo). |
| P11 | Tipo `String` sin límite en `numeroDocumento` de la tabla de vehículos, etc.: irrelevante aquí. | — |
| P12 | No dice desde cuándo cuentan las 24 h ni los 3 años de conservación (eso es el RD 933/2021, no este documento). | 24 h desde la entrada prevista; 3 años desde la fecha de salida. Confirmar con el RD y con asesoría. |
| P13 | Canal de reserva (Booking, directo…) no existe en el fichero. | Dato interno, no se exporta. |
| P14 | Cómo/dónde se sube el fichero y qué errores devuelve el sistema: fuera del alcance del documento. | La app solo genera y valida el fichero; el envío es manual en el portal. |
| P15 | "Código INE, 5 dígitos" (§7.1): no dice si incluye el dígito de control (DC) que el INE publica junto a CPRO y CMUN. | Se usa CPRO (2) + CMUN (3) = 5 dígitos, sin DC (es lo único que cuadra con «5 dígitos»). Confirmar con el portal. |
