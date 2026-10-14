from rest_framework import serializers
from .models import BitacoraAuditoria

class BitacoraAuditoriaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    usuario_username = serializers.CharField(source='usuario.username', read_only=True, default='Sistema / Anónimo')
    usuario_rol = serializers.CharField(source='usuario.rol', read_only=True, default='SISTEMA')

    class Meta:
        model = BitacoraAuditoria
        fields = [
            'id_log',
            'usuario',
            'usuario_username',
            'usuario_nombre',
            'usuario_rol',
            'accion',
            'tabla_afectada',
            'descripcion',
            'fecha_hora',
            'ip_origen',
        ]

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            nombre = f"{obj.usuario.first_name} {obj.usuario.last_name}".strip()
            return nombre if nombre else obj.usuario.username
        return 'Sistema / Anónimo'
