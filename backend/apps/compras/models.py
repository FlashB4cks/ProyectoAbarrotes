from django.db import models
from django.conf import settings
from apps.catalogos.models import Proveedor, Producto

class Compra(models.Model):
    class EstadoCompra(models.TextChoices):
        RECIBIDA = 'RECIBIDA', 'Recibida'
        ANULADA = 'ANULADA', 'Anulada'

    id_compra = models.BigAutoField(primary_key=True)
    numero_comprobante = models.CharField(max_length=50, verbose_name="Número de Comprobante / Factura")
    fecha_compra = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Compra")
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='compras', verbose_name="Proveedor")
    usuario_registra = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='compras_registradas', verbose_name="Usuario que Registra")
    total_compra = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Total de Compra (GTQ)")
    estado = models.CharField(max_length=20, choices=EstadoCompra.choices, default=EstadoCompra.RECIBIDA, verbose_name="Estado de Compra")

    class Meta:
        db_table = 'compras'
        verbose_name = 'Compra'
        verbose_name_plural = 'Compras'
        ordering = ['-fecha_compra']

    def __str__(self):
        return f"Compra #{self.numero_comprobante} - {self.proveedor.nombre_empresa}"


class DetalleCompra(models.Model):
    id_detalle_compra = models.BigAutoField(primary_key=True)
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='detalles', verbose_name="Compra")
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='detalles_compra', verbose_name="Producto")
    cantidad = models.IntegerField(verbose_name="Cantidad Ingresada")
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo Unitario (GTQ)")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Subtotal (GTQ)")

    class Meta:
        db_table = 'detalle_compras'
        verbose_name = 'Detalle de Compra'
        verbose_name_plural = 'Detalles de Compras'

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre} en Compra #{self.compra.id_compra}"
