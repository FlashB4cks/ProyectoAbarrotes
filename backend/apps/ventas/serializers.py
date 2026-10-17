from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Cliente, SesionCaja, Venta, DetalleVenta, SalidaLoteVenta, MovimientoFinanciero
from apps.catalogos.models import Producto
from apps.inventario.models import LoteInventario


class ClienteSerializer(serializers.ModelSerializer):
    total_compras = serializers.SerializerMethodField()
    total_gastado = serializers.SerializerMethodField()
    ultima_compra = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = [
            'id_cliente',
            'nombre_completo',
            'nit',
            'dpi',
            'telefono',
            'direccion',
            'is_active',
            'fecha_registro',
            'total_compras',
            'total_gastado',
            'ultima_compra',
        ]
        read_only_fields = ['id_cliente', 'fecha_registro']

    def get_total_compras(self, obj):
        if hasattr(obj, 'ventas_count'):
            return obj.ventas_count
        return obj.ventas.filter(estado='COMPLETADA').count()

    def get_total_gastado(self, obj):
        if hasattr(obj, 'ventas_sum') and obj.ventas_sum is not None:
            return float(obj.ventas_sum)
        from django.db.models import Sum
        res = obj.ventas.filter(estado='COMPLETADA').aggregate(t=Sum('total'))['t']
        return float(res) if res else 0.0

    def get_ultima_compra(self, obj):
        v = obj.ventas.filter(estado='COMPLETADA').order_by('-fecha_hora').first()
        return v.fecha_hora.strftime('%d/%m/%Y %H:%M') if v else None

    def validate_nit(self, value):
        if value:
            v = value.strip().upper()
            instance = getattr(self, 'instance', None)
            is_cf_instance = instance and (instance.id_cliente == 1 or instance.nombre_completo == 'Consumidor Final')
            if not is_cf_instance and v in ['C/F', 'CF']:
                raise serializers.ValidationError(
                    "El NIT 'C/F' está reservado para la entidad Consumidor Final de ventas de mostrador. "
                    "Para clientes registrados use su NIT propio, DPI o 'S/N'."
                )
            if v.isdigit() and len(v) > 8:
                raise serializers.ValidationError("El NIT numérico no puede exceder los 8 dígitos.")
            if len(v) > 9:
                raise serializers.ValidationError("El NIT no puede exceder los 9 caracteres.")
            return v
        return 'S/N'

    def validate_telefono(self, value):
        if value:
            clean = ''.join(c for c in value if c.isdigit())
            if len(clean) != 8:
                raise serializers.ValidationError("El teléfono debe contener exactamente 8 dígitos numéricos.")
            return clean
        return value


class SalidaLoteVentaSerializer(serializers.ModelSerializer):
    numero_lote = serializers.CharField(source='lote.numero_lote', read_only=True)
    fecha_vencimiento = serializers.DateField(source='lote.fecha_vencimiento', read_only=True)

    class Meta:
        model = SalidaLoteVenta
        fields = [
            'id_salida',
            'lote',
            'numero_lote',
            'fecha_vencimiento',
            'cantidad_descontada',
            'fecha_descuento',
        ]
        read_only_fields = ['id_salida', 'fecha_descuento']


class DetalleVentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo_barras', read_only=True)
    unidad_simbolo = serializers.CharField(source='producto.unidad_medida.simbolo', read_only=True, default='')
    salidas_lote = SalidaLoteVentaSerializer(many=True, read_only=True)

    class Meta:
        model = DetalleVenta
        fields = [
            'id_detalle_venta',
            'producto',
            'producto_nombre',
            'producto_codigo',
            'unidad_simbolo',
            'cantidad',
            'precio_unitario',
            'subtotal',
            'salidas_lote',
        ]
        read_only_fields = ['id_detalle_venta', 'subtotal']


class VentaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre_completo', read_only=True)
    cliente_nit = serializers.CharField(source='cliente.nit', read_only=True)
    vendedor_nombre = serializers.SerializerMethodField()
    detalles = DetalleVentaSerializer(many=True, read_only=True)
    total_articulos = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            'id_venta',
            'codigo_factura',
            'fecha_hora',
            'vendedor',
            'vendedor_nombre',
            'cliente',
            'cliente_nombre',
            'cliente_nit',
            'subtotal',
            'descuento',
            'total',
            'metodo_pago',
            'monto_recibido',
            'cambio_entregado',
            'estado',
            'total_articulos',
            'detalles',
        ]
        read_only_fields = ['id_venta', 'codigo_factura', 'fecha_hora', 'vendedor']

    def get_vendedor_nombre(self, obj):
        if obj.vendedor:
            f = obj.vendedor.first_name
            l = obj.vendedor.last_name
            if f or l:
                return f"{f} {l}".strip()
            return obj.vendedor.username
        return "Cajero General"

    def get_total_articulos(self, obj):
        return sum(d.cantidad for d in obj.detalles.all()) if obj.pk else 0


class ItemVentaInputSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)


class VentaCreateSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField(required=False, allow_null=True)
    cliente_nuevo = serializers.DictField(required=False, allow_null=True)
    items = ItemVentaInputSerializer(many=True)
    metodo_pago = serializers.ChoiceField(choices=Venta.MetodoPago.choices, default=Venta.MetodoPago.EFECTIVO)
    descuento = serializers.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), min_value=Decimal('0.00'))
    monto_recibido = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), min_value=Decimal('0.00'))

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("Debe ingresar al menos un producto para facturar.")
        return value

    def validate(self, attrs):
        # Validación estricta de turno de caja abierto (Control de Caja)
        sesion_activa = SesionCaja.objects.filter(estado=SesionCaja.EstadoCaja.ABIERTA).first()
        if not sesion_activa:
            raise serializers.ValidationError(
                "No es posible procesar la venta porque no hay ningún turno de caja abierto. Debe aperturar un turno en 'Control de Caja' antes de realizar ventas."
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        vendedor = (request.user if request and request.user.is_authenticated else None) or get_user_model().objects.filter(is_active=True).first()

        cliente_id = validated_data.get('cliente_id')
        cliente_nuevo = validated_data.get('cliente_nuevo')
        items_data = validated_data.get('items')
        metodo_pago = validated_data.get('metodo_pago', Venta.MetodoPago.EFECTIVO)
        descuento = Decimal(str(validated_data.get('descuento', 0.00)))
        monto_recibido = Decimal(str(validated_data.get('monto_recibido', 0.00)))

        # 1. Resolver Cliente (Existente, nuevo o C/F por defecto)
        cliente = None
        if cliente_nuevo and cliente_nuevo.get('nombre_completo'):
            cliente = Cliente.objects.create(
                nombre_completo=cliente_nuevo.get('nombre_completo').strip(),
                nit=cliente_nuevo.get('nit', 'C/F').strip() or 'C/F',
                dpi=cliente_nuevo.get('dpi', '').strip() or None,
                telefono=cliente_nuevo.get('telefono', '').strip() or None,
                direccion=cliente_nuevo.get('direccion', '').strip() or None,
            )
        elif cliente_id:
            try:
                cliente = Cliente.objects.get(id_cliente=cliente_id, is_active=True)
            except Cliente.DoesNotExist:
                raise serializers.ValidationError({"cliente_id": "El cliente seleccionado no existe o está inactivo."})
        else:
            cliente, _ = Cliente.objects.get_or_create(
                nit='C/F',
                defaults={'nombre_completo': 'Consumidor Final', 'direccion': 'Ciudad'}
            )

        with transaction.atomic():
            # Generar correlativo único de factura
            ultimo_id = Venta.objects.select_for_update().count() + 1
            codigo_factura = f"FAC-{str(ultimo_id).zfill(6)}"
            while Venta.objects.filter(codigo_factura=codigo_factura).exists():
                ultimo_id += 1
                codigo_factura = f"FAC-{str(ultimo_id).zfill(6)}"

            subtotal_general = Decimal('0.00')
            detalles_para_crear = []

            # 2. Validar stock y preparar descuentos FIFO por cada ítem
            for item in items_data:
                prod_id = item['producto_id']
                cant_solicitada = item['cantidad']

                try:
                    producto = Producto.objects.select_for_update().get(id_producto=prod_id, is_active=True)
                except Producto.DoesNotExist:
                    raise serializers.ValidationError(f"El producto con ID {prod_id} no existe o está inactivo.")

                # Precio unitario: Establecido OBLIGATORIAMENTE por el catálogo oficial de la base de datos (SEC-01)
                precio_unit = Decimal(str(producto.precio_venta))
                subtotal_item = precio_unit * Decimal(cant_solicitada)
                subtotal_general += subtotal_item

                # Lotes disponibles ordenados por FIFO (primero fecha de vencimiento más próxima, luego ingreso)
                lotes_disponibles = list(
                    LoteInventario.objects.select_for_update()
                    .filter(producto=producto, cantidad_actual__gt=0, is_active=True)
                    .order_by('fecha_vencimiento', 'fecha_ingreso')
                )

                stock_total_lotes = sum(l.cantidad_actual for l in lotes_disponibles)
                if stock_total_lotes < cant_solicitada:
                    raise serializers.ValidationError(
                        f"Stock insuficiente para el producto '{producto.nombre}'. "
                        f"Solicitado: {cant_solicitada}, Disponible en lotes FIFO: {stock_total_lotes}."
                    )

                # Calcular qué lotes se descuentan
                descuentos_lotes = []
                por_descontar = cant_solicitada

                for lote in lotes_disponibles:
                    if por_descontar <= 0:
                        break
                    
                    tomar = min(lote.cantidad_actual, por_descontar)
                    lote.cantidad_actual -= tomar
                    lote.save(update_fields=['cantidad_actual'])

                    descuentos_lotes.append({
                        'lote': lote,
                        'cantidad_descontada': tomar,
                    })
                    por_descontar -= tomar

                # Descontar del stock general acumulado del producto
                producto.stock_total = max(0, producto.stock_total - cant_solicitada)
                producto.save(update_fields=['stock_total'])

                detalles_para_crear.append({
                    'producto': producto,
                    'cantidad': cant_solicitada,
                    'precio_unitario': precio_unit,
                    'subtotal': subtotal_item,
                    'descuentos_lotes': descuentos_lotes,
                })

            # 3. Calcular totales y cambio con validación estricta de descuentos (SEC-01)
            if descuento > subtotal_general:
                raise serializers.ValidationError("El descuento no puede ser superior al subtotal de la venta.")
            
            if subtotal_general > 0 and (descuento / subtotal_general) > Decimal('0.25'):
                es_admin = vendedor and (getattr(vendedor, 'rol', None) == 'ADMINISTRADOR' or getattr(vendedor, 'is_superuser', False))
                if not es_admin:
                    raise serializers.ValidationError("Los descuentos superiores al 25% requieren autorización de un Administrador.")

            total_general = max(Decimal('0.00'), subtotal_general - descuento)
            cambio = Decimal('0.00')

            if metodo_pago == Venta.MetodoPago.EFECTIVO:
                if monto_recibido < total_general:
                    raise serializers.ValidationError(
                        f"Monto recibido insuficiente. Total: Q{total_general:.2f}, Recibido: Q{monto_recibido:.2f}"
                    )
                cambio = monto_recibido - total_general
            else:
                monto_recibido = total_general
                cambio = Decimal('0.00')

            # Buscar sesión de caja abierta
            sesion_activa = SesionCaja.objects.filter(estado=SesionCaja.EstadoCaja.ABIERTA).first()
            if not sesion_activa:
                raise serializers.ValidationError(
                    "No hay ningún turno de caja abierto en este momento. Por favor aperture la caja en 'Control de Caja'."
                )

            # 4. Crear la cabecera de la Venta
            venta = Venta.objects.create(
                codigo_factura=codigo_factura,
                vendedor=vendedor,
                cliente=cliente,
                subtotal=subtotal_general,
                descuento=descuento,
                total=total_general,
                metodo_pago=metodo_pago,
                monto_recibido=monto_recibido,
                cambio_entregado=cambio,
                estado=Venta.EstadoVenta.COMPLETADA,
                sesion_caja=sesion_activa,
            )

            # 5. Crear detalles y trazabilidad de salidas por lote (FIFO)
            for d in detalles_para_crear:
                detalle_obj = DetalleVenta.objects.create(
                    venta=venta,
                    producto=d['producto'],
                    cantidad=d['cantidad'],
                    precio_unitario=d['precio_unitario'],
                    subtotal=d['subtotal'],
                )

                for desc in d['descuentos_lotes']:
                    SalidaLoteVenta.objects.create(
                        detalle_venta=detalle_obj,
                        lote=desc['lote'],
                        cantidad_descontada=desc['cantidad_descontada'],
                    )

            # 6. Registrar Movimiento Financiero (Ingreso por Venta)
            usuario_responsable = vendedor if (vendedor and vendedor.is_authenticated) else get_user_model().objects.filter(is_active=True).first()
            MovimientoFinanciero.objects.create(
                usuario=usuario_responsable,
                venta=venta,
                sesion_caja=sesion_activa,
                tipo=MovimientoFinanciero.TipoMovimiento.INGRESO,
                monto=total_general,
                concepto=f"Venta en POS Factura #{codigo_factura} ({metodo_pago})",
            )

            return venta


class MovimientoFinancieroSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    codigo_factura = serializers.CharField(source='venta.codigo_factura', read_only=True, default=None)

    class Meta:
        model = MovimientoFinanciero
        fields = [
            'id_movimiento',
            'tipo',
            'monto',
            'concepto',
            'fecha_hora',
            'usuario',
            'usuario_nombre',
            'venta',
            'codigo_factura',
            'compra',
            'sesion_caja',
        ]
        read_only_fields = ['id_movimiento', 'fecha_hora']

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip() or obj.usuario.username
        return "Sistema"


class SesionCajaSerializer(serializers.ModelSerializer):
    usuario_apertura_nombre = serializers.SerializerMethodField()
    usuario_cierre_nombre = serializers.SerializerMethodField()
    tiempo_abierta = serializers.SerializerMethodField()

    class Meta:
        model = SesionCaja
        fields = [
            'id_sesion',
            'usuario_apertura',
            'usuario_apertura_nombre',
            'usuario_cierre',
            'usuario_cierre_nombre',
            'monto_inicial',
            'fecha_apertura',
            'fecha_cierre',
            'estado',
            'total_ventas_efectivo',
            'total_ventas_tarjeta',
            'total_ventas_transferencia',
            'total_ingresos_extra',
            'total_egresos_extra',
            'monto_esperado',
            'monto_real_efectivo',
            'diferencia',
            'observaciones',
            'tiempo_abierta',
        ]
        read_only_fields = ['id_sesion', 'fecha_apertura', 'fecha_cierre']

    def get_usuario_apertura_nombre(self, obj):
        if obj.usuario_apertura:
            return f"{obj.usuario_apertura.first_name} {obj.usuario_apertura.last_name}".strip() or obj.usuario_apertura.username
        return "Sistema"

    def get_usuario_cierre_nombre(self, obj):
        if obj.usuario_cierre:
            return f"{obj.usuario_cierre.first_name} {obj.usuario_cierre.last_name}".strip() or obj.usuario_cierre.username
        return None

    def get_tiempo_abierta(self, obj):
        fin = obj.fecha_cierre or timezone.now()
        delta = fin - obj.fecha_apertura
        horas, rem = divmod(int(delta.total_seconds()), 3600)
        minutos, _ = divmod(rem, 60)
        return f"{horas}h {minutos}m"
