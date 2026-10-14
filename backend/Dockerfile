# =======================================================
# Backend Dockerfile - NohemySys Django REST Framework
# =======================================================
FROM python:3.12-slim

# Evitar escritura de bytecode .pyc y activar salida sin buffer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema requeridas para PostgreSQL y comprobacion de red
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el codigo fuente del backend
COPY . /app/

# Recolectar archivos estaticos para produccion
RUN python manage.py collectstatic --noinput || true

# Configurar permisos para el script de inicio
RUN chmod +x /app/entrypoint.sh

# Puerto de escucha (Google Cloud Run inyecta su propia variable $PORT)
EXPOSE 8000

# Script de inicio y comando por defecto con Gunicorn
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "-c", "gunicorn nohemysys_core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --threads 2 --timeout 120 --access-logfile - --error-logfile -"]
