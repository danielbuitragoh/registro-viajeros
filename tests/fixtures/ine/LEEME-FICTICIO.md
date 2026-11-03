# Muestras FICTICIAS de la relación de municipios del INE

**Ninguno de estos códigos ni nombres es real.** Usan las provincias 98 y 99, que no existen, y nombres inventados.

Sirven para probar `scripts/importar-ine.mjs` (xlsx y csv) y para la demo. Imitan la forma de la
«Relación de municipios y sus códigos por provincias» del INE (fila de título con la fecha, cabecera
`CODAUTO · CPRO · CMUN · DC · NOMBRE`), pero **no se han contrastado con el fichero real**.

| Fichero | Fecha | Qué simula |
|---|---|---|
| `relacion-ficticia-2025.xlsx` | 01-01-2025 | Relación base (10 municipios). CPRO/CMUN mezclan números y texto, como puede pasar al guardar desde Excel. |
| `relacion-ficticia-2026.csv` | 01-01-2026 | `;` y Windows-1252. **Fusión** de 99006 + 99007 en 99901, **cambio de nombre** de 98002 y **alta** de 98011. |

Se regeneran con `python3 tests/fixtures/ine/generar_muestras.py` (openpyxl).
