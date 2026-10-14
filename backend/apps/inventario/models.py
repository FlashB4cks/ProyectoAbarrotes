from django.db import models
from django.conf import settings
from apps.catalogos.models import Producto
from apps.compras.models import Compra

class LoteInventario(models.Model):
    id_lote = models.BigAutoField(primary_key=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='lotes', verbose_name="Producto")
    compra = models.ForeignKey(Compra, on_delete=models.SET_NULL, null=True, blank=True, related_name='lotes', verbose_name="Compra Origen")
    numero_lote = models.CharField(max_length=50, verbose_name="Número de Lote")
    fecha_ingreso = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Ingreso")
    fecha_vencimiento = models.DateField(verbose_name="Fecha de Vencimiento")
    cantidad_inicial = models.IntegerField(verbose_name="Cantidad Inicial")
    cantidad_actual = models.IntegerField(verbose_name="Cantidad Disponible (Stock Lote)")
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo Unitario (GTQ)")
    is_active = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        db_table = 'lotes_inventario'
        verbose_name = 'Lote de Inventario (FIFO)'
        verbose_name_plural = 'Lotes de Inventario (FIFO)'
        ordering = ['fecha_vencimiento', 'fecha_ingreso']

    def __str__(self):
        return f"Lote {self.numero_lote} - {self.producto.nombre} (Vence: {self.fecha_vencimiento}) - Disponibles: {self.cantidad_actual}"


class AjusteInventario(models.Model):
    class TipoAjuste(models.TextChoices):
        VENCIMIENTO = 'VENCIMIENTO', 'Merma por Vencimiento / Caducidad'
        ROTURA = 'ROTURA', 'Merma por Daño / Rotura / Deterioro'
        AJUSTE_FISICO = 'AJUSTE_FISICO', 'Ajuste de Conteo Físico / Faltante'

    id_ajuste = models.BigAutoField(primary_key=True)
    lote = models.ForeignKey(LoteInventario, on_delete=models.CASCADE, related_name='ajustes', verbose_name="Lote Afectado")
    tipo = models.CharField(max_length=20, choices=TipoAjuste.choices, default=TipoAjuste.VENCIMIENTO, verbose_name="Tipo de Ajuste")
    cantidad = models.IntegerField(verbose_name="Cantidad Descontada")
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo Unitario (GTQ)")
    perdida_total = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Pérdida Total (GTQ)")
    motivo = models.TextField(verbose_name="Motivo o Justificación")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='ajustes_inventario', verbose_name="Usuario Responsable")
    fecha_ajuste = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora del Ajuste")

    class Meta:
        db_table = 'ajustes_inventario'
        verbose_name = 'Ajuste de Inventario / Merma'
        verbose_name_plural = 'Ajustes de Inventario y Mermas'
        ordering = ['-fecha_ajuste']

    def __str__(self):
        return f"Ajuste #{self.id_ajuste} ({self.tipo}) - {self.cantidad}x {self.lote.producto.nombre}"
