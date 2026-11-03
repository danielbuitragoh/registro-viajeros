"""
Genera las muestras FICTICIAS de la relación de municipios del INE usadas en las pruebas y en la demo.

¡NO SON DATOS DEL INE! Provincias 98 y 99 (no existen) y nombres inventados.
Imitan la forma de la «Relación de municipios y sus códigos por provincias» (fila de título con la fecha,
cabecera CODAUTO/CPRO/CMUN/DC/NOMBRE) para probar el importador, pero ningún código es real.

El xlsx lo escribe openpyxl (un escritor independiente del lector de scripts/ine/xlsx.mjs).
Uso: python3 tests/fixtures/ine/generar_muestras.py
"""
import csv
import os

import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
CABECERA = ["CODAUTO", "CPRO", "CMUN", "DC", "NOMBRE"]

# (CPRO, CMUN, DC, NOMBRE) — todo inventado
R2025 = [
    ("98", "001", "1", "Villaficticia"),
    ("98", "002", "2", "Ávila de Mentira"),
    ("98", "010", "3", "Peña Simulada"),
    ("99", "001", "4", "Villaficticia"),
    ("99", "002", "5", "Aldea de Prueba"),
    ("99", "003", "6", "Rozas del Ensayo, Las"),
    ("99", "004", "7", "Muestra/Mostra"),
    ("99", "005", "8", "Coruñita de Ejemplo, A"),
    ("99", "006", "9", "San Inventado de Abajo"),
    ("99", "007", "0", "San Inventado de Arriba"),
]

# Un año después: 99006 + 99007 se fusionan en 99901; 98002 cambia de nombre; alta de 98011.
R2026 = [r for r in R2025 if (r[0], r[1]) not in {("99", "006"), ("99", "007")}]
R2026 = [("98", "002", "2", "Ávila de Mentirijillas") if (r[0], r[1]) == ("98", "002") else r for r in R2026]
R2026 += [("98", "011", "1", "Nueva Población Simulada"), ("99", "901", "2", "San Inventado")]
R2026.sort()


def xlsx_2025():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Municipios"
    ws.append(["Relación de municipios y códigos por provincias a 01-01-2025 (MUESTRA FICTICIA: NO SON CÓDIGOS REALES)"])
    ws.append([])
    ws.append(CABECERA)
    for i, (cpro, cmun, dc, nombre) in enumerate(R2025):
        # Mezcla a propósito números y textos: CPRO como número en la mitad de las filas (se pierde el 0 a la izquierda)
        ws.append([99, int(cpro) if i % 2 else cpro, cmun if i % 3 else int(cmun), int(dc), nombre])
    wb.save(os.path.join(AQUI, "relacion-ficticia-2025.xlsx"))


def csv_2026():
    with open(os.path.join(AQUI, "relacion-ficticia-2026.csv"), "w", encoding="cp1252", newline="") as f:
        w = csv.writer(f, delimiter=";", quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
        w.writerow(["Relación de municipios y códigos por provincias a 1 de enero de 2026 (MUESTRA FICTICIA)"])
        w.writerow(CABECERA)
        for cpro, cmun, dc, nombre in R2026:
            w.writerow(["99", cpro, cmun, dc, nombre])


if __name__ == "__main__":
    xlsx_2025()
    csv_2026()
