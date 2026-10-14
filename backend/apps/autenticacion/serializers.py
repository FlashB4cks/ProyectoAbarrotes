import string
import secrets
import unicodedata
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

def quitar_acentos(texto):
    if not texto:
        return ""
    nfkd = unicodedata.normalize('NFKD', texto)
    return "".join([c for c in nfkd if not unicodedata.combining(c)])

def generar_nombre_usuario(first_name, last_name):
    """
    Genera un nombre de usuario a partir de la inicial del primer nombre
    y los apellidos limpios (ej. 'Carlos Gómez Pérez' -> 'cgomezperez').
    Garantiza unicidad en la base de datos agregando números consecutivos en caso de colisión.
    """
    nombre_limpio = quitar_acentos(first_name.strip().lower())
    apellido_limpio = quitar_acentos(last_name.strip().lower().replace(" ", ""))

    inicial = nombre_limpio[0] if nombre_limpio else "u"
    base_username = f"{inicial}{apellido_limpio}"

    username = base_username
    contador = 1
    while User.objects.filter(username__iexact=username).exists():
        username = f"{base_username}{contador}"
        contador += 1

    return username

def generar_contrasena_segura(longitud=12):
    """
    Genera una contraseña aleatoria de alta seguridad conteniendo mayúsculas,
    minúsculas, números y símbolos especiales.
    """
    minusculas = string.ascii_lowercase
    mayusculas = string.ascii_uppercase
    digitos = string.digits
    simbolos = "!@#$%&*"

    # Asegurar al menos uno de cada tipo
    password = [
        secrets.choice(minusculas),
        secrets.choice(mayusculas),
        secrets.choice(digitos),
        secrets.choice(simbolos),
    ]

    todos = minusculas + mayusculas + digitos + simbolos
    for _ in range(longitud - 4):
        password.append(secrets.choice(todos))

    secrets.SystemRandom().shuffle(password)
    return "".join(password)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['rol'] = user.rol
        token['nombre_completo'] = f"{user.first_name} {user.last_name}".strip() or user.username
        return token

    def validate(self, attrs):
        username_or_email = attrs.get('username', '').strip()

        # Permitir inicio de sesión tanto por Nombre de Usuario como por Correo Electrónico
        if '@' in username_or_email:
            user_obj = User.objects.filter(email__iexact=username_or_email).first()
            if user_obj:
                attrs['username'] = user_obj.username
        else:
            if not User.objects.filter(username=username_or_email).exists():
                user_obj = User.objects.filter(email__iexact=username_or_email).first()
                if user_obj:
                    attrs['username'] = user_obj.username

        # Verificar si el usuario está dado de baja (Borrado Lógico)
        user_to_check = User.objects.filter(username=attrs.get('username')).first()
        if user_to_check and not user_to_check.is_active:
            raise serializers.ValidationError({
                'detail': 'Este empleado se encuentra dado de baja en el sistema. Acceso denegado.'
            })

        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'rol': self.user.rol,
            'rol_display': self.user.get_rol_display(),
            'dpi': self.user.dpi,
            'nit': self.user.nit,
            'telefono': self.user.telefono,
            'direccion': self.user.direccion,
            'debe_cambiar_password': self.user.debe_cambiar_password,
        }
        return data

from .models import Rol

class RolSerializer(serializers.ModelSerializer):
    usuarios_asignados = serializers.SerializerMethodField()

    class Meta:
        model = Rol
        fields = ['id_rol', 'codigo', 'nombre', 'descripcion', 'permisos', 'is_active', 'fecha_creacion', 'usuarios_asignados']
        read_only_fields = ['id_rol', 'fecha_creacion']

    def get_usuarios_asignados(self, obj):
        return User.objects.filter(rol=obj.codigo, is_active=True).count()


class UserSerializer(serializers.ModelSerializer):
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'rol', 'rol_display', 'dpi', 'nit', 'telefono', 'direccion', 'is_active', 'debe_cambiar_password', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class UserAdminSerializer(serializers.ModelSerializer):
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    contrasena_generada = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'rol', 'rol_display', 'dpi', 'nit', 'telefono', 'direccion', 'is_active', 'debe_cambiar_password', 'date_joined', 'contrasena_generada')
        read_only_fields = ('id', 'username', 'date_joined', 'contrasena_generada')

    def validate(self, attrs):
        # Validar Nombres y Apellidos Obligatorios
        first_name = attrs.get('first_name', getattr(self.instance, 'first_name', '')).strip()
        last_name = attrs.get('last_name', getattr(self.instance, 'last_name', '')).strip()
        if not first_name:
            raise serializers.ValidationError({'first_name': 'El nombre del empleado es obligatorio.'})
        if not last_name:
            raise serializers.ValidationError({'last_name': 'El apellido del empleado es obligatorio.'})

        # Validar que nombre y apellido no sean idénticos
        if first_name.lower() == last_name.lower():
            raise serializers.ValidationError({'last_name': 'El nombre y el apellido no pueden ser idénticos.'})

        # Validar duplicidad de empleado con el mismo nombre y apellido
        existing_emp = User.objects.filter(first_name__iexact=first_name, last_name__iexact=last_name)
        if self.instance:
            existing_emp = existing_emp.exclude(pk=self.instance.pk)
        if existing_emp.exists():
            raise serializers.ValidationError({
                'first_name': f'Ya existe un empleado registrado con el nombre completo "{first_name} {last_name}".'
            })

        # Validar DPI (Obligatorio al crear nuevo empleado; opcional en edición si no se cambia)
        if not self.instance:
            dpi = attrs.get('dpi', '').strip()
            if not dpi:
                raise serializers.ValidationError({'dpi': 'El DPI del empleado es obligatorio.'})
            if len(dpi) != 13 or not dpi.isdigit():
                raise serializers.ValidationError({'dpi': 'El DPI debe contener exactamente 13 dígitos numéricos.'})
        # Validar Teléfono (Opcional, pero si se provee debe contener máximo 8 dígitos numéricos)
        telefono = attrs.get('telefono', '').strip() if attrs.get('telefono') else ''
        if telefono:
            if not telefono.isdigit():
                raise serializers.ValidationError({'telefono': 'El teléfono debe contener únicamente números.'})
            if len(telefono) > 8:
                raise serializers.ValidationError({'telefono': 'El teléfono no puede tener más de 8 dígitos.'})

        return attrs

    def create(self, validated_data):
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')

        # Generar Username automático basado en inicial + apellidos
        username = generar_nombre_usuario(first_name, last_name)
        validated_data['username'] = username

        # Generar correo si no fue provisto
        if not validated_data.get('email'):
            validated_data['email'] = f"{username}@nohemy.com"

        # Generar contraseña segura automática
        contrasena_segura = generar_contrasena_segura(12)
        validated_data.pop('password', None)

        validated_data['debe_cambiar_password'] = True

        user = User.objects.create(**validated_data)
        user.set_password(contrasena_segura)
        user.save()

        # Adjuntar la contraseña generada a la instancia para que el serializer la retorne al frontend
        user.contrasena_generada = contrasena_segura
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(required=True)
    nueva_password = serializers.CharField(required=True)
    confirmar_password = serializers.CharField(required=True)

    def validate(self, attrs):
        user = self.context['request'].user
        password_actual = attrs.get('password_actual')
        nueva_password = attrs.get('nueva_password')
        confirmar_password = attrs.get('confirmar_password')

        if not user.check_password(password_actual):
            raise serializers.ValidationError({'password_actual': 'La contraseña actual es incorrecta.'})

        if nueva_password != confirmar_password:
            raise serializers.ValidationError({'confirmar_password': 'La confirmación de la contraseña no coincide.'})

        if len(nueva_password) < 8:
            raise serializers.ValidationError({'nueva_password': 'La nueva contraseña debe tener al menos 8 caracteres.'})

        if nueva_password.isdigit():
            raise serializers.ValidationError({'nueva_password': 'La contraseña no puede consistir únicamente de números.'})

        if not any(c.isupper() for c in nueva_password):
            raise serializers.ValidationError({'nueva_password': 'La contraseña debe contener al menos una letra mayúscula.'})

        if not any(c.islower() for c in nueva_password):
            raise serializers.ValidationError({'nueva_password': 'La contraseña debe contener al menos una letra minúscula.'})

        if not any(c.isdigit() for c in nueva_password):
            raise serializers.ValidationError({'nueva_password': 'La contraseña debe contener al menos un número.'})

        # Validar similitud con el usuario, nombre y apellido
        nueva_lower = nueva_password.lower()
        if user.username.lower() in nueva_lower:
            raise serializers.ValidationError({'nueva_password': 'La contraseña no puede contener tu nombre de usuario.'})

        first_name = quitar_acentos(user.first_name.strip().lower())
        last_name = quitar_acentos(user.last_name.strip().lower())

        for parte in first_name.split():
            if len(parte) >= 3 and parte in nueva_lower:
                raise serializers.ValidationError({'nueva_password': f'La contraseña no puede ser similar a tu nombre ({user.first_name}).'})

        for parte in last_name.split():
            if len(parte) >= 3 and parte in nueva_lower:
                raise serializers.ValidationError({'nueva_password': f'La contraseña no puede ser similar a tu apellido ({user.last_name}).'})

        if password_actual == nueva_password:
            raise serializers.ValidationError({'nueva_password': 'La nueva contraseña no puede ser igual a la contraseña temporal actual.'})

        return attrs
