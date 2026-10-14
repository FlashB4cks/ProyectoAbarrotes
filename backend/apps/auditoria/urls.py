from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BitacoraAuditoriaViewSet

router = DefaultRouter()
router.register(r'bitacora', BitacoraAuditoriaViewSet, basename='bitacora')

urlpatterns = [
    path('', include(router.urls)),
]
