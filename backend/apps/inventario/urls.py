from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoteInventarioViewSet,
    AjusteInventarioViewSet,
    EscanerSesionView,
    EscanerEnviarView,
    EscanerRecibirView
)

router = DefaultRouter()
router.register(r'lotes', LoteInventarioViewSet, basename='lotes')
router.register(r'ajustes', AjusteInventarioViewSet, basename='ajustes')

urlpatterns = [
    path('escaner/sesion/', EscanerSesionView.as_view(), name='escaner-sesion'),
    path('escaner/enviar/', EscanerEnviarView.as_view(), name='escaner-enviar'),
    path('escaner/recibir/', EscanerRecibirView.as_view(), name='escaner-recibir'),
    path('', include(router.urls)),
]
