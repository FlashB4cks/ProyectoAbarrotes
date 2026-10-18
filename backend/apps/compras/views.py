from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.db.models import Q, F
from .models import Compra
from .serializers import CompraSerializer, CompraCreateSerializer
from apps.inventario.models import LoteInventario
from apps.autenticacion.permissions import IsAdminUserRole

class CompraViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Compra.objects.select_related('proveedor', 'usuario_registra')\
                             .prefetch_related('detalles__producto__unidad_medida')\
                             .all()\
                             .order_by('-fecha_compra')

    def get_permissions(self):
        if self.action in ['anular_compra', 'destroy', 'update', 'partial_update']:
            return [IsAdminUserRole()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return CompraCreateSerializer
        return CompraSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        proveedor_id = self.request.query_params.get('proveedor', None)
        estado = self.request.query_params.get('estado', None)

        if search:
            s = search.strip()
            qs = qs.filter(
                Q(numero_comprobante__icontains=s) |
                Q(proveedor__nombre_empresa__icontains=s)
            )

        if proveedor_id:
            qs = qs.filter(proveedor_id=proveedor_id)

        if estado and estado != 'ALL':
            qs = qs.filter(estado=estado)

        return qs

    @action(detail=True, methods=['post'], url_path='anular')
    @transaction.atomic
    def anular_compra(self, request, pk=None):
        compra = self.get_object()

        if compra.estado == Compra.EstadoCompra.ANULADA:
            return Response(
                {'detail': 'Esta compra ya se encuentra anulada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar si algún lote originado por esta compra ha sido consumido en ventas
        lotes = LoteInventario.objects.select_for_update().filter(compra=compra)
        for lote in lotes:
            if lote.cantidad_actual < lote.cantidad_inicial:
                return Response(
                    {
                        'detail': f'No es posible anular la compra porque el producto "{lote.producto.nombre}" ya tuvo salidas o ventas registradas de este lote ({lote.cantidad_inicial - lote.cantidad_actual} unidades vendidas).'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Proceder con la anulación y reversión atómica de stock (SEC-07)
        for lote in lotes:
            Producto.objects.filter(pk=lote.producto_id).update(
                stock_total=models.F('stock_total') - lote.cantidad_actual
            )
            lote.is_active = False
            lote.cantidad_actual = 0
            lote.save(update_fields=['is_active', 'cantidad_actual'])

        compra.estado = Compra.EstadoCompra.ANULADA
        compra.save(update_fields=['estado'])

        return Response(
            {
                'status': 'success',
                'message': f'Compra #{compra.numero_comprobante} anulada exitosamente y stock revertido.',
                'estado': compra.estado
            },
            status=status.HTTP_200_OK
        )
