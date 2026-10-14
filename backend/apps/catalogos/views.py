from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import Categoria, UnidadMedida, Proveedor, Producto, Marca
from .serializers import (
    CategoriaSerializer,
    UnidadMedidaSerializer,
    ProveedorSerializer,
    ProductoSerializer,
    MarcaSerializer
)
from apps.auditoria.services import registrar_auditoria
from apps.autenticacion.permissions import IsAdminOrReadOnly

class MarcaViewSet(viewsets.ModelViewSet):
    queryset = Marca.objects.all().order_by('-is_active', 'nombre')
    serializer_class = MarcaSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            qs = qs.filter(nombre__icontains=search.strip())
        return qs

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        marca = self.get_object()
        marca.is_active = not marca.is_active
        marca.save()
        estado_str = "activada" if marca.is_active else "dada de baja"
        return Response({
            'status': 'success',
            'message': f'Marca "{marca.nombre}" {estado_str} exitosamente.',
            'is_active': marca.is_active
        }, status=status.HTTP_200_OK)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all().order_by('-is_active', 'nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            qs = qs.filter(nombre__icontains=search.strip())
        return qs

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        categoria = self.get_object()
        categoria.is_active = not categoria.is_active
        categoria.save()
        estado_str = "activada" if categoria.is_active else "dada de baja"
        return Response({
            'status': 'success',
            'message': f'Categoría "{categoria.nombre}" {estado_str} exitosamente.',
            'is_active': categoria.is_active
        }, status=status.HTTP_200_OK)


class UnidadMedidaViewSet(viewsets.ModelViewSet):
    queryset = UnidadMedida.objects.all().order_by('-is_active', 'nombre')
    serializer_class = UnidadMedidaSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        unidad = self.get_object()
        unidad.is_active = not unidad.is_active
        unidad.save()
        estado_str = "activada" if unidad.is_active else "dada de baja"
        return Response({
            'status': 'success',
            'message': f'Unidad de medida "{unidad.nombre}" {estado_str} exitosamente.',
            'is_active': unidad.is_active
        }, status=status.HTTP_200_OK)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all().order_by('-is_active', 'nombre_empresa')
    serializer_class = ProveedorSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            s = search.strip()
            qs = qs.filter(
                Q(nombre_empresa__icontains=s) |
                Q(contacto__icontains=s) |
                Q(nit__icontains=s)
            )
        return qs

    def perform_create(self, serializer):
        proveedor = serializer.save()
        registrar_auditoria(
            usuario=self.request.user,
            accion="CREAR",
            tabla_afectada="PROVEEDORES",
            descripcion=f'Registro de nuevo proveedor: "{proveedor.nombre_empresa}" (NIT: {proveedor.nit or "C/F"}).',
            request=self.request
        )

    def perform_update(self, serializer):
        proveedor = serializer.save()
        registrar_auditoria(
            usuario=self.request.user,
            accion="EDITAR",
            tabla_afectada="PROVEEDORES",
            descripcion=f'Actualización de datos del proveedor "{proveedor.nombre_empresa}".',
            request=self.request
        )

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        proveedor = self.get_object()
        proveedor.is_active = not proveedor.is_active
        proveedor.save()
        estado_str = "activado" if proveedor.is_active else "dado de baja"
        registrar_auditoria(
            usuario=request.user,
            accion="EDITAR" if proveedor.is_active else "ELIMINAR",
            tabla_afectada="PROVEEDORES",
            descripcion=f'Proveedor "{proveedor.nombre_empresa}" {estado_str} (Soft Delete).',
            request=request
        )
        return Response({
            'status': 'success',
            'message': f'Proveedor "{proveedor.nombre_empresa}" {estado_str} exitosamente.',
            'is_active': proveedor.is_active
        }, status=status.HTTP_200_OK)


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.select_related('categoria', 'marca', 'unidad_medida', 'proveedor').all().order_by('-is_active', 'nombre')
    serializer_class = ProductoSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        categoria_id = self.request.query_params.get('categoria', None)
        marca_id = self.request.query_params.get('marca', None)
        stock_bajo = self.request.query_params.get('stock_bajo', None)

        if search:
            s = search.strip()
            qs = qs.filter(
                Q(nombre__icontains=s) |
                Q(codigo_barras__icontains=s) |
                Q(descripcion__icontains=s) |
                Q(marca__nombre__icontains=s) |
                Q(categoria__nombre__icontains=s) |
                Q(proveedor__nombre_empresa__icontains=s)
            )

        if categoria_id:
            qs = qs.filter(categoria_id=categoria_id)

        if marca_id:
            qs = qs.filter(marca_id=marca_id)

        if stock_bajo and stock_bajo.lower() == 'true':
            qs = [p for p in qs if p.stock_total <= p.stock_minimo]
            p_ids = [p.id_producto for p in qs]
            return Producto.objects.filter(id_producto__in=p_ids).select_related('categoria', 'marca', 'unidad_medida', 'proveedor')

        return qs

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        producto = self.get_object()
        producto.is_active = not producto.is_active
        producto.save()
        estado_str = "activado" if producto.is_active else "dado de baja"
        return Response({
            'status': 'success',
            'message': f'Producto "{producto.nombre}" {estado_str} exitosamente.',
            'is_active': producto.is_active
        }, status=status.HTTP_200_OK)
