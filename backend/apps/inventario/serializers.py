from rest_framework import serializers
from django.utils import timezone
from .models import LoteInventario, AjusteInventario

class LoteInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    producto_codigo = serializers.ReadOnlyField(source='producto.codigo_barras')
    categoria_id = serializers.ReadOnlyField(source='producto.categoria.id_categoria')
    categoria_nombre = serializers.ReadOnlyField(source='producto.categoria.nombre')
    unidad_simbolo = serializers.ReadOnlyField(source='producto.unidad_medida.simbolo')
    proveedor_nombre = serializers.ReadOnlyField(source='compra.proveedor.nombre_empresa')
    numero_comprobante_compra = serializers.ReadOnlyField(source='compra.numero_comprobante')
    dias_para_vencer = serializers.SerializerMethodField()
    estado_vencimiento = serializers.SerializerMethodField()
    correlativo_lote = serializers.SerializerMethodField()
    valor_lote = serializers.SerializerMethodField()

    class Meta:
        model = LoteInventario
        fields = [
            'id_lote',
            'correlativo_lote',
            'producto',
            'producto_nombre',
            'producto_codigo',
            'categoria_id',
            'categoria_nombre',
            'unidad_simbolo',
            'compra',
            'proveedor_nombre',
            'numero_comprobante_compra',
            'numero_lote',
            'fecha_ingreso',
            'fecha_vencimiento',
            'dias_para_vencer',
            'estado_vencimiento',
            'cantidad_inicial',
            'cantidad_actual',
            'costo_unitario',
            'valor_lote',
            'is_active'
        ]

    def get_correlativo_lote(self, obj):
        return f"LOT-{obj.id_lote:05d}"

    def get_dias_para_vencer(self, obj):
        if not obj.fecha_vencimiento:
            return None
        hoy = timezone.now().date()
        delta = (obj.fecha_vencimiento - hoy).days
        return delta

    def get_estado_vencimiento(self, obj):
        dias = self.get_dias_para_vencer(obj)
        if dias is None:
            return "NORMAL"
        if dias <= 0:
            return "VENCIDO"
        elif dias <= 15:
            return "POR_VENCER"
        elif dias <= 30:
            return "ALERTA"
        return "BUENO"

    def get_valor_lote(self, obj):
        return float(obj.cantidad_actual * obj.costo_unitario)


class AjusteInventarioSerializer(serializers.ModelSerializer):
    numero_lote = serializers.ReadOnlyField(source='lote.numero_lote')
    producto_nombre = serializers.ReadOnlyField(source='lote.producto.nombre')
    producto_codigo = serializers.ReadOnlyField(source='lote.producto.codigo_barras')
    unidad_simbolo = serializers.ReadOnlyField(source='lote.producto.unidad_medida.simbolo')
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AjusteInventario
        fields = [
            'id_ajuste',
            'lote',
            'numero_lote',
            'producto_nombre',
            'producto_codigo',
            'unidad_simbolo',
            'tipo',
            'tipo_display',
            'cantidad',
            'costo_unitario',
            'perdida_total',
            'motivo',
            'usuario',
            'usuario_nombre',
            'fecha_ajuste'
        ]

    def get_usuario_nombre(self, obj):
        if not obj.usuario:
            return 'Sistema'
        full_name = f"{obj.usuario.first_name} {obj.usuario.last_name}".strip()
        return full_name if full_name else obj.usuario.username
