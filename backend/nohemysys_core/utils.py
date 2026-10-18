import re
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError

FIELD_LABELS = {
    'dpi': 'DPI',
    'nit': 'NIT',
    'codigo_barras': 'Código de Barras',
    'nombre_empresa': 'Nombre de Empresa',
    'nombre': 'Nombre',
    'first_name': 'Nombre',
    'last_name': 'Apellido',
    'email': 'Correo Electrónico',
    'username': 'Nombre de Usuario',
    'telefono': 'Teléfono',
    'direccion': 'Dirección',
    'codigo': 'Código',
    'simbolo': 'Símbolo',
    'precio_venta': 'Precio de Venta',
    'stock_minimo': 'Stock Mínimo',
    'password': 'Contraseña',
    'password_actual': 'Contraseña Actual',
    'nueva_password': 'Nueva Contraseña',
    'confirmar_password': 'Confirmación de Contraseña',
}

KNOWN_CONSTRAINTS = {
    'usuarios_dpi_key': ('dpi', 'Ya existe un empleado registrado con este número de DPI.'),
    'usuarios_username_key': ('username', 'Ya existe un usuario con este nombre de usuario.'),
    'productos_codigo_barras_key': ('codigo_barras', 'Ya existe un producto registrado con este código de barras.'),
    'categorias_nombre_key': ('nombre', 'Ya existe una categoría registrada con este nombre.'),
    'marcas_nombre_key': ('nombre', 'Ya existe una marca registrada con este nombre.'),
    'unidades_medida_nombre_key': ('nombre', 'Ya existe una unidad de medida registrada con este nombre.'),
    'roles_codigo_key': ('codigo', 'Ya existe un rol registrado con este código identificador.'),
    'departamentos_nombre_key': ('nombre', 'Ya existe un departamento registrado con este nombre.'),
    'clientes_dpi_key': ('dpi', 'Ya existe un cliente registrado con este número de DPI.'),
    'clientes_nit_key': ('nit', 'Ya existe un cliente registrado con este número de NIT.'),
    'proveedores_nit_key': ('nit', 'Ya existe un proveedor registrado con este número de NIT.'),
    'proveedores_nombre_empresa_key': ('nombre_empresa', 'Ya existe un proveedor registrado con este nombre o razón social.'),
}


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    # Manejar errores de integridad de base de datos no capturados por DRF (IntegrityError de PostgreSQL/Django)
    if response is None and isinstance(exc, IntegrityError):
        err_str = str(exc)
        matched_field = 'non_field_errors'
        matched_msg = None

        for constraint, (fld, msg) in KNOWN_CONSTRAINTS.items():
            if constraint in err_str:
                matched_field = fld
                matched_msg = msg
                break

        if not matched_msg:
            match = re.search(r'Key \((.*?)\)=\((.*?)\) already exists', err_str)
            if match:
                col = match.group(1).lower()
                val = match.group(2)
                label = FIELD_LABELS.get(col, col.capitalize())
                matched_field = col
                matched_msg = f"Ya existe un registro con este {label} ('{val}')."
            elif 'foreign key constraint' in err_str.lower() or 'violates foreign key' in err_str.lower():
                matched_msg = "No se puede completar la operación debido a registros relacionados existentes."
            else:
                matched_msg = "Error de integridad: ya existe un registro con datos únicos duplicados."

        return Response({
            'error': True,
            'status_code': status.HTTP_400_BAD_REQUEST,
            'message': matched_msg,
            'details': {matched_field: [matched_msg]}
        }, status=status.HTTP_400_BAD_REQUEST)

    if response is not None:
        custom_response_data = {
            'error': True,
            'status_code': response.status_code,
            'message': 'Error al procesar la solicitud.',
            'details': response.data
        }

        if isinstance(response.data, dict) and 'detail' in response.data:
            custom_response_data['message'] = str(response.data['detail'])
        elif isinstance(response.data, dict):
            # Extraer el primer error y formatearlo amigablemente
            for key, val in response.data.items():
                raw_msg = val[0] if isinstance(val, list) and len(val) > 0 else str(val)
                label = FIELD_LABELS.get(key, key.capitalize())

                # Traducir mensajes estándar en inglés de unicidad de DRF
                if 'already exists' in raw_msg.lower() or 'unique' in getattr(val[0], 'code', ''):
                    msg = f"Ya existe un registro con este {label}."
                else:
                    msg = raw_msg

                # Si el mensaje ya menciona explícitamente el campo o "ya existe", no duplicar prefijo
                if (msg.lower().startswith('ya existe') or 
                    msg.lower().startswith(label.lower()) or 
                    msg.lower().startswith('el ') or 
                    msg.lower().startswith('la ')):
                    custom_response_data['message'] = msg
                else:
                    custom_response_data['message'] = f"{label}: {msg}"
                break
        elif isinstance(response.data, list) and len(response.data) > 0:
            custom_response_data['message'] = str(response.data[0])

        response.data = custom_response_data

    return response
