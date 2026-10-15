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
from apps.catalogos.models import Categoria, UnidadMedida, Marca

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

    # 4. Categorías base del negocio
    default_categorias = [
        ('Abarrotes en General', 'Aceites, sopas, salsas, condimentos y productos secos.'),
        ('Granos Básicos y Harinas', 'Frijol, arroz, azúcar, maíz y harinas diversas.'),
        ('Bebidas y Refrescos', 'Jugos, gaseosas, agua purificada, bebidas energizantes e isotónicas.'),
        ('Lácteos y Huevos', 'Leche entera, quesos, crema, mantequilla y huevos.'),
        ('Limpieza del Hogar', 'Detergentes, cloro, desinfectantes, jabón para platos y bolsas.'),
        ('Snacks, Galletas y Dulces', 'Frituras, galletas saladas y dulces, caramelos y chocolates.'),
        ('Enlatados y Conservas', 'Atún, sardinas, verduras enlatadas y pastas.'),
        ('Higiene y Cuidado Personal', 'Jabón de tocador, pasta dental, champú y papel higiénico.')
    ]
    for cat_nombre, cat_desc in default_categorias:
        Categoria.objects.get_or_create(
            nombre=cat_nombre,
            defaults={'descripcion': cat_desc, 'is_active': True}
        )
    print(f"[OK] {len(default_categorias)} Categorías base verificadas.")

    # 5. Unidades de medida base
    default_unidades = [
        ('Unidad', 'UND'),
        ('Libra', 'LB'),
        ('Kilogramo', 'KG'),
        ('Litro', 'LT'),
        ('Paquete', 'PQT'),
        ('Caja', 'CJ'),
        ('Docena', 'DOC')
    ]
    for u_nom, u_sim in default_unidades:
        UnidadMedida.objects.get_or_create(
            nombre=u_nom,
            defaults={'simbolo': u_sim, 'is_active': True}
        )
    print(f"[OK] {len(default_unidades)} Unidades de Medida base verificadas.")

    print("--- Inicializacion completada con exito ---")

if __name__ == '__main__':
    run()
