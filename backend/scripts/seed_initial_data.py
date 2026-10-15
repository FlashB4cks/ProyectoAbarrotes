import os
import sys
from pathlib import Path

# Agregar backend y apps al path de Python
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nohemysys_core.settings')
import django
django.setup()

from apps.autenticacion.models import Rol, User
from apps.ventas.models import Cliente

def run():
    print("--- Inicializando datos esenciales para NohemySys ---")
    
    # 1. Roles del sistema
    admin_rol, _ = Rol.objects.get_or_create(
        codigo='ADMINISTRADOR',
        defaults={'nombre': 'Administrador General', 'descripcion': 'Acceso total al sistema', 'permisos': ['*']}
    )
    vendedor_rol, _ = Rol.objects.get_or_create(
        codigo='VENDEDOR',
        defaults={'nombre': 'Vendedor / Cajero', 'descripcion': 'Acceso a POS y Ventas', 'permisos': ['pos', 'ventas']}
    )
    almacenero_rol, _ = Rol.objects.get_or_create(
        codigo='ALMACENERO',
        defaults={'nombre': 'Almacenero', 'descripcion': 'Gestión de Inventario y Compras', 'permisos': ['inventario', 'compras']}
    )
    print("[OK] Roles del sistema verificados.")

    # 2. Usuario Administrador Inicial
    username = os.environ.get('INIT_ADMIN_USER', 'admin')
    password = os.environ.get('INIT_ADMIN_PASS', 'Admin123*')
    email = os.environ.get('INIT_ADMIN_EMAIL', 'admin@nohemysys.com')

    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    user.rol = User.Role.ADMINISTRADOR
    user.is_superuser = True
    user.is_staff = True
    user.is_active = True
    user.debe_cambiar_password = False
    user.set_password(password)
    user.save()
    print(f"[OK] Usuario Administrador '{username}' configurado correctamente.")

    # 3. Cliente CF (Consumidor Final)
    cf, cf_created = Cliente.objects.get_or_create(
        nit='C/F',
        defaults={'nombre_completo': 'Consumidor Final', 'direccion': 'Ciudad'}
    )
    print("[OK] Cliente Consumidor Final (C/F) listo.")
    print("--- Inicializacion completada con exito ---")

if __name__ == '__main__':
    run()
