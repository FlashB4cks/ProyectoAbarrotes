from .models import BitacoraAuditoria

def registrar_auditoria(usuario=None, accion="ACCION", tabla_afectada="GENERAL", descripcion="", ip_origen=None, request=None):
    """
    Registra de forma inmutable un evento en la bitácora de auditoría (RF-07.1).
    Permite pasar usuario explícito o extraerlo de request, junto con la IP de origen.
    """
    try:
        user_obj = usuario if (usuario and hasattr(usuario, 'is_authenticated') and usuario.is_authenticated) else None
        if not user_obj and request and hasattr(request, 'user') and request.user.is_authenticated:
            user_obj = request.user

        if not ip_origen and request:
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                ip_origen = x_forwarded.split(',')[0].strip()
            else:
                ip_origen = request.META.get('REMOTE_ADDR')

        return BitacoraAuditoria.objects.create(
            usuario=user_obj,
            accion=accion,
            tabla_afectada=tabla_afectada,
            descripcion=descripcion,
            ip_origen=ip_origen
        )
    except Exception:
        return None
