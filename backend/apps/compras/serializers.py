from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from .models import Compra, DetalleCompra
from apps.catalogos.models import Proveedor, Producto
from apps.inventario.models import LoteInventario

class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    producto_codigo = serializers.ReadOnlyField(source='producto.codigo_barras')
    unidad_simbolo = serializers.ReadOnlyField(source='producto.unidad_medida.simbolo')

    class Meta:
        model = DetalleCompra
        fields = [
            'id_detalle_compra',
            'producto',
            'producto_nombre',
            'producto_codigo',
            'unidad_simbolo',
            'cantidad',
            'costo_unitario',
            'subtotal'
        ]


class ItemCompraInputSerializer(serializers.Serializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.filter(is_active=True))
    cantidad = serializers.IntegerField(min_value=1)
    costo_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    numero_lote = serializers.CharField(max_length=50, required=False, allow_blank=True)
    fecha_vencimiento = serializers.DateField(required=False, allow_null=True)


class CompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre_empresa')
    usuario_nombre = serializers.SerializerMethodField()
    detalles = DetalleCompraSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = [
            'id_compra',
            'numero_comprobante',
            'fecha_compra',
            'proveedor',
            'proveedor_nombre',
            'usuario_registra',
            'usuario_nombre',
            'total_compra',
            'estado',
            'detalles',
            'total_items'
        ]
        read_only_fields = ['id_compra', 'fecha_compra', 'usuario_registra', 'total_compra', 'estado']

    def get_usuario_nombre(self, obj):
        if obj.usuario_registra:
            return f"{obj.usuario_registra.first_name} {obj.usuario_registra.last_name}".strip() or obj.usuario_registra.username
        return "Sistema"

    def get_total_items(self, obj):
        return obj.detalles.count()


class CompraCreateSerializer(serializers.ModelSerializer):
    items = ItemCompraInputSerializer(many=True, write_only=True)

    class Meta:
        model = Compra
        fields = [
            'id_compra',
            'numero_comprobante',
            'proveedor',
            'items'
        ]

    def validate_numero_comprobante(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("El número de comprobante o factura es obligatorio.")
        return val

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("Debe incluir al menos un producto en la compra.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user

        # Crear la cabecera de la compra
        compra = Compra.objects.create(
            numero_comprobante=validated_data['numero_comprobante'],
            proveedor=validated_data['proveedor'],
            usuario_registra=user,
            total_compra=0.00,
            estado=Compra.EstadoCompra.RECIBIDA
        )

        total_acumulado = 0.00
        ahora = timezone.now()
        hoy = ahora.date()

        for idx, item in enumerate(items_data):
            producto = item['producto']
            cantidad = item['cantidad']
            costo_unitario = item['costo_unitario']
            subtotal = cantidad * costo_unitario
            total_acumulado += float(subtotal)

            # 1. Registrar detalle de compra
            DetalleCompra.objects.create(
                compra=compra,
                producto=producto,
                cantidad=cantidad,
                costo_unitario=costo_unitario,
                subtotal=subtotal
            )

            # 2. Fecha de vencimiento (por defecto 6 meses si no se especificó)
            f_venc = item.get('fecha_vencimiento')
            if not f_venc:
                f_venc = hoy + timedelta(days=180)

            num_lote = item.get('numero_lote', '').strip()

            # 3. Crear lote en inventario (FIFO) con correlativo secuencial de tabla
            lote = LoteInventario.objects.create(
                producto=producto,
                compra=compra,
                numero_lote=num_lote or "PENDIENTE",
                fecha_vencimiento=f_venc,
                cantidad_inicial=cantidad,
                cantidad_actual=cantidad,
                costo_unitario=costo_unitario,
                is_active=True
            )

            if not num_lote:
                lote.numero_lote = f"LOT-{lote.id_lote:05d}"
                lote.save(update_fields=['numero_lote'])

            # 5. Incrementar stock acumulado del producto
            producto.stock_total += cantidad
            producto.save(update_fields=['stock_total'])

        compra.total_compra = total_acumulado
        compra.save(update_fields=['total_compra'])

        return compra
