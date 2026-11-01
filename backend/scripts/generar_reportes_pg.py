# -*- coding: utf-8 -*-
"""
Script automatizado para ejecutar la suite de pruebas unitarias y funcionales de NohemySys
y generar los reportes en formatos .txt y .html dentro de la carpeta 'Documentacion PG'.
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON_EXE = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
PYTEST_EXE = BACKEND_DIR / "venv" / "Scripts" / "pytest.exe"
COVERAGE_EXE = BACKEND_DIR / "venv" / "Scripts" / "coverage.exe"

OUTPUT_DIR = Path(r"c:\Users\ruben\OneDrive\Escritorio\Documentacion PG")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

REPORT_TXT_PYTEST = OUTPUT_DIR / "reporte_pruebas_ejecucion.txt"
REPORT_HTML_PYTEST = OUTPUT_DIR / "reporte_pruebas_escenarios.html"
REPORT_TXT_COVERAGE = OUTPUT_DIR / "reporte_cobertura_codigo.txt"
REPORT_HTML_COVERAGE_DIR = OUTPUT_DIR / "reporte_cobertura_html"

print("=" * 70)
print("NOHEMYSYS - GENERADOR AUTOMÁTICO DE REPORTES DE PRUEBAS")
print("=" * 70)
print(f"Backend: {BACKEND_DIR}")
print(f"Directorio de Destino: {OUTPUT_DIR}\n")

# 1. Ejecutar PyTest para generar reporte HTML y capturar TXT
print(">>> [1/3] Ejecutando escenarios de prueba con PyTest...")
pytest_cmd = [
    str(PYTEST_EXE),
    "-v",
    f"--html={REPORT_HTML_PYTEST}",
    "--self-contained-html"
]

res_pytest = subprocess.run(
    pytest_cmd,
    cwd=str(BACKEND_DIR),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding="utf-8"
)

with open(REPORT_TXT_PYTEST, "w", encoding="utf-8") as f:
    f.write(res_pytest.stdout)

print(f"  [OK] Reporte HTML generado: {REPORT_HTML_PYTEST}")
print(f"  [OK] Log en texto generado: {REPORT_TXT_PYTEST}")

# 2. Ejecutar Coverage con manage.py test para reporte de cobertura
print("\n>>> [2/3] Midiendo cobertura de código con Coverage...")
cov_run_cmd = [
    str(COVERAGE_EXE),
    "run",
    "--source=apps",
    "manage.py",
    "test",
    "-v",
    "1"
]
subprocess.run(cov_run_cmd, cwd=str(BACKEND_DIR), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Generar reporte de texto de coverage
cov_rep_cmd = [
    str(COVERAGE_EXE),
    "report",
    "--omit=*/migrations/*,*/tests.py"
]
res_cov = subprocess.run(
    cov_rep_cmd,
    cwd=str(BACKEND_DIR),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding="utf-8"
)

with open(REPORT_TXT_COVERAGE, "w", encoding="utf-8") as f:
    f.write(res_cov.stdout)

print(f"  [OK] Resumen de cobertura TXT generado: {REPORT_TXT_COVERAGE}")

# 3. Generar reporte HTML de coverage
print("\n>>> [3/3] Generando dashboard web interactivo de cobertura...")
cov_html_cmd = [
    str(COVERAGE_EXE),
    "html",
    f"-d",
    str(REPORT_HTML_COVERAGE_DIR),
    "--omit=*/migrations/*,*/tests.py"
]
subprocess.run(cov_html_cmd, cwd=str(BACKEND_DIR), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print(f"  [OK] Reporte de Cobertura HTML generado: {REPORT_HTML_COVERAGE_DIR / 'index.html'}")

print("\n" + "=" * 70)
print("¡TODOS LOS REPORTES FUERON GENERADOS EXITOSAMENTE EN 'DOCUMENTACION PG'!")
print("=" * 70)
