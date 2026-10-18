from rest_framework import serializers
from .models import Categoria, UnidadMedida, Proveedor, Producto, Marca

class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = ('id_marca', 'nombre', 'descripcion', 'is_active', 'fecha_registro')
        read_only_fields = ('id_marca', 'fecha_registro')

    def validate_nombre(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('El nombre de la marca es obligatorio.')
        return val


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ('id_categoria', 'nombre', 'descripcion', 'is_active', 'fecha_creacion')
        read_only_fields = ('id_categoria', 'fecha_creacion')

    def validate_nombre(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('El nombre de la categoría es obligatorio.')
        return val


class UnidadMedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadMedida
        fields = ('id_unidad', 'nombre', 'simbolo', 'is_active')
        read_only_fields = ('id_unidad',)

    def validate_nombre(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('El nombre de la unidad de medida es obligatorio.')
        return val


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ('id_proveedor', 'nombre_empresa', 'contacto', 'telefono', 'email', 'nit', 'direccion', 'is_active', 'fecha_registro')
        read_only_fields = ('id_proveedor', 'fecha_registro')

    def validate_nombre_empresa(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('El nombre de la empresa es obligatorio.')
        return val

    def validate_telefono(self, value):
        if value:
            val = value.strip().replace(' ', '').replace('-', '')
            if not val.isdigit() or len(val) != 8:
                raise serializers.ValidationError('El teléfono del proveedor debe contener exactamente 8 dígitos numéricos.')
            return val
        return value

    def validate_nit(self, value):
        if value:
            v = value.strip().upper()
            if v.isdigit() and len(v) > 8:
                raise serializers.ValidationError('El NIT numérico no puede exceder los 8 dígitos.')
            if len(v) > 9:
                raise serializers.ValidationError('El NIT no puede exceder los 9 caracteres.')
            return v
        return value


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    marca_nombre = serializers.ReadOnlyField(source='marca.nombre')
    unidad_simbolo = serializers.ReadOnlyField(source='unidad_medida.simbolo')
    proveedor_empresa = serializers.ReadOnlyField(source='proveedor.nombre_empresa')
    es_stock_bajo = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = (
            'id_producto',
            'codigo_barras',
            'nombre',
            'descripcion',
            'categoria',
            'categoria_nombre',
            'marca',
            'marca_nombre',
            'unidad_medida',
            'unidad_simbolo',
            'proveedor',
            'proveedor_empresa',
            'precio_venta',
            'stock_total',
            'stock_minimo',
            'es_stock_bajo',
            'is_active',
            'fecha_registro'
        )
        read_only_fields = ('id_producto', 'stock_total', 'fecha_registro')

    def get_es_stock_bajo(self, obj):
        return obj.stock_total <= obj.stock_minimo

    def validate_codigo_barras(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('El código de barras es obligatorio.')
        
        # Verificar unicidad respetando edición de la misma instancia
        instance = getattr(self, 'instance', None)
        qs = Producto.objects.filter(codigo_barras__iexact=val)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un producto registrado con este código de barras.')
        return val

    def validate_nombre(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('El nombre del producto es obligatorio.')
        return val

    def validate_precio_venta(self, value):
        if value <= 0:
            raise serializers.ValidationError('El precio de venta debe ser mayor a Q 0.00.')
        return value

    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock mínimo no puede ser un valor negativo.')
        return value
