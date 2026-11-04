# Fichero oficial del INE

Aquí está, **tal cual lo publica el INE**, el fichero «Relación de municipios y sus códigos por provincias»:

| | |
|---|---|
| Fichero | `diccionario25.xlsx` (no se modifica; una prueba comprueba su tamaño y su huella) |
| Origen | <https://www.ine.es/daco/daco42/codmun/codmun25/diccionario25.xlsx> |
| Fecha de referencia | municipios a **1 de enero de 2025**. Es el último fichero publicado por el INE en esa página a 4-11-2026 (el de 2026 aún no está publicado) |
| Tamaño | 306.558 bytes |
| SHA-256 | `5cf83d5b9c68b4c39650b2f38cd60d817a2c9f90acc618b603e8c17ebd12ad07` |
| Descarga | con el navegador (el INE bloquea las descargas automáticas desde servidores en la nube) |

De él sale **todo** el autocompletado municipio → código INE: `src/oficial/ine/municipios-2025-01-01.json`
(8.132 municipios, 52 provincias). Para regenerarlo (Node 22.18 o posterior; debe quedar idéntico):

```bash
npm run ine:importar -- docs/oficial/ine/diccionario25.xlsx --fecha 2025-01-01
```

Cuando el INE publique una relación nueva: guárdala aquí **sin tocar nada** (si viniera en `.xls` antiguo, ábrela y
guárdala como xlsx sin cambiar nada más), ejecuta el mismo comando con su nombre y su fecha, y conserva también la
anterior para que la app avise de los códigos dados de baja (p. ej. por fusión).

Instrucciones completas: README → «Códigos de municipio INE».
