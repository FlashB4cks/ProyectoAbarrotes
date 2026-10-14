from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()

class IsAdminUserRole(permissions.BasePermission):
    """
    Permiso personalizado: Permite el acceso únicamente a usuarios autenticados con rol ADMINISTRADOR o superusuario.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'rol', None) == User.Role.ADMINISTRADOR or request.user.is_superuser)
        )

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permite lectura (GET, HEAD, OPTIONS) a cualquier usuario autenticado,
    pero restringe escritura (POST, PUT, PATCH, DELETE) exclusivamente a ADMINISTRADOR.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            getattr(request.user, 'rol', None) == User.Role.ADMINISTRADOR or 
            request.user.is_superuser
        )
