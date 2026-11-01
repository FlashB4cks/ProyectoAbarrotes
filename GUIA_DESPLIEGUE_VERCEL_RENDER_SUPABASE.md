# Guía de Despliegue en la Nube: Vercel + Render + Supabase

Esta guía detalla el procedimiento paso a paso para desplegar **NohemySys** utilizando la arquitectura recomendada en capas gratuitas y de alta durabilidad:

```mermaid
flowchart LR
    Usuario["Usuario Final\n(Navegador / Móvil)"] -->|HTTPS| Vercel["Vercel\nFrontend (React + Vite)"]
    Vercel -->|Llamadas REST / JWT| Render["Render\nBackend (Django + DRF)"]
    Render -->|PostgreSQL 16 con SSL| Supabase["Supabase\nBase de Datos Gestionada"]
```

---

## Paso 1: Configurar la Base de Datos en Supabase

1. Ingrese a [https://supabase.com](https://supabase.com) e inicie sesión con su cuenta de GitHub o correo.
2. Haga clic en **New project** (Nuevo proyecto).
3. Complete los campos:
   * **Name:** `nohemysys-db`
   * **Database Password:** Ingrese una contraseña segura y anótela (la necesitará en Render).
   * **Region:** Seleccione la más cercana a sus usuarios (por ejemplo, `East US / North Virginia`).
4. Espere entre 1 y 2 minutos a que el aprovisionamiento termine.
5. Obtenga la URL de conexión:
   * Vaya a **Project Settings** (icono de engranaje) -> **Database**.
   * Busque la sección **Connection string** y seleccione la pestaña **URI**.
   * Copie la URL. Se verá similar a:
     ```text
     postgresql://postgres:[TU_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
     ```
     *(O en modo Pooler en el puerto 6543, ambas son soportadas automáticamente por NohemySys)*.
   * Reemplace `[TU_PASSWORD]` por la contraseña que definió en el paso 3.

---

## Paso 2: Desplegar el Backend en Render

1. Ingrese a [https://render.com](https://render.com) e inicie sesión con su cuenta de GitHub.
2. Haga clic en **New +** -> **Web Service**.
3. Seleccione **Build and deploy from a Git repository** y elija su repositorio `FlashB4cks/ProyectoAbarrotes`.
4. Configure los parámetros del servicio:
   * **Name:** `nohemysys-backend`
   * **Region:** Misma región de Supabase (por ejemplo, `Oregon` u `Ohio`).
   * **Root Directory:** `backend`
   * **Environment:** `Python 3`
   * **Branch:** `main`
   * **Build Command:**
     ```bash
     pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate && python -c "from scripts.seed_initial_data import run; run()"
     ```
   * **Start Command:**
     ```bash
     gunicorn nohemysys_core.wsgi:application --bind 0.0.0.0:$PORT
     ```
   * **Instance Type:** `Free`
5. En la sección **Environment Variables** (Variables de Entorno), agregue:
   * `DATABASE_URL`: Pegue la URI completa de Supabase obtenida en el Paso 1.
   * `DEBUG`: `False`
   * `SECRET_KEY`: Una cadena segura aleatoria (o use el botón *Generate*).
   * `ALLOWED_HOSTS`: `*`
6. Haga clic en **Create Web Service**.
7. Render iniciará la construcción, aplicará automáticamente las migraciones a Supabase y creará los datos esenciales (usuario `admin`, roles y catálogo base).
8. Al terminar, Render le proporcionará su URL pública (por ejemplo: `https://nohemysys-backend.onrender.com`).
   * Verifique que responda abriendo `https://nohemysys-backend.onrender.com/api/` en su navegador.

---

## Paso 3: Desplegar el Frontend en Vercel

1. Ingrese a [https://vercel.com](https://vercel.com) e inicie sesión con su cuenta de GitHub.
2. Haga clic en **Add New...** -> **Project**.
3. Importe su repositorio `FlashB4cks/ProyectoAbarrotes`.
4. En la pantalla de configuración:
   * **Framework Preset:** `Vite` (se detecta automáticamente).
   * **Root Directory:** Haga clic en **Edit** y seleccione la carpeta `frontend`.
5. Despliegue la sección **Environment Variables**:
   * **Name:** `VITE_API_URL`
   * **Value:** La URL de su backend en Render terminada en `/api`:
     ```text
     https://nohemysys-backend.onrender.com/api
     ```
6. Haga clic en **Deploy**.
7. Vercel compilará la aplicación en menos de un minuto y le asignará su dominio público (por ejemplo: `https://proyecto-abarrotes.vercel.app`).

---

## Paso 4: Vincular CORS en Render (Último Ajuste)

1. Vuelva al panel de su Web Service en [Render](https://dashboard.render.com).
2. Ingrese a la pestaña **Environment**.
3. Agregue o edite la variable:
   * `CORS_ALLOWED_ORIGINS`: Ingrese la URL asignada por Vercel (por ejemplo: `https://proyecto-abarrotes.vercel.app`).
4. Haga clic en **Save Changes**. Render reiniciará el servicio en pocos segundos.

---

## Paso 5: Verificación y Credenciales por Defecto

Abra el enlace de su frontend en Vercel e inicie sesión con las credenciales maestras inicializadas:
* **Usuario:** `admin`
* **Contraseña:** `Admin123*`

El sistema cargará el Punto de Venta, Catálogos, Control de Caja e Inventarios consultando directamente su base de datos persistente en Supabase.
