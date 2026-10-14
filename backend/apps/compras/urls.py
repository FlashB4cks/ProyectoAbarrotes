from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompraViewSet

router = DefaultRouter()
router.register(r'compras', CompraViewSet, basename='compras_named')
router.register(r'', CompraViewSet, basename='compras')

urlpatterns = [
    path('', include(router.urls)),
]
