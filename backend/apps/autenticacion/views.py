from rest_framework import generics, permissions, status, filters
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db import transaction
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, UserAdminSerializer, CambiarPasswordSerializer

User = get_user_model()

from .permissions import IsAdminUserRole
from apps.auditoria.services import registrar_auditoria

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            try:
                username = request.data.get('username')
                user = User.objects.filter(username=username).first()
                if not user and username and '@' in str(username):
                    user = User.objects.filter(email=username).first()
                if user:
                    registrar_auditoria(
                        usuario=user,
                        accion="LOGIN",
                        tabla_afectada="usuarios",
                        descripcion=f"Inicio de sesión exitoso del usuario @{user.username} (Rol: {user.rol}).",
                        request=request
                    )
            except Exception:
                pass
        return response

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class UserAdminListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = UserAdminSerializer
    queryset = User.objects.all().order_by('-is_active', '-date_joined')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email', 'dpi', 'nit', 'telefono']
    ordering_fields = ['date_joined', 'username', 'first_name', 'last_name', 'rol', 'is_active']

    @transaction.atomic
    def perform_create(self, serializer):
        user = serializer.save()
        nombre_completo = user.get_full_name() or user.username
        registrar_auditoria(
            usuario=self.request.user,
            accion="CREAR",
            tabla_afectada="usuarios",
            descripcion=f'Creación de nuevo usuario @{user.username} (Nombre: {nombre_completo}, Rol: {user.rol}).',
            request=self.request
        )

class UserAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = UserAdminSerializer
    queryset = User.objects.all()

    @transaction.atomic
    def perform_update(self, serializer):
        user = serializer.save()
        registrar_auditoria(
            usuario=self.request.user,
            accion="EDITAR",
            tabla_afectada="usuarios",
            descripcion=f'Actualización de datos del usuario @{user.username} (Rol: {user.rol}).',
            request=self.request
        )

class UserAdminToggleStatusView(APIView):
    permission_classes = [IsAdminUserRole]

    @transaction.atomic
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            estado_str = "activado" if user.is_active else "dado de baja"
            registrar_auditoria(
                usuario=request.user,
                accion="EDITAR" if user.is_active else "ELIMINAR",
                tabla_afectada="usuarios",
                descripcion=f'Usuario @{user.username} {estado_str} en el sistema.',
                request=request
            )
            return Response({
                'id': user.id,
                'username': user.username,
                'is_active': user.is_active,
                'message': f"El usuario {user.username} ha sido {estado_str} correctamente."
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

class CambiarPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['nueva_password'])
            user.debe_cambiar_password = False
            user.save()
            registrar_auditoria(
                usuario=user,
                accion="CAMBIO_PASSWORD",
                tabla_afectada="usuarios",
                descripcion=f'El usuario @{user.username} actualizó su contraseña de acceso.',
                request=request
            )
            return Response({
                'message': 'Contraseña actualizada exitosamente.',
                'debe_cambiar_password': False
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework import viewsets
from rest_framework.decorators import action
from .models import Rol
from .serializers import RolSerializer

class RolViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Rol.objects.all().order_by('-is_active', 'nombre')
    serializer_class = RolSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'toggle_status']:
            return [IsAdminUserRole()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        rol = serializer.save()
        registrar_auditoria(
            usuario=self.request.user,
            accion="CREAR",
            tabla_afectada="roles",
            descripcion=f'Creación de nuevo rol: "{rol.nombre}" (Código: {rol.codigo}).',
            request=self.request
        )

    def perform_update(self, serializer):
        rol = serializer.save()
        registrar_auditoria(
            usuario=self.request.user,
            accion="EDITAR",
            tabla_afectada="roles",
            descripcion=f'Modificación del rol "{rol.nombre}" (Código: {rol.codigo}).',
            request=self.request
        )

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        rol = self.get_object()
        rol.is_active = not rol.is_active
        rol.save()
        estado_str = "activado" if rol.is_active else "desactivado"
        registrar_auditoria(
            usuario=request.user,
            accion="EDITAR" if rol.is_active else "ELIMINAR",
            tabla_afectada="roles",
            descripcion=f'Rol "{rol.nombre}" {estado_str}.',
            request=request
        )
        return Response({
            'status': 'success',
            'message': f"Rol {rol.nombre} {estado_str} exitosamente.",
            'is_active': rol.is_active
        }, status=status.HTTP_200_OK)
