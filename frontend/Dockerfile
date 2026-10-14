# =======================================================
# Frontend Dockerfile - NohemySys React + Vite + Nginx
# =======================================================

# Etapa 1: Compilacion de la aplicacion React
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package*.json ./
RUN npm ci || npm install

# Copiar codigo fuente
COPY . .

# Argumento para definir la URL del backend durante el build si aplica
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Generar el bundle de produccion (directorio /app/dist)
RUN npm run build

# Etapa 2: Servidor web Nginx optimizado y ultraligero
FROM nginx:alpine

# Variables de entorno por defecto (Cloud Run inyectara $PORT automaticamente si es necesario)
ENV PORT=80
ENV BACKEND_PROXY_URL="http://backend:8000/api/"

# Copiar plantilla Nginx (Alpine Nginx ejecuta envsubst automaticamente en arranque)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copiar los archivos estaticos generados en la etapa de compilacion
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
