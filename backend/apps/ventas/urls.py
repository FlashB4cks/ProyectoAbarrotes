from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, VentaViewSet, MovimientoFinancieroViewSet, SesionCajaViewSet
from .reports_views import ReporteFinancieroViewSet, ReporteMermasFIFOViewSet

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='clientes')
router.register(r'ventas', VentaViewSet, basename='ventas')
router.register(r'caja', SesionCajaViewSet, basename='caja')
router.register(r'movimientos', MovimientoFinancieroViewSet, basename='movimientos')
router.register(r'reportes/financiero', ReporteFinancieroViewSet, basename='reporte-financiero')
router.register(r'reportes/mermas-fifo', ReporteMermasFIFOViewSet, basename='reporte-mermas-fifo')

urlpatterns = [
    path('', include(router.urls)),
]
