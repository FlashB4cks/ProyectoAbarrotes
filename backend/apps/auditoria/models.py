from django.db import models
from django.conf import settings

class BitacoraAuditoria(models.Model):
    id_log = models.BigAutoField(primary_key=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='logs_auditoria', verbose_name="Usuario")
    accion = models.CharField(max_length=50, verbose_name="Acción Realizada (CREAR, EDITAR, ELIMINAR, LOGIN)")
    tabla_afectada = models.CharField(max_length=100, verbose_name="Tabla / Entidad Afectada")
    descripcion = models.TextField(verbose_name="Descripción Detallada de la Operación")
    fecha_hora = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")
    ip_origen = models.GenericIPAddressField(null=True, blank=True, verbose_name="Dirección IP de Origen")

    class Meta:
        db_table = 'bitacora_auditoria'
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Bitácora de Auditoría'
        ordering = ['-fecha_hora']

    def __str__(self):
        usuario_str = self.usuario.username if self.usuario else 'Sistema/Anónimo'
        return f"[{self.fecha_hora.strftime('%Y-%m-%d %H:%M')}] @{usuario_str} - {self.accion} en {self.tabla_afectada}"
