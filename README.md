# Registro de viajeros

Registro de viajeros **libre, sencillo y local-first** para alojamientos pequeños en España (pensiones, pisos turísticos, casas rurales, hostales…). Prepara y valida el fichero de **alta masiva** de SES.Hospedajes sin servidor, sin cuentas y sin que nadie más tenga tus datos.

> ## ⚠️ Aviso importante
> **Esta es una herramienta no oficial.** No está afiliada ni respaldada por el Ministerio del Interior. **No envía nada al Ministerio**: genera y valida un fichero que **tú debes subir** al portal SES.Hospedajes. **El establecimiento sigue siendo el único responsable** de comunicar los datos dentro de plazo y de que sean correctos. Lee la sección [Qué está validado y qué no](#qué-está-validado-contra-el-documento-oficial-y-qué-no) antes de usarla en producción, y contrasta siempre el primer fichero con la plantilla real del portal.

![Lista del día en recepción, con el estado de cada parte y el aviso de 24 h](docs/img/captura-lista-dia.png)

## Qué problema resuelve y para quién

Desde el 2-dic-2024 (Real Decreto 933/2021) los alojamientos deben comunicar al Ministerio del Interior los datos de cada contrato/reserva y de cada viajero **en 24 horas**, y conservarlos **3 años**. Los alojamientos pequeños acaban rellenándolo a mano o pagando herramientas comerciales que se quedan con los datos de sus huéspedes.

**Para quién:** quien lleva la recepción de un alojamiento pequeño y quiere (1) que los huéspedes rellenen sus datos desde el móvil, (2) saber de un vistazo qué partes están completos y cuáles vencen, y (3) generar el fichero oficial sin pasar los datos por un tercero. Ver [¿Para quién es?](#para-quién-es).

## ¿Para quién es?

| | **Alojamiento SIN programa de gestión** | **Alojamiento CON programa de gestión (PMS)** |
|---|---|---|
| Ejemplos | Pensiones, pisos y apartamentos turísticos, casas rurales, casas de huéspedes | Hostales y hoteles que ya usan un programa de recepción |
| Problema | Rellenar a mano en el portal, o pagar una herramienta que se queda con los datos | El programa ya registra (y a menudo comunica) los partes, pero teclear los datos del huésped en el mostrador lleva tiempo |
| Para qué sirve la app | **Todo el circuito:** reservas, fichas desde el móvil del huésped, revisión, aviso de 24 h y **fichero XML validado** para subir a SES.Hospedajes | **Solo pre-check-in:** el huésped rellena su ficha en su móvil (6 idiomas) y la entrega como **PDF, papel o QR**; recepción la lee y la pasa a su programa |
| Lo que NO debes hacer | — | **No exportes ni subas también el XML** si tu programa ya comunica los partes: el mismo parte se comunicaría dos veces. Pregunta a tu proveedor qué comunica exactamente |

La ficha que descarga el huésped lleva cada dato con su etiqueta **en español y en su idioma** (p. ej. «Tipo de documento / Ausweisart: Pasaporte / Reisepass»), así que el personal la puede transcribir aunque no hable alemán. En los dos casos, el huésped no necesita instalar nada ni crear cuentas.

## Demo

**https://danielbuitragoh.github.io/registro-viajeros/** — datos 100 % ficticios; todo ocurre en tu navegador. Contraseña de la demo: `demo-hostal-2026`.

> La demo se despliega con GitHub Actions al fusionar en `main` (ver `.github/workflows/pages.yml`). Hace falta una única vez activar *Settings → Pages → Source: GitHub Actions* en el repositorio.

<p>
  <img src="docs/img/captura-huesped.png" alt="Formulario del huésped en el móvil, en francés, con el selector de idioma" width="240">
  <img src="docs/img/captura-ficha-pdf.png" alt="Ficha del huésped en PDF: datos con etiquetas en español y francés y el QR del código cifrado" width="330">
</p>
<p>
  <img src="docs/img/captura-lector-qr.png" alt="Recepción: lector de QR con la cámara abierta" width="420">
  <img src="docs/img/captura-exportar.png" alt="Exportación: fichero XML validado contra el documento oficial" width="380">
</p>

*Capturas reales de la demo (datos ficticios): formulario del huésped en francés · ficha en PDF generada en el móvil · lector de QR en recepción (en la captura, la cámara simulada de Chromium) · exportación validada.*

## Guía de 5 minutos para el dueño de un alojamiento

Lo justo para empezar hoy. Necesitas un ordenador o una tablet en recepción con Chrome, Edge, Firefox o Safari actualizados.

1. **Minuto 1. Abre la app** (la dirección que publiques o la [demo](https://danielbuitragoh.github.io/registro-viajeros/) para probar) y **crea la contraseña del establecimiento**. Usa una frase larga y guárdala en un sitio seguro: **no se puede recuperar**.
2. **Minuto 2. Ajustes → Establecimiento:** nombre, tipo y **código de establecimiento** (el que te dio SES.Hospedajes al registrarte). Pulsa *Guardar establecimiento*.
3. **Minuto 3. Nueva reserva:** referencia, entrada, salida y nº de personas. Pulsa *Guardar reserva*.
4. **Minuto 4. Crear enlace para el huésped** y envíaselo por WhatsApp o correo (o enséñale el QR en el mostrador). Elige su idioma: español, inglés, francés, alemán, italiano o portugués. El huésped rellena su ficha en el móvil y te enseña un **QR**.
5. **Minuto 5. Escanear el QR con la cámara** (en la propia reserva): las fichas se importan solas. Si el parte sale *Completo*, ve a **Exportar → Validar y generar fichero → Descargar XML** y **súbelo tú al portal SES.Hospedajes**.

Y una costumbre: **Ajustes → Copia de seguridad cifrada** una vez por semana, guardada fuera de ese equipo. Los datos solo viven en ese dispositivo.

> ¿Tienes programa de gestión? Haz solo los pasos 1, 3 y 4 (como pre-check-in) y pasa los datos de la ficha a tu programa; no subas el XML si tu programa ya comunica los partes.

## Cómo usarlo, paso a paso (detalle)

1. **Primer uso** (en el ordenador/tablet de recepción): abre la app, crea la **contraseña del establecimiento** y guárdala en un sitio seguro. No se puede recuperar.
2. **Ajustes → Establecimiento:** nombre, tipo (Hostal…) y **código de establecimiento** (lo asigna el Sistema de Hospedajes al registrarte).
3. **Nueva reserva:** referencia, fechas de entrada/salida previstas, nº de personas, habitación, canal y forma de pago.
4. **Que el huésped rellene su ficha:** en la reserva pulsa *Crear enlace para el huésped* y envíale el enlace (o enséñale el QR). Desde su móvil, en **español, inglés, francés, alemán, italiano o portugués**, rellena una ficha por viajero y obtiene un **código cifrado** (QR, texto o archivo). En recepción pulsas *Escanear el QR con la cámara* (o lees el QR de una foto, o pegas el código) y las fichas se importan. Si el alojamiento lo pide, el huésped puede además **descargar su ficha en PDF o imprimirla** (pre-check-in). Si prefieres, rellénalas tú en recepción.
5. **Revisa la reserva:** la sección *Revisión del parte* te dice, con mensajes claros, qué falta (p. ej. «la letra de control debería ser Z», o el código INE del municipio, que el huésped no suele conocer).
6. **Lista del día (Hoy):** estado de cada parte (*pendiente / completo / exportado*) y **aviso de 24 h** (vencidos, y los que vencen en menos de 6 h).
7. **Exportar:** elige el tipo de fichero (*partes de viajeros* o *reservas de hospedaje*), marca las reservas, pulsa *Validar y generar fichero*. Solo se puede descargar si supera la validación.
8. **Súbelo tú al portal SES.Hospedajes.** Hasta que no lo subas, la comunicación **no está hecha**, aunque la app lo marque como «exportado».
9. **Copias de seguridad:** *Ajustes → Copia de seguridad cifrada* (descarga un fichero cifrado). Hazla periódicamente: los datos viven solo en ese dispositivo.

## Decisiones de diseño

- **Local-first y sin servidor.** No hay backend, cuentas, analítica ni llamadas externas (la política de seguridad del navegador, CSP, solo permite recursos propios). Es la única forma de que el hostal no dependa de —ni entregue sus datos a— un tercero. Coste: los datos viven en un dispositivo, así que importa la copia de seguridad.
- **Cifrado en reposo.** Todo en IndexedDB, cifrado con **AES-256-GCM**; la clave se deriva de la contraseña del establecimiento con **PBKDF2-SHA256 (600 000 iteraciones)** y no es exportable. Cada registro se cifra ligado a su identificador (AAD): un registro copiado a otro id se detecta. Se bloquea solo tras 15 min sin actividad.
- **¿Cómo llega la ficha del móvil del huésped a recepción sin servidor?** El enlace/QR va en el *fragmento* de la URL (`#…`, que no viaja a ningún servidor) y contiene solo datos de la reserva (nada personal) y una clave aleatoria de 256 bits. El huésped rellena la ficha en su móvil y esta se cifra con esa clave en un **código de envío** ligado a la reserva, que entrega por texto, QR o archivo. Recepción lo importa. Alternativas descartadas: un servidor de paso (rompe el principio sin servidor) o WebRTC (necesita señalización).
- **Lector de QR sin red.** Si el navegador tiene `BarcodeDetector` con QR (Chrome/Edge en Android, macOS, ChromeOS…) se usa; si no, [jsQR](https://github.com/cozmo/jsQR) empaquetado en la propia app (JavaScript puro, sin dependencias ni llamadas a internet). La cámara se apaga al leer, al cancelar o al salir. Si se escanea por error el QR del *enlace*, la app lo explica.
- **Ficha del huésped en PDF sin servidor.** El PDF se genera en el móvil con un escritor mínimo propio (PDF 1.4, fuentes estándar, QR vectorial); no hace falta ninguna librería. Si un nombre usa un alfabeto que esas fuentes no tienen (cirílico, chino…), se avisa y se ofrece *Imprimir ficha*, que usa el navegador y admite cualquier alfabeto. El QR del PDF se ha comprobado leyéndolo de la página rasterizada.
- **Idiomas del huésped:** español, inglés, francés, alemán, italiano y portugués. Solo se traducen los textos visibles; los códigos que se exportan son siempre los de las tablas oficiales. Las pruebas comprueban que ningún idioma pierde ni añade claves. *Traducciones hechas con ayuda de IA: conviene que las revise una persona nativa.*
- **El huésped no queda bloqueado por datos que no puede saber** (código INE del municipio): recepción los completa.
- **Dos barreras de validación en la exportación:** (1) reglas del modelo y (2) un validador **independiente** que reparsea el XML ya generado contra un esquema transcrito del PDF. Si el constructor tuviera un fallo, no llegaría a descargarse.
- **Purga a los 3 años**, con aviso 30 días antes. Como todo está cifrado, la purga se ejecuta al desbloquear la app.
- **Accesibilidad (objetivo WCAG 2.2 AA):** etiquetas visibles, errores asociados a su campo y resumen de errores enfocable, `autocomplete`, objetivos táctiles ≥ 48 px, estados con texto e icono (no solo color), no pedir dos veces el mismo dato (copiar la dirección del viajero 1), contraseña sin bloqueo de pegado, `lang` correcto por idioma, contraste verificado numéricamente en tests. *Verificado con axe y con pruebas; no sustituye una auditoría con usuarios y lectores de pantalla reales.*

## Qué está validado contra el documento oficial y qué no

Fuente única de verdad: [`docs/oficial/Instrucciones.pdf`](docs/oficial/Instrucciones.pdf) («Alta masiva de comunicaciones Hospedajes», v1.1.0, 08-01-2024). Mi lectura completa, campo por campo, está en [`docs/oficial/NOTAS.md`](docs/oficial/NOTAS.md). En el código, cada punto pendiente lleva el marcador `PENDIENTE-OFICIAL`.

**Validado contra el documento (con pruebas):** estructura `peticion > solicitud > comunicacion` y orden de elementos de las figuras 1 y 2 · un solo tipo de comunicación por fichero · campos, longitudes máximas y obligatoriedades (incluidas las condicionales: apellido2 con NIF, soporte con NIF/NIE, documento si es mayor de edad, «teléfono, teléfono2 o correo», parentesco si hay un menor, municipio INE si el país es España y nombre si no) · formatos de fecha (`AAAA-MM-DD`, `AAAA-MM-DDThh:mm:ss`) · bloques `direccion` y `pago` · tablas de códigos 8.3–8.7 (parentesco, sexo, documento, establecimiento, pago) y roles TI/VI · DNI y NIE con su letra de control (tabla completa de los 23 restos) y CIF.

**Pendiente / no verificado (no inventado):**

| # | Pendiente | Qué hace la app |
|---|-----------|-----------------|
| P1 | El PDF no incluye XSD ni espacio de nombres ni declaración XML | Emite `<?xml … UTF-8?>` y elementos sin namespace. **Contrastar con la plantilla real del portal** |
| P2 | La tabla del §3 dice `documento`; la figura 1 y el §4 dicen `numeroDocumento` | Usa `numeroDocumento` |
| P3 | Formato del campo `internet` (Booleano) sin definir | No lo emite (es opcional) |
| P4 | No hay tabla de municipios INE ni de países | INE: solo formato (5 dígitos). Países: lista ISO 3166-1 (norma citada por el PDF), revisar vigencia |
| P5 | El PDF no tiene «código de arrendador» | Dato interno opcional, **no se exporta** |
| P6 | «Mayor de edad» sin definir | 18 años a la fecha de entrada |
| P7 | `parentesco` es un solo campo por persona sin decir a qué menor se refiere | Se informa en el adulto acompañante; con varios menores y parentescos distintos, aviso |
| P8 | No dice si el titular que se aloja se repite (TI + VI) | Partes: solo VI. Reservas: un TI + los VI |
| P9 | Formato de teléfono/correo no definido | Validación permisiva |
| P10 | Formato exacto del soporte y de pasaportes por país | Soporte alfanumérico ≤ 9. Pasaporte por país **orientativo** (aviso, nunca bloquea) |
| P12 | Cómputo de las 24 h y de los 3 años (viene del RD, no del PDF) | 24 h desde la entrada prevista; 3 años desde la salida. Confirmar con asesoría |
| P14 | Subida al portal y errores que devuelve el sistema | Fuera de alcance: la subida es manual |

Además: el «canal de reserva» y la habitación son datos internos y no se exportan; los NIF que empiezan por K, L o M se aceptan por formato sin verificar el control; **no se ha podido probar el fichero contra el portal real**.

## Limitaciones conocidas de esta versión

- **Traducciones** (francés, alemán, italiano, portugués): hechas con ayuda de IA y comprobadas por pruebas (claves y marcadores completos), pero **sin revisión nativa**.
- **Lector de QR:** la lectura real con cámara está probada en Chromium (alternativa jsQR). La vía `BarcodeDetector` (Android, macOS) solo está probada con simulaciones; conviene probarla en un móvil Android real.
- **PDF del huésped:** solo alfabeto latino (WinAnsi). Con otros alfabetos la app avisa y ofrece imprimir.
- **`npm audit`:** quedan avisos moderados y bajos en herramientas de desarrollo (ESLint, typescript-eslint, vite-plugin-pwa), no en el código que llega al navegador; npm solo propone bajar a versiones antiguas, así que se vigilan hasta que haya versiones corregidas.

## Privacidad y límites de seguridad

- Sin analítica, sin cookies, sin peticiones externas (comprobado en navegador real: cero peticiones a otros dominios).
- Quien tenga acceso al dispositivo **desbloqueado**, o a la contraseña, verá los datos. Si alguien copia la base de datos cifrada, solo la fuerza bruta contra la contraseña (frenada por PBKDF2) la abriría: usa una frase larga.
- El enlace del huésped contiene la clave de su código de envío: trátalo como confidencial y no lo publiques.
- La **ficha en PDF o impresa** del huésped **no va cifrada** (es para leerla): la app se lo advierte al huésped. En recepción, trátala como cualquier documento con datos personales y destrúyela cuando ya no haga falta.
- El borrado de reservas (purga o manual) se hace en este dispositivo; las copias de seguridad que hayas descargado son tu responsabilidad.
- No es una auditoría de seguridad ni asesoría jurídica (RGPD, LOPDGDD): consulta con quien corresponda.

## Desarrollo

```bash
npm ci
npm run dev        # desarrollo
npm test           # Vitest (validadores, exportador, cifrado, purga, PDF, QR, i18n, componentes)
npm run e2e        # Playwright: flujo completo en Chromium real + guardia de «cero peticiones a otros orígenes»
npm run lint       # ESLint (incluye jsx-a11y)
npm run typecheck  # tsc estricto
npm run build      # build de producción (PWA)
VITE_DEMO=true npm run build   # build de la demo con datos ficticios
```

Estructura: `src/oficial` (tablas del PDF) · `src/validators` · `src/exportador` (módulo aislado) · `src/crypto` · `src/storage` (IndexedDB cifrado, purga, copias) · `src/huesped` (enlace, código de envío, ficha imprimible y PDF) · `src/qr` (lector) · `src/i18n` (un fichero por idioma) · `src/ui` · `e2e` (Playwright) · `docs/oficial`.

**Pruebas end-to-end** (`e2e/`, sobre el build de producción con su CSP): (1) flujo completo: crear reserva → enlace → ficha en un móvil emulado (en francés) y descarga del PDF → **recepción lee el QR con la cámara** (Chromium con una cámara falsa que muestra el QR) → parte completo → exportar → XML comprobado con `DOMParser`; (2) la demo en móvil: la lista no se mueve y cada «Abrir» abre su reserva; (3) recorrido por todas las pantallas y los 6 idiomas. Una **guardia automática** hace fallar cualquier prueba si la página intenta una petición a otro origen o el navegador informa de una violación de la CSP, y una prueba de control demuestra que la guardia sí lo detecta.

## Cómo se construyó

Construido con **Claude Code** (agente de IA de Anthropic) bajo la dirección de **Daniel Buitrago**: la **idea, la especificación y la revisión son de Daniel**; el agente leyó el documento oficial, escribió el código y las pruebas y lo verificó. Método: los validadores, el exportador, el cifrado y la purga se hicieron con **TDD** (commits `test:` primero, luego `feat:`); la interfaz se probó después, con pruebas de componentes y una prueba de humo en navegador real. Revisar un código escrito por un agente sigue siendo imprescindible: en el camino, una prueba de mutación manual detectó una laguna real (dos letras de la tabla del DNI no estaban cubiertas) que se corrigió.

## Licencia

[MIT](LICENSE) © 2026 Daniel Buitrago.

---

## English summary

**Registro de viajeros** is a free, local-first PWA for small Spanish accommodations (hostels, guest houses) that must report every guest to the Ministry of the Interior (SES.Hospedajes, Royal Decree 933/2021) within 24 hours and keep the data for 3 years. It needs **no server**: guests fill in their details on their phone (form in Spanish, English, French, German, Italian and Portuguese, WCAG 2.2 AA-oriented), producing an **encrypted code** (QR/text/file) that reception imports by **scanning the QR with the camera** (native BarcodeDetector or bundled jsQR, no network); guests can also download a readable, bilingual **PDF/printout** of their details as a pre-check-in for places that already use a property-management system; reception sees a daily list with each report's status and a 24-hour warning; and an isolated **exporter** generates the bulk-upload XML defined in the official document (`docs/oficial/Instrucciones.pdf`, v1.1.0) and validates it twice before it can be downloaded. End-to-end tests (Playwright) cover the whole flow and fail if the page makes any request to another origin. Data lives in IndexedDB, encrypted with AES-GCM using a PBKDF2-derived key; records are auto-purged 3 years after check-out (with prior warning); encrypted backups are supported. No analytics, no external calls.

**This is NOT an official tool and does NOT submit anything to the Ministry.** You must upload the file yourself, and the establishment remains solely responsible for reporting on time. Items the official document does not specify (XML namespace, `internet` field format, INE municipality table, "arrendador" code, etc.) are **not invented**: they are marked `PENDIENTE-OFICIAL` in code and listed above. The file has not been tested against the live portal.

Built with Claude Code as the coding agent; idea, specification and review by Daniel Buitrago. MIT licensed.
