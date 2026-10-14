from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.autenticacion.urls')),
    path('api/autenticacion/', include('apps.autenticacion.urls')),
    path('api/catalogos/', include('apps.catalogos.urls')),
    path('api/compras/', include('apps.compras.urls')),
    path('api/inventario/', include('apps.inventario.urls')),
    path('api/ventas/', include('apps.ventas.urls')),
    path('api/auditoria/', include('apps.auditoria.urls')),
]

