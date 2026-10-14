from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from .models import User

admin.site.unregister(Group)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'dpi', 'nit', 'telefono', 'rol', 'is_active', 'date_joined')
    list_filter = ('rol', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'dpi', 'nit', 'telefono')
    ordering = ('-date_joined',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Información NohemySys', {'fields': ('rol', 'dpi', 'nit', 'telefono', 'direccion')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Información NohemySys', {'fields': ('rol', 'dpi', 'nit', 'telefono', 'direccion')}),
    )
