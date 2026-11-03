# Changelog

Todos los cambios relevantes de `@danielbuitragoh/documentos-es` se anotan aquí.
Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) · Versionado: [SemVer](https://semver.org/lang/es/).

## [0.1.0] - 2026-11-03

Primera versión: los validadores de documentos españoles que usaba la app
[registro-viajeros](https://github.com/danielbuitragoh/registro-viajeros), extraídos a un paquete independiente.

### Añadido

- `validarDNI`, `validarNIE` y `validarCIF`: comprueban la forma y la letra o dígito de control.
  - DNI: los 23 restos de la tabla del módulo 23; los NIF que empiezan por K, L o M se aceptan solo por formato
    (`aviso: 'control_no_verificado'`).
  - NIE: X, Y y Z valen 0, 1 y 2.
  - CIF: control en letra (N, P, Q, R, S, W), en dígito (A, B, E, H) o en cualquiera de los dos (C, D, F, G, J, U, V).
- `validarDocumento`: detecta el tipo y valida; el resultado incluye `tipo`.
- `detectarTipo`: `'DNI' | 'NIE' | 'CIF' | null` por la forma del número.
- `normalizarDocumento`: mayúsculas y sin espacios, tabuladores, puntos, guiones ni guiones bajos.
- `letraDni`, `letraNie` y `controlCif`: cálculo de la letra o del dígito de control.
- `mensajeError`: mensaje del motivo del error (`formato`, `letra`, `control`, `parece_nie`, `parece_dni`) en español e inglés.
- Tipos de TypeScript incluidos, ESM, sin dependencias en tiempo de ejecución; funciona en navegador y Node ≥ 18.
- Publicación con provenance desde GitHub Actions al crear una etiqueta `documentos-es-v*`.

[0.1.0]: https://github.com/danielbuitragoh/registro-viajeros/releases/tag/documentos-es-v0.1.0
