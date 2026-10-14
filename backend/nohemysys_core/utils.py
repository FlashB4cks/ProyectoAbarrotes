from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'error': True,
            'status_code': response.status_code,
            'message': 'Error al procesar la solicitud.',
            'details': response.data
        }
        
        if isinstance(response.data, dict) and 'detail' in response.data:
            custom_response_data['message'] = response.data['detail']
        elif isinstance(response.data, dict):
            first_key = next(iter(response.data), None)
            if first_key and isinstance(response.data[first_key], list):
                custom_response_data['message'] = f"{first_key}: {response.data[first_key][0]}"

        response.data = custom_response_data

    return response
