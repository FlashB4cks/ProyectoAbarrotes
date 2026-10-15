#!/bin/sh
set -e

# Esperar a que la base de datos este disponible si DB_HOST es un host TCP (no socket Unix)
case "$DB_HOST" in
  /*)
    echo "Conectando mediante socket Unix de Cloud SQL en $DB_HOST"
    ;;
  *)
    if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "127.0.0.1" ] && [ "$DB_HOST" != "localhost" ]; then
      echo "Esperando conexion con la base de datos en $DB_HOST:${DB_PORT:-5432}..."
      while ! nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
        sleep 1
      done
      echo "Base de datos conectada exitosamente."
    fi
    ;;
esac

# Ejecutar migraciones si la variable RUN_MIGRATIONS esta activa
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Aplicando migraciones de base de datos..."
  python manage.py migrate --noinput
fi

exec "$@"
