# @danielbuitragoh/documentos-es

[Español](#español) · [English](#english)

---

## Español

Validación de **DNI/NIF**, **NIE** y **CIF** españoles: comprueba la forma y la letra o dígito de control, normaliza lo que teclea la gente (espacios, guiones, puntos, minúsculas), calcula la letra de control y detecta de qué tipo es un número. Devuelve el motivo del error como un código tipado y un mensaje en **español o inglés**.

- **Sin dependencias** en tiempo de ejecución. Funciona en **navegador y Node ≥ 18**.
- **ESM + tipos de TypeScript** incluidos.
- **API pequeña**: diez funciones, ninguna lanza con entradas de usuario (las de cálculo solo lanzan `RangeError` si les pasas algo que no puede tener letra).
- Solo usa las **reglas públicas** de los documentos (Orden EHA/451/2008 y normativa de la AEAT). No consulta ningún registro ni servicio.

### Instalación

```bash
npm install @danielbuitragoh/documentos-es
```

### Uso

```ts
import { validarDocumento, validarDNI, mensajeError } from '@danielbuitragoh/documentos-es'

validarDNI('12.345.678-z')
// → { ok: true, normalizado: '12345678Z' }

const r = validarDNI('12345678A')
// → { ok: false, codigo: 'letra', esperada: 'Z' }
if (!r.ok) {
  mensajeError(r)        // 'La letra de control no es correcta: debería ser Z.'
  mensajeError(r, 'en')  // 'The check letter is wrong: it should be Z.'
}

// Sin saber de antemano de qué tipo es:
validarDocumento('x-1234567-l')
// → { ok: true, tipo: 'NIE', normalizado: 'X1234567L' }
validarDocumento('A28015864')
// → { ok: false, tipo: 'CIF', codigo: 'control', esperada: '5' }
validarDocumento('hola')
// → { ok: false, tipo: null, codigo: 'formato' }
```

Calcular la letra de control y detectar el tipo:

```ts
import { letraDni, letraNie, controlCif, detectarTipo } from '@danielbuitragoh/documentos-es'

letraDni(12345678)        // 'Z'
letraDni('00000000')      // 'T'
letraNie('X1234567')      // 'L'   (X, Y, Z valen 0, 1, 2 y se usa la tabla del DNI)
controlCif('A2801586')    // { digito: '5', letra: 'E' }
detectarTipo('y1234567x') // 'NIE'   ('DNI' | 'NIE' | 'CIF' | null, solo por la forma)
```

### API

| Función | Qué hace |
|---|---|
| `validarDNI(texto)` | DNI/NIF de persona física: 8 cifras y letra. |
| `validarNIE(texto)` | NIE: X, Y o Z, 7 cifras y letra. |
| `validarCIF(texto)` | CIF: letra de entidad, 7 cifras y control (dígito, letra o ambos según la entidad). |
| `validarDocumento(texto)` | Detecta el tipo y valida. Añade `tipo` al resultado (`null` si no encaja en ninguno). |
| `detectarTipo(texto)` | `'DNI'`, `'NIE'`, `'CIF'` o `null`, solo por la forma (no comprueba el control). |
| `normalizarDocumento(texto)` | Mayúsculas y sin espacios, tabuladores, puntos, guiones ni guiones bajos. |
| `letraDni(numero)` | Letra de control de un número de DNI (`number` o cifras en texto, 0–99 999 999). |
| `letraNie('X1234567')` | Letra de control de un NIE a partir de sus 8 primeros caracteres. |
| `controlCif('A2801586')` | Dígito y letra de control de un CIF a partir de sus 8 primeros caracteres. |
| `mensajeError(error, idioma?)` | Mensaje legible en `'es'` (por defecto) o `'en'`. |

**Resultado de los validadores**

```ts
type Resultado =
  | { ok: true; normalizado: string; aviso?: 'control_no_verificado' }
  | { ok: false; codigo: CodigoError; esperada?: string }

type CodigoError = 'formato' | 'letra' | 'control' | 'parece_nie' | 'parece_dni'
```

| Código | Significado |
|---|---|
| `formato` | No tiene la forma de ese documento (longitud, letras o cifras donde no toca, vacío, no es texto…). |
| `letra` | DNI o NIE con la letra de control equivocada; `esperada` trae la correcta. |
| `control` | CIF con el dígito o la letra de control equivocados; `esperada` trae el esperado (la letra en las entidades que la exigen, el dígito en el resto). |
| `parece_nie` | Se ha validado como DNI algo que es un NIE (empieza por X, Y o Z). Solo lo devuelve `validarDNI`. |
| `parece_dni` | Se ha validado como NIE algo que es un DNI. Solo lo devuelve `validarNIE`. |

### Reglas y límites que conviene conocer

- **Control del CIF por tipo de entidad**: letra obligatoria en N, P, Q, R, S y W; dígito obligatorio en A, B, E y H; cualquiera de los dos en C, D, F, G, J, U y V.
- **NIF que empiezan por K, L o M** (menores, residentes en el extranjero…): `validarDNI` los acepta solo por **formato** y devuelve `aviso: 'control_no_verificado'`, porque su control no sigue una regla pública y estable.
- **Valida la forma y el control, no la existencia.** Que un número pase la validación no significa que esté asignado a alguien.
- Las funciones `validar*` y `detectarTipo` aceptan cualquier valor sin lanzar (lo que no es texto da `formato` / `null`). `letraDni`, `letraNie` y `controlCif` lanzan `RangeError` si la entrada no puede tener letra.
- Las cifras de ancho completo, las `Ñ` y cualquier carácter fuera de `0-9` y `A-Z` no se aceptan.

### Cómo publicar este paquete (pasos para quien mantiene el repositorio)

El repositorio incluye un flujo de GitHub Actions ([`publicar-documentos-es.yml`](../../.github/workflows/publicar-documentos-es.yml)) que publica en npm **solo** cuando se crea una etiqueta `documentos-es-v*` **y** existe el secreto `NPM_TOKEN`. Nada se publica por fusionar un PR.

1. **Crea una cuenta en npm** en <https://www.npmjs.com/signup> con el nombre de usuario **`danielbuitragoh`** (el ámbito `@danielbuitragoh` es el nombre de usuario; si está ocupado, cambia el nombre del paquete en `package.json` y en las importaciones de la app). Verifica el correo y **activa la verificación en dos pasos (2FA)**.
2. **Crea un token de acceso**: en npm, *Access Tokens → Generate New Token → Granular Access Token*.
   - Nombre: `github-actions-documentos-es`; caducidad: la que prefieras (renuévalo cuando caduque).
   - *Packages and scopes → Permissions*: **Read and write**, sobre **All packages** o sobre el ámbito `@danielbuitragoh` (el primer `publish` crea el paquete, así que no puede limitarse a un paquete que aún no existe).
   - Si npm te ofrece la opción de **saltar la 2FA** para tokens de publicación, actívala: el flujo publica sin un código de un solo uso. (Los textos de la web de npm cambian; si no coinciden, busca «granular access token» en su documentación.)
   - Copia el token (`npm_…`): **solo se muestra una vez**.
3. **Guarda el token como secreto del repositorio**: en GitHub, *Settings → Secrets and variables → Actions → New repository secret*, nombre exacto **`NPM_TOKEN`**, valor el token. No lo pegues en ningún fichero ni lo compartas.
4. **Fusiona el PR** que añade el paquete y comprueba que `package.json` del paquete tiene la versión que quieres publicar (`0.1.0`) y que `CHANGELOG.md` la describe.
5. **Crea y sube la etiqueta** (el número tiene que coincidir con `version` del paquete, o el flujo se detiene):

   ```bash
   git checkout main && git pull
   git tag documentos-es-v0.1.0
   git push origin documentos-es-v0.1.0
   ```

6. **Mira el resultado** en la pestaña *Actions* ("Publicar documentos-es en npm"). El flujo comprueba que la etiqueta es de `main` y coincide con la versión, ejecuta pruebas con cobertura, compila, verifica el paquete empaquetado y publica con **provenance** (la página del paquete en npm mostrará de qué commit y flujo salió). Las versiones con guion (`0.2.0-beta.1`) se publican con la etiqueta de npm `next`, no `latest`.
7. **Comprueba**: <https://www.npmjs.com/package/@danielbuitragoh/documentos-es> y, en un proyecto vacío, `npm install @danielbuitragoh/documentos-es`.

Para publicar una versión nueva: sube `version` en `package.json`, añade su entrada al `CHANGELOG.md`, fusiona y repite los pasos 5–7 con la etiqueta nueva. Una versión publicada no se puede reescribir.

**Probar sin publicar**: `npm run verificar -w @danielbuitragoh/documentos-es` empaqueta el paquete, lo instala en un proyecto vacío, lo importa en Node y comprueba los tipos, sin tocar npm.

### Desarrollo

Es un workspace de npm dentro de [`registro-viajeros`](https://github.com/danielbuitragoh/registro-viajeros), cuya app usa este mismo paquete.

```bash
npm ci                                                  # en la raíz del repositorio
npm test -w @danielbuitragoh/documentos-es              # Vitest (ejemplos + propiedades con fast-check)
npm run test:coverage -w @danielbuitragoh/documentos-es # con umbral de cobertura del 100 %
npm run build -w @danielbuitragoh/documentos-es         # genera dist/
```

Las pruebas incluyen los 23 restos de la letra del DNI, NIE con X/Y/Z, CIF con letra y dígito en todos los tipos de entidad y entradas basura, y **pruebas de propiedades** que comparan el código con una implementación de referencia simple y distinta (`test/referencia.ts`).

### Licencia

[MIT](LICENSE) © 2026 Daniel Buitrago.

---

## English

Validation of Spanish **DNI/NIF**, **NIE** and **CIF** numbers: it checks the shape and the check letter or digit, normalises what people type (spaces, hyphens, dots, lowercase), computes the check letter and detects which kind of document a number is. Errors come back as a typed code plus a message in **Spanish or English**.

- **Zero runtime dependencies**. Works in the **browser and Node ≥ 18**.
- **ESM + TypeScript types** included.
- **Small API**: ten functions. None throws on user input (the calculation helpers only throw a `RangeError` when given something that cannot have a check letter).
- Uses only the **public rules** for these documents (Orden EHA/451/2008 and AEAT regulations). It does not query any registry or service.

### Install

```bash
npm install @danielbuitragoh/documentos-es
```

### Usage

```ts
import { validarDocumento, validarDNI, mensajeError } from '@danielbuitragoh/documentos-es'

validarDNI('12.345.678-z')
// → { ok: true, normalizado: '12345678Z' }

const r = validarDNI('12345678A')
// → { ok: false, codigo: 'letra', esperada: 'Z' }   (`esperada` = the expected letter)
if (!r.ok) {
  mensajeError(r, 'en')  // 'The check letter is wrong: it should be Z.'
  mensajeError(r)        // 'La letra de control no es correcta: debería ser Z.'  (Spanish is the default)
}

// When you don't know the type beforehand:
validarDocumento('x-1234567-l')
// → { ok: true, tipo: 'NIE', normalizado: 'X1234567L' }
validarDocumento('A28015864')
// → { ok: false, tipo: 'CIF', codigo: 'control', esperada: '5' }
validarDocumento('hello')
// → { ok: false, tipo: null, codigo: 'formato' }
```

Computing check letters and detecting the type:

```ts
import { letraDni, letraNie, controlCif, detectarTipo } from '@danielbuitragoh/documentos-es'

letraDni(12345678)        // 'Z'
letraNie('X1234567')      // 'L'   (X, Y, Z stand for 0, 1, 2 and the DNI table is used)
controlCif('A2801586')    // { digito: '5', letra: 'E' }   (check digit and check letter)
detectarTipo('y1234567x') // 'NIE'   ('DNI' | 'NIE' | 'CIF' | null, by shape only)
```

### API

| Function | What it does |
|---|---|
| `validarDNI(text)` | DNI/NIF of a natural person: 8 digits and a letter. |
| `validarNIE(text)` | NIE: X, Y or Z, 7 digits and a letter. |
| `validarCIF(text)` | CIF: entity letter, 7 digits and a check character (digit, letter or either, depending on the entity). |
| `validarDocumento(text)` | Detects the type and validates. Adds `tipo` to the result (`null` if it fits none). |
| `detectarTipo(text)` | `'DNI'`, `'NIE'`, `'CIF'` or `null`, by shape only (the check character is not verified). |
| `normalizarDocumento(text)` | Uppercase, without spaces, tabs, dots, hyphens or underscores. |
| `letraDni(number)` | Check letter of a DNI number (`number` or digits as text, 0–99,999,999). |
| `letraNie('X1234567')` | Check letter of a NIE from its first 8 characters. |
| `controlCif('A2801586')` | Check digit and letter of a CIF from its first 8 characters. |
| `mensajeError(error, language?)` | Human-readable message in `'es'` (default) or `'en'`. |

**Validator result**

```ts
type Resultado =
  | { ok: true; normalizado: string; aviso?: 'control_no_verificado' }
  | { ok: false; codigo: CodigoError; esperada?: string }

type CodigoError = 'formato' | 'letra' | 'control' | 'parece_nie' | 'parece_dni'
```

| Code | Meaning |
|---|---|
| `formato` | Wrong shape for that document (length, letters or digits in the wrong places, empty, not a string…). |
| `letra` | DNI or NIE with the wrong check letter; `esperada` holds the right one. |
| `control` | CIF with the wrong check digit or letter; `esperada` holds the expected one (the letter for entities that require a letter, the digit otherwise). |
| `parece_nie` | Something that is a NIE (starts with X, Y or Z) was validated as a DNI. Only returned by `validarDNI`. |
| `parece_dni` | Something that is a DNI was validated as a NIE. Only returned by `validarNIE`. |

### Rules and limits worth knowing

- **CIF check character by entity type**: a letter is required for N, P, Q, R, S and W; a digit for A, B, E and H; either one for C, D, F, G, J, U and V.
- **NIFs starting with K, L or M** (minors, residents abroad…): `validarDNI` accepts them by **shape only** and returns `aviso: 'control_no_verificado'`, because their check character does not follow a public, stable rule.
- **It validates shape and check character, not existence.** A number that passes was not necessarily ever issued to anyone.
- The `validar*` functions and `detectarTipo` accept any value without throwing (non-strings give `formato` / `null`). `letraDni`, `letraNie` and `controlCif` throw a `RangeError` when the input cannot have a check letter.
- Full-width digits, `Ñ` and anything outside `0-9` and `A-Z` are not accepted.

### Publishing (for the repository maintainer)

The repository ships a GitHub Actions workflow ([`publicar-documentos-es.yml`](../../.github/workflows/publicar-documentos-es.yml)) that publishes to npm **only** when a `documentos-es-v*` tag is pushed **and** the `NPM_TOKEN` secret exists. Merging a PR never publishes anything. The steps are the ones listed in the Spanish section above: create an npm account named `danielbuitragoh` with 2FA, create a granular access token with read/write permission on the `@danielbuitragoh` scope, store it as the repository secret `NPM_TOKEN`, merge the PR, then `git tag documentos-es-v0.1.0 && git push origin documentos-es-v0.1.0`. The workflow checks that the tag matches `package.json`'s version and that it comes from `main`, runs tests with coverage, builds, verifies the packed package and publishes with **provenance**. Versions with a hyphen (`0.2.0-beta.1`) go out under the `next` dist-tag. To dry-run everything without touching npm: `npm run verificar -w @danielbuitragoh/documentos-es`.

### License

[MIT](LICENSE) © 2026 Daniel Buitrago.
