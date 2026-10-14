from django.contrib.auth.models import AbstractUser
from django.db import models

class Rol(models.Model):
    id_rol = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=50, unique=True, verbose_name='Código del Rol')
    nombre = models.CharField(max_length=100, verbose_name='Nombre del Rol')
    descripcion = models.TextField(null=True, blank=True, verbose_name='Descripción de Responsabilidades')
    permisos = models.JSONField(default=list, blank=True, verbose_name='Permisos del Rol')
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMINISTRADOR = 'ADMINISTRADOR', 'Administrador'
        VENDEDOR = 'VENDEDOR', 'Vendedor'
        ALMACENERO = 'ALMACENERO', 'Almacenero'

    rol = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VENDEDOR,
        verbose_name='Rol',
        help_text='Rol del usuario dentro del sistema NohemySys'
    )
    dpi = models.CharField(
        max_length=13,
        unique=True,
        null=True,
        blank=True,
        verbose_name='DPI',
        help_text='Documento Personal de Identificación (13 dígitos)'
    )
    nit = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='NIT',
        help_text='Número de Identificación Tributaria (Opcional)'
    )
    telefono = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='Teléfono'
    )
    direccion = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Dirección'
    )
    debe_cambiar_password = models.BooleanField(
        default=True,
        verbose_name='Debe Cambiar Contraseña'
    )

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_rol_display()})"
