#!/bin/sh
set -e

# Esperar a que la base de datos este lista antes de proceder con migraciones
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Verificando disponibilidad de conexion con la base de datos..."
  python -c "
import os, time, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nohemysys_core.settings')
import django
django.setup()
from django.db import connection

for attempt in range(1, 21):
    try:
        connection.ensure_connection()
        print('Conexion con PostgreSQL establecida exitosamente.')
        sys.exit(0)
    except Exception as e:
        print(f'Intento {attempt}/20: Esperando a la base de datos ({e})...')
        time.sleep(2)

print('Advertencia: No se pudo verificar conexion tras 20 intentos, continuando...')
" || true

  echo "Aplicando migraciones de base de datos..."
  python manage.py migrate --noinput || true

  echo "Inicializando datos base (Roles, Admin, Consumidor Final)..."
  python scripts/seed_initial_data.py || true
fi

exec "$@"
