# NohemySys - Sistema de Control de Inventario y Punto de Venta (POS)

Sistema integral de gestión de abarrotes, punto de venta (POS), control de inventario multisesión de caja y facturación, diseñado con arquitectura desacoplada moderna y estándares de seguridad **OWASP Top 10**.

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework:** Python 3.12+ / Django 5.x / Django REST Framework
- **Autenticación:** JWT (`rest_framework_simplejwt`) con rotación de tokens y lista negra
- **Control de Acceso:** RBAC (Role-Based Access Control) con permisos a nivel de vista y acción
- **Base de Datos:** MySQL / MariaDB (desarrollo y producción)
- **Auditoría:** Registro inmutable de eventos sensibles y transacciones financieras

### Frontend
- **Framework:** React 18+ / Vite
- **Estilos:** CSS3 Moderno (Arquitectura basada en componentes y variables de diseño)
- **Gestión de Estado:** React Context API (`AuthContext`)
- **Comunicación:** Axios con interceptores automáticos para inyección y renovación de JWT

---

## 🔒 Arquitectura de Seguridad (OWASP Top 10 Hardened)

El sistema cuenta con blindaje de seguridad implementado:
1. **Precios y Catálogo Blindados:** El backend calcula subtotales e impuestos basándose exclusivamente en el catálogo oficial de la base de datos (protección contra manipulación de precios en el cliente).
2. **Control de Acceso Riguroso (RBAC):** Reportes analíticos, auditoría, gestión de usuarios y ajustes de inventario restringidos estrictamente por rol en backend y frontend.
3. **Manejo Seguro de Sesiones:** Blacklist en logout, expiración corta de Access Token (30 min) y rotación forzada de Refresh Token.
4. **Protección contra Concurrencia:** Actualización atómica de stock mediante `select_for_update()` en transacciones de venta.
5. **CORS Dinámico:** Filtrado estricto de orígenes permitidos por expresiones regulares.
6. **Protección de Secretos:** Configuración desacoplada en variables de entorno (`.env`), nunca versionadas.

---

## 📂 Estructura del Proyecto

```text
├── backend/                  # Servidor Django REST Framework
│   ├── apps/
│   │   ├── autenticacion/    # Usuarios, Roles y Permisos RBAC
│   │   ├── catalogos/        # Productos, Categorías, Marcas, Unidades
│   │   ├── compras/          # Gestión de Proveedores y Órdenes de Compra
│   │   ├── inventario/       # Lotes, Existencias y Mermas
│   │   ├── ventas/           # POS, Facturación, Sesiones de Caja y Reportes
│   │   └── auditoria/        # Registro de Eventos y Trazabilidad
│   ├── nohemysys_core/       # Configuración central del proyecto Django
│   └── requirements.txt      # Dependencias de Python
│
├── frontend/                 # Aplicación Cliente React + Vite
│   ├── src/
│   │   ├── api/              # Cliente Axios y llamadas centralizadas
│   │   ├── context/          # Contexto global de autenticación
│   │   ├── components/       # Componentes modulares y reutilizables
│   │   ├── pages/            # Vistas por módulo de negocio
│   │   └── utils/            # Utilidades de sonido, formateo y cálculo
│   └── package.json          # Dependencias de JavaScript
│
├── .gitignore                # Reglas de exclusión de artefactos y secretos
└── README.md                 # Documentación del sistema
```

---

## 🚀 Guía de Inicio Rápido (Desarrollo Local)

### 1. Clonar el repositorio
```bash
git clone https://github.com/FlashB4cks/<nombre-del-repo>.git
cd "Proyecto abarrotes"
```

### 2. Configurar el Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # En Windows
# source venv/bin/activate # En Linux/macOS

pip install -r requirements.txt
cp .env.example .env     # Ajustar credenciales de BD y SECRET_KEY

python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 3. Configurar el Frontend
```bash
cd ../frontend
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 👥 Autores y Licencia
Desarrollado para el proyecto de graduación - Sistema de Gestión Comercial NohemySys.
