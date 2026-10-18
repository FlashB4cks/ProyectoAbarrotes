from rest_framework import generics, permissions, status, filters
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db import transaction
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, UserAdminSerializer, CambiarPasswordSerializer

User = get_user_model()

from .permissions import IsAdminUserRole

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
        serializer.save()

class UserAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = UserAdminSerializer
    queryset = User.objects.all()

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save()

class UserAdminToggleStatusView(APIView):
    permission_classes = [IsAdminUserRole]

    @transaction.atomic
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            return Response({
                'id': user.id,
                'username': user.username,
                'is_active': user.is_active,
                'message': f"El usuario {user.username} ha sido {'activado' if user.is_active else 'dado de baja'} correctamente."
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

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        rol = self.get_object()
        rol.is_active = not rol.is_active
        rol.save()
        return Response({
            'status': 'success',
            'message': f"Rol {rol.nombre} {'activado' if rol.is_active else 'desactivado'} exitosamente.",
            'is_active': rol.is_active
        }, status=status.HTTP_200_OK)
