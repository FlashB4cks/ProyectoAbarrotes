from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserProfileView,
    UserAdminListCreateView,
    UserAdminDetailView,
    UserAdminToggleStatusView,
    CambiarPasswordView,
    RolViewSet
)

router = DefaultRouter()
router.register(r'roles', RolViewSet, basename='roles')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('cambiar-password/', CambiarPasswordView.as_view(), name='cambiar_password'),
    path('users/', UserAdminListCreateView.as_view(), name='user_admin_list_create'),
    path('users/<int:pk>/', UserAdminDetailView.as_view(), name='user_admin_detail'),
    path('users/<int:pk>/toggle-status/', UserAdminToggleStatusView.as_view(), name='user_admin_toggle_status'),
    path('', include(router.urls)),
]
