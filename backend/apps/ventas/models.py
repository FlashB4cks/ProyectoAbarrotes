from django.db import models
from django.conf import settings
from apps.catalogos.models import Producto
from apps.inventario.models import LoteInventario
from apps.compras.models import Compra

class Cliente(models.Model):
    id_cliente = models.BigAutoField(primary_key=True)
    nombre_completo = models.CharField(max_length=150, verbose_name="Nombre Completo / Razon Social")
    nit = models.CharField(max_length=20, default='C/F', verbose_name="NIT")
    dpi = models.CharField(max_length=20, null=True, blank=True, verbose_name="DPI")
    telefono = models.CharField(max_length=20, null=True, blank=True, verbose_name="Teléfono")
    direccion = models.CharField(max_length=255, null=True, blank=True, verbose_name="Dirección")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")

    class Meta:
        db_table = 'clientes'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['nombre_completo']

    def __str__(self):
        return f"{self.nombre_completo} (NIT: {self.nit})"

class SesionCaja(models.Model):
    class EstadoCaja(models.TextChoices):
        ABIERTA = 'ABIERTA', 'Abierta'
        CERRADA = 'CERRADA', 'Cerrada'

    id_sesion = models.BigAutoField(primary_key=True)
    usuario_apertura = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='cajas_abiertas',
        verbose_name="Usuario de Apertura"
    )
    usuario_cierre = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='cajas_cerradas',
        verbose_name="Usuario de Cierre"
    )
    monto_inicial = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Fondo Inicial / Base de Efectivo (GTQ)"
    )
    fecha_apertura = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha y Hora de Apertura"
    )
    fecha_cierre = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha y Hora de Cierre"
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoCaja.choices,
        default=EstadoCaja.ABIERTA,
        verbose_name="Estado de Caja"
    )

    # Arqueo y totales consolidados
    total_ventas_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Ventas en Efectivo")
    total_ventas_tarjeta = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Ventas con Tarjeta")
    total_ventas_transferencia = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Ventas por Transferencia")
    total_ingresos_extra = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Entradas Manuales")
    total_egresos_extra = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Salidas / Gastos Menores")

    monto_esperado = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Efectivo Esperado en Gaveta")
    monto_real_efectivo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Efectivo Físico Contado")
    diferencia = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Diferencia (Sobrante / Faltante)")
    observaciones = models.TextField(null=True, blank=True, verbose_name="Observaciones de Cierre")

    class Meta:
        db_table = 'sesiones_caja'
        verbose_name = 'Sesión / Control de Caja'
        verbose_name_plural = 'Sesiones / Control de Caja'
        ordering = ['-fecha_apertura']

    def __str__(self):
        return f"Caja #{self.id_sesion} ({self.estado}) - {self.fecha_apertura.strftime('%d/%m/%Y %H:%M')}"


class Venta(models.Model):
    class MetodoPago(models.TextChoices):
        EFECTIVO = 'EFECTIVO', 'Efectivo'
        TARJETA = 'TARJETA', 'Tarjeta de Débito/Crédito'
        TRANSFERENCIA = 'TRANSFERENCIA', 'Transferencia Bancaria'

    class EstadoVenta(models.TextChoices):
        COMPLETADA = 'COMPLETADA', 'Completada'
        ANULADA = 'ANULADA', 'Anulada'

    id_venta = models.BigAutoField(primary_key=True)
    codigo_factura = models.CharField(max_length=50, unique=True, verbose_name="Código de Factura / Correlativo")
    fecha_hora = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")
    vendedor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='ventas_realizadas', verbose_name="Vendedor / Cajero")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='ventas', verbose_name="Cliente")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Subtotal (GTQ)")
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Descuento (GTQ)")
    total = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Total General (GTQ)")
    metodo_pago = models.CharField(max_length=20, choices=MetodoPago.choices, default=MetodoPago.EFECTIVO, verbose_name="Método de Pago")
    monto_recibido = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Monto Recibido")
    cambio_entregado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Cambio Entregado")
    estado = models.CharField(max_length=20, choices=EstadoVenta.choices, default=EstadoVenta.COMPLETADA, verbose_name="Estado de Venta")
    sesion_caja = models.ForeignKey(SesionCaja, on_delete=models.SET_NULL, null=True, blank=True, related_name='ventas', verbose_name="Sesión de Caja")

    class Meta:
        db_table = 'ventas'
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering = ['-fecha_hora']

    def __str__(self):
        return f"Factura #{self.codigo_factura} - Total: Q{self.total}"


class DetalleVenta(models.Model):
    id_detalle_venta = models.BigAutoField(primary_key=True)
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles', verbose_name="Venta")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='detalles_venta', verbose_name="Producto")
    cantidad = models.IntegerField(verbose_name="Cantidad Vendida")
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Unitario (GTQ)")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Subtotal (GTQ)")

    class Meta:
        db_table = 'detalle_ventas'
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Ventas'

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre} en Factura #{self.venta.codigo_factura}"


class SalidaLoteVenta(models.Model):
    id_salida = models.BigAutoField(primary_key=True)
    detalle_venta = models.ForeignKey(DetalleVenta, on_delete=models.CASCADE, related_name='salidas_lote', verbose_name="Detalle de Venta")
    lote = models.ForeignKey(LoteInventario, on_delete=models.PROTECT, related_name='salidas_lote', verbose_name="Lote Descontado (FIFO)")
    cantidad_descontada = models.IntegerField(verbose_name="Cantidad Descontada del Lote")
    fecha_descuento = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Descuento")

    class Meta:
        db_table = 'salidas_lote_venta'
        verbose_name = 'Trazabilidad Salida Lote (FIFO)'
        verbose_name_plural = 'Trazabilidad Salidas Lotes (FIFO)'

    def __str__(self):
        return f"Salida {self.cantidad_descontada} un. del Lote #{self.lote.numero_lote}"


class MovimientoFinanciero(models.Model):
    class TipoMovimiento(models.TextChoices):
        INGRESO = 'INGRESO', 'Ingreso (Venta / Depósito)'
        EGRESO = 'EGRESO', 'Egreso (Compra / Gasto)'

    id_movimiento = models.BigAutoField(primary_key=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='movimientos_financieros', verbose_name="Usuario Autoriza")
    venta = models.ForeignKey(Venta, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos', verbose_name="Venta Origen")
    compra = models.ForeignKey(Compra, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos', verbose_name="Compra Origen")
    sesion_caja = models.ForeignKey(SesionCaja, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos', verbose_name="Sesión de Caja")
    tipo = models.CharField(max_length=20, choices=TipoMovimiento.choices, verbose_name="Tipo de Movimiento")
    monto = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Monto (GTQ)")
    concepto = models.CharField(max_length=255, verbose_name="Concepto / Descripción")
    fecha_hora = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")

    class Meta:
        db_table = 'movimientos_financieros'
        verbose_name = 'Movimiento Financiero'
        verbose_name_plural = 'Movimientos Financieros'
        ordering = ['-fecha_hora']

    def __str__(self):
        return f"[{self.tipo}] Q{self.monto} - {self.concepto}"
