import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nohemysys_core.settings')
django.setup()

from apps.autenticacion.serializers import UserAdminSerializer

# Test creating a new employee with first_name="Carlos", last_name="Gómez Pérez", dpi="1234567890123"
data = {
    "first_name": "Carlos",
    "last_name": "Gómez Pérez",
    "dpi": "1234567890123",
    "nit": "9876543-1",
    "telefono": "55554444",
    "direccion": "Ciudad de Guatemala, Zona 10",
    "rol": "VENDEDOR"
}

serializer = UserAdminSerializer(data=data)
if serializer.is_valid():
    user = serializer.save()
    print("SUCCESSFULLY CREATED EMPLOYEE!")
    print(" - Generated Username:", user.username)
    print(" - Generated Password:", serializer.data.get('contrasena_generada'))
    print(" - DPI:", user.dpi)
    print(" - NIT:", user.nit)
    print(" - Name:", user.get_full_name())
else:
    print("VALIDATION ERROR:", serializer.errors)
