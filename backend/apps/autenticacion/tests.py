from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.autenticacion.models import Rol

User = get_user_model()

class AutenticacionTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='vendedor1',
            password='Password123!',
            rol=User.Role.VENDEDOR,
            first_name='Nohemy',
            last_name='Administradora',
            debe_cambiar_password=True,
            is_active=True
        )

    def test_creacion_usuario_correcto(self):
        """Verifica que el usuario se crea con el rol y contraseña correctos."""
        self.assertEqual(self.user.username, 'vendedor1')
        self.assertTrue(self.user.check_password('Password123!'))
        self.assertEqual(self.user.rol, User.Role.VENDEDOR)

    def test_primer_login_bandera_debe_cambiar_password(self):
        """CP-02: Verifica que un usuario de primer ingreso tenga debe_cambiar_password activado."""
        self.assertTrue(self.user.debe_cambiar_password)

    def test_usuario_inactivo_borrado_logico(self):
        """Verifica que el borrado lógico desactiva al usuario."""
        self.user.is_active = False
        self.user.save()
        user_db = User.objects.get(id=self.user.id)
        self.assertFalse(user_db.is_active)

    def test_creacion_roles_rbac(self):
        """Verifica la persistencia de roles de seguridad RBAC."""
        rol_admin = Rol.objects.create(
            codigo='ADMINISTRADOR',
            nombre='Administrador del Sistema',
            descripcion='Acceso total a reportes, usuarios y finanzas'
        )
        self.assertEqual(rol_admin.codigo, 'ADMINISTRADOR')
        self.assertTrue(rol_admin.is_active)


class AutenticacionAPITestCase(APITestCase):
    def setUp(self):
        self.password_original = 'PasswordSegura2026!'
        self.user = User.objects.create_user(
            username='cajera_pos',
            email='cajera@miscelaneanohemy.com',
            password=self.password_original,
            rol=User.Role.VENDEDOR,
            first_name='Cajera',
            last_name='Turno',
            debe_cambiar_password=True,
            is_active=True
        )
        self.login_url = '/api/auth/login/'
        self.cambiar_pass_url = '/api/auth/cambiar-password/'

    def test_login_jwt_exitoso(self):
        """CP-01: Usuario y credenciales correctas obtienen tokens JWT (access y refresh)."""
        data = {
            'username': 'cajera_pos',
            'password': self.password_original
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'cajera_pos')
        self.assertEqual(response.data['user']['rol'], 'VENDEDOR')
        self.assertTrue(response.data['user']['debe_cambiar_password'])

    def test_login_credenciales_invalidas(self):
        """Intento de inicio de sesión con clave incorrecta es rechazado con HTTP 401."""
        data = {
            'username': 'cajera_pos',
            'password': 'ClaveIncorrecta999!'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_usuario_inactivo_bloqueado(self):
        """Usuario con baja lógica (is_active=False) no puede autenticarse."""
        self.user.is_active = False
        self.user.save()
        data = {
            'username': 'cajera_pos',
            'password': self.password_original
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])
        self.assertIn('dado de baja', str(response.data))

    def test_cambio_password_exitoso_y_desactivacion_bandera(self):
        """CP-03: Actualización de contraseña apaga debe_cambiar_password."""
        self.client.force_authenticate(user=self.user)
        nueva_pass = 'NuevaPasswordRobusta2026!'
        data = {
            'password_actual': self.password_original,
            'nueva_password': nueva_pass,
            'confirmar_password': nueva_pass
        }
        response = self.client.post(self.cambiar_pass_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.debe_cambiar_password)
        self.assertTrue(self.user.check_password(nueva_pass))
