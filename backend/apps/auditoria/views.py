from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from .models import BitacoraAuditoria
from .serializers import BitacoraAuditoriaSerializer
from apps.autenticacion.permissions import IsAdminUserRole

class BitacoraAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Supervisión inmutable de eventos y transacciones en la bitácora de auditoría (RF-07.1).
    """
    queryset = BitacoraAuditoria.objects.select_related('usuario').all().order_by('-fecha_hora')
    serializer_class = BitacoraAuditoriaSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        accion = self.request.query_params.get('accion', None)
        tabla = self.request.query_params.get('tabla', None)
        fecha_inicio = self.request.query_params.get('fecha_inicio', None)
        fecha_fin = self.request.query_params.get('fecha_fin', None)

        if search:
            s = search.strip()
            qs = qs.filter(
                Q(usuario__username__icontains=s) |
                Q(usuario__first_name__icontains=s) |
                Q(usuario__last_name__icontains=s) |
                Q(tabla_afectada__icontains=s) |
                Q(descripcion__icontains=s) |
                Q(ip_origen__icontains=s)
            )

        if accion and accion != 'TODAS':
            qs = qs.filter(accion__iexact=accion.strip())

        if tabla:
            qs = qs.filter(tabla_afectada__icontains=tabla.strip())

        if fecha_inicio:
            qs = qs.filter(fecha_hora__date__gte=fecha_inicio)

        if fecha_fin:
            qs = qs.filter(fecha_hora__date__lte=fecha_fin)

        return qs

    @action(detail=False, methods=['get'], url_path='resumen')
    def resumen(self, request):
        """
        Retorna estadísticas rápidas de actividad para el dashboard de auditoría.
        """
        hoy = timezone.localdate()
        total_eventos = BitacoraAuditoria.objects.count()
        eventos_hoy = BitacoraAuditoria.objects.filter(fecha_hora__date=hoy).count()
        usuarios_activos_hoy = BitacoraAuditoria.objects.filter(
            fecha_hora__date=hoy, 
            usuario__isnull=False
        ).values('usuario').distinct().count()

        por_accion = BitacoraAuditoria.objects.values('accion').annotate(
            total=Count('id_log')
        ).order_by('-total')[:6]

        return Response({
            'total_eventos': total_eventos,
            'eventos_hoy': eventos_hoy,
            'usuarios_activos_hoy': usuarios_activos_hoy,
            'por_accion': list(por_accion),
        }, status=status.HTTP_200_OK)
