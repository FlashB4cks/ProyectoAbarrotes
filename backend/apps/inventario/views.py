import time
import uuid
import socket
import datetime
from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction, models
from django.db.models import Q, F
from django.utils import timezone
from .models import LoteInventario, AjusteInventario
from .serializers import LoteInventarioSerializer, AjusteInventarioSerializer
from apps.catalogos.models import Producto
from apps.auditoria.services import registrar_auditoria
from apps.autenticacion.permissions import IsAdminUserRole

# Memoria de sesiones para enlace de escáner en tiempo real
_SCANNER_SESSIONS = {}

import subprocess
import re

def get_network_interfaces():
    interfaces = []
    usb_ip = None

    try:
        out = subprocess.check_output('ipconfig', encoding='latin1', timeout=2)
        blocks = re.split(r'\r?\n\r?\n(?=[A-Za-z0-9])', out)
        for block in blocks:
            ip_match = re.search(r'IPv4[^\r\n]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)', block)
            if ip_match:
                ip = ip_match.group(1).strip()
                if ip.startswith('127.') or ip.startswith('169.254.'):
                    continue
                header = block.splitlines()[0].strip().rstrip(':')
                lower_header = header.lower()
                is_usb = 'usb' in lower_header or 'rndis' in lower_header or ip.startswith('192.168.42.') or ip.startswith('172.20.10.')
                is_wifi = 'wi-fi' in lower_header or 'inalambric' in lower_header or 'wireless' in lower_header
                
                label = f"📱 Cable USB ({ip})" if is_usb else (f"📶 Wi-Fi ({ip})" if is_wifi else f"🌐 Red Local ({ip})")
                
                item = {
                    'ip': ip,
                    'name': header,
                    'is_usb': is_usb,
                    'is_wifi': is_wifi,
                    'label': label,
                }
                interfaces.append(item)
                if is_usb and not usb_ip:
                    usb_ip = ip
    except Exception:
        pass

    if not interfaces:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            sock_ip = s.getsockname()[0]
            s.close()
            interfaces.append({
                'ip': sock_ip,
                'name': 'Red Local',
                'is_usb': False,
                'is_wifi': True,
                'label': f"📶 Wi-Fi / Red ({sock_ip})",
            })
        except Exception:
            interfaces.append({
                'ip': '127.0.0.1',
                'name': 'Loopback',
                'is_usb': False,
                'is_wifi': False,
                'label': 'Localhost (127.0.0.1)',
            })

    default_ip = usb_ip or interfaces[0]['ip']
    return default_ip, usb_ip, interfaces


class EscanerSesionView(APIView):
    """
    Genera o consulta una sesión de enlace para usar el teléfono como escáner por cable USB o Wi-Fi.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        default_ip, usb_ip, interfaces = get_network_interfaces()
        return Response({
            'status': 'success',
            'server_ip': default_ip,
            'usb_ip': usb_ip,
            'available_ips': interfaces,
            'frontend_port': 3000,
            'api_port': 8000
        }, status=status.HTTP_200_OK)

    def post(self, request):
        now = time.time()
        # Limpieza de sesiones de más de 2 horas
        expired = [sid for sid, s in _SCANNER_SESSIONS.items() if now - s['created_at'] > 7200]
        for sid in expired:
            _SCANNER_SESSIONS.pop(sid, None)

        session_id = str(uuid.uuid4())[:8]
        pin = f"{int(now * 1000) % 9000 + 1000}"
        default_ip, usb_ip, interfaces = get_network_interfaces()
        
        _SCANNER_SESSIONS[session_id] = {
            'pin': pin,
            'last_code': None,
            'last_code_id': 0,
            'created_at': now,
            'dispositivo': None,
            'total_escaneos': 0
        }

        qr_url = f"http://{default_ip}:3000/#scanner?s={session_id}&p={pin}"

        return Response({
            'status': 'success',
            'session_id': session_id,
            'pin': pin,
            'server_ip': default_ip,
            'usb_ip': usb_ip,
            'available_ips': interfaces,
            'qr_url': qr_url,
            'created_at': now
        }, status=status.HTTP_200_OK)


class EscanerEnviarView(APIView):
    """
    Endpoint invocado por el teléfono móvil para enviar el código de barras escaneado a la PC.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_id = request.data.get('session_id')
        pin = request.data.get('pin')
        codigo = request.data.get('codigo_barras')
        dispositivo = request.data.get('dispositivo', 'Teléfono Móvil')

        if not codigo or not str(codigo).strip():
            return Response({'detail': 'El código de barras es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        codigo_limpio = str(codigo).strip()

        session = None
        if session_id and session_id in _SCANNER_SESSIONS:
            session = _SCANNER_SESSIONS[session_id]
        elif pin:
            clean_pin = str(pin).strip()
            for s in _SCANNER_SESSIONS.values():
                if str(s.get('pin', '')).strip() == clean_pin:
                    session = s
                    break

        if not session:
            return Response({'detail': 'Sesión de escáner no encontrada o PIN inválido.'}, status=status.HTTP_404_NOT_FOUND)

        session['dispositivo'] = dispositivo

        # Si es un ping de vinculación / handshake
        if codigo_limpio in ('__PING__', 'PING_HANDSHAKE'):
            return Response({
                'status': 'success',
                'message': 'Teléfono vinculado exitosamente con NohemySys en la computadora.',
                'pin': session.get('pin'),
                'is_handshake': True
            }, status=status.HTTP_200_OK)

        session['last_code'] = codigo_limpio
        session['last_code_id'] += 1
        session['total_escaneos'] += 1

        return Response({
            'status': 'success',
            'message': f'Código {codigo_limpio} transmitido a la computadora exitosamente.',
            'codigo_barras': codigo_limpio,
            'code_id': session['last_code_id'],
            'total_escaneos': session['total_escaneos']
        }, status=status.HTTP_200_OK)


class EscanerRecibirView(APIView):
    """
    Endpoint consultado por la computadora para recibir códigos transmitidos desde el teléfono.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        since_id = int(request.query_params.get('since_id', 0))

        session = None
        if session_id and session_id in _SCANNER_SESSIONS:
            session = _SCANNER_SESSIONS[session_id]
        elif len(_SCANNER_SESSIONS) == 1:
            session = list(_SCANNER_SESSIONS.values())[0]

        if not session:
            return Response({
                'status': 'not_found',
                'has_new': False,
                'code_id': since_id
            }, status=status.HTTP_200_OK)

        if session['last_code_id'] > since_id and session['last_code']:
            return Response({
                'status': 'success',
                'has_new': True,
                'codigo_barras': session['last_code'],
                'code_id': session['last_code_id'],
                'dispositivo': session['dispositivo'],
                'total_escaneos': session['total_escaneos']
            }, status=status.HTTP_200_OK)

        return Response({
            'status': 'success',
            'has_new': False,
            'code_id': since_id,
            'conectado': bool(session['dispositivo'])
        }, status=status.HTTP_200_OK)


class LoteInventarioViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = LoteInventario.objects.select_related(
        'producto__unidad_medida', 'producto__categoria', 'compra__proveedor'
    ).all().order_by('fecha_vencimiento', 'fecha_ingreso')
    serializer_class = LoteInventarioSerializer

    def get_permissions(self):
        if self.action in ['registrar_merma']:
            return [IsAdminUserRole()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        producto_id = self.request.query_params.get('producto', None)
        categoria_id = self.request.query_params.get('categoria', None)
        solo_disponibles = self.request.query_params.get('disponibles', 'true')
        estado_vencimiento = self.request.query_params.get('estado_vencimiento', None)

        if search:
            s = search.strip()
            qs = qs.filter(
                Q(numero_lote__icontains=s) |
                Q(producto__nombre__icontains=s) |
                Q(producto__codigo_barras__icontains=s)
            )

        if producto_id:
            qs = qs.filter(producto_id=producto_id)

        if categoria_id and categoria_id != 'ALL':
            qs = qs.filter(producto__categoria_id=categoria_id)

        if solo_disponibles and solo_disponibles.lower() == 'true':
            qs = qs.filter(cantidad_actual__gt=0, is_active=True)

        if estado_vencimiento and estado_vencimiento != 'ALL':
            hoy = timezone.now().date()
            if estado_vencimiento == 'VENCIDO':
                qs = qs.filter(fecha_vencimiento__lte=hoy)
            elif estado_vencimiento == 'POR_VENCER':
                qs = qs.filter(fecha_vencimiento__gt=hoy, fecha_vencimiento__lte=hoy + datetime.timedelta(days=15))
            elif estado_vencimiento == 'ALERTA':
                qs = qs.filter(fecha_vencimiento__gt=hoy + datetime.timedelta(days=15), fecha_vencimiento__lte=hoy + datetime.timedelta(days=30))
            elif estado_vencimiento == 'BUENO':
                qs = qs.filter(fecha_vencimiento__gt=hoy + datetime.timedelta(days=30))

        return qs

    @action(detail=False, methods=['get'], url_path='resumen-semaforo')
    def resumen_semaforo(self, request):
        hoy = timezone.now().date()
        lotes_activos = LoteInventario.objects.filter(is_active=True, cantidad_actual__gt=0)

        vencidos = lotes_activos.filter(fecha_vencimiento__lte=hoy)
        por_vencer_15 = lotes_activos.filter(
            fecha_vencimiento__gt=hoy,
            fecha_vencimiento__lte=hoy + datetime.timedelta(days=15)
        )
        alerta_30 = lotes_activos.filter(
            fecha_vencimiento__gt=hoy + datetime.timedelta(days=15),
            fecha_vencimiento__lte=hoy + datetime.timedelta(days=30)
        )
        vigentes = lotes_activos.filter(fecha_vencimiento__gt=hoy + datetime.timedelta(days=30))

        # Cálculos monetarios y unidades
        unidades_vencidas = sum(l.cantidad_actual for l in vencidos)
        perdida_vencidos_gtq = sum(float(l.cantidad_actual * l.costo_unitario) for l in vencidos)

        unidades_por_vencer_15 = sum(l.cantidad_actual for l in por_vencer_15)
        riesgo_15_gtq = sum(float(l.cantidad_actual * l.costo_unitario) for l in por_vencer_15)

        unidades_alerta_30 = sum(l.cantidad_actual for l in alerta_30)
        riesgo_30_gtq = sum(float(l.cantidad_actual * l.costo_unitario) for l in alerta_30)

        unidades_vigentes = sum(l.cantidad_actual for l in vigentes)
        vigentes_gtq = sum(float(l.cantidad_actual * l.costo_unitario) for l in vigentes)

        total_unidades = sum(l.cantidad_actual for l in lotes_activos)
        total_valor_inventario = sum(float(l.cantidad_actual * l.costo_unitario) for l in lotes_activos)

        # Stock crítico de productos
        prods_activos = Producto.objects.filter(is_active=True)
        total_productos = prods_activos.count()
        prods_agotados = prods_activos.filter(stock_total=0).count()
        prods_bajo_minimo = prods_activos.filter(stock_total__gt=0, stock_total__lte=F('stock_minimo')).count()

        return Response({
            'status': 'success',
            'totales': {
                'total_lotes': lotes_activos.count(),
                'total_unidades': total_unidades,
                'total_valor_gtq': round(total_valor_inventario, 2),
            },
            'semaforo': {
                'vencidos': {
                    'lotes': vencidos.count(),
                    'unidades': unidades_vencidas,
                    'valor_gtq': round(perdida_vencidos_gtq, 2),
                },
                'por_vencer_15': {
                    'lotes': por_vencer_15.count(),
                    'unidades': unidades_por_vencer_15,
                    'valor_gtq': round(riesgo_15_gtq, 2),
                },
                'alerta_30': {
                    'lotes': alerta_30.count(),
                    'unidades': unidades_alerta_30,
                    'valor_gtq': round(riesgo_30_gtq, 2),
                },
                'vigentes': {
                    'lotes': vigentes.count(),
                    'unidades': unidades_vigentes,
                    'valor_gtq': round(vigentes_gtq, 2),
                }
            },
            'stock_critico': {
                'total_productos': total_productos,
                'agotados': prods_agotados,
                'bajo_minimo': prods_bajo_minimo,
                'total_criticos': prods_agotados + prods_bajo_minimo
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='stock-critico')
    def stock_critico(self, request):
        categoria_id = request.query_params.get('categoria', None)
        search = request.query_params.get('search', None)

        prods = Producto.objects.filter(
            is_active=True,
            stock_total__lte=F('stock_minimo')
        ).select_related('categoria', 'unidad_medida').order_by('stock_total', 'nombre')

        if categoria_id and categoria_id != 'ALL':
            prods = prods.filter(categoria_id=categoria_id)

        if search:
            s = search.strip()
            prods = prods.filter(
                Q(nombre__icontains=s) |
                Q(codigo_barras__icontains=s)
            )

        data = []
        for p in prods:
            deficit = max(0, (p.stock_minimo or 0) - p.stock_total)
            ultimo_lote = p.lotes.order_by('-fecha_ingreso').first()
            costo_ref = float(ultimo_lote.costo_unitario) if ultimo_lote else 0.0
            data.append({
                'id_producto': p.id_producto,
                'nombre': p.nombre,
                'codigo_barras': p.codigo_barras,
                'categoria_nombre': p.categoria.nombre if p.categoria else 'Sin Categoría',
                'unidad_simbolo': p.unidad_medida.simbolo if p.unidad_medida else 'ud',
                'stock_total': p.stock_total,
                'stock_minimo': p.stock_minimo,
                'deficit': deficit,
                'precio_costo': costo_ref,
                'precio_venta': float(p.precio_venta or 0),
                'estado': 'AGOTADO' if p.stock_total <= 0 else 'CRITICO'
            })

        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='registrar-merma')
    @transaction.atomic
    def registrar_merma(self, request, pk=None):
        lote = self.get_object()

        cantidad = request.data.get('cantidad')
        tipo = request.data.get('tipo', AjusteInventario.TipoAjuste.VENCIMIENTO)
        motivo = request.data.get('motivo', '').strip()

        try:
            cantidad = int(cantidad)
        except (ValueError, TypeError):
            return Response({'detail': 'La cantidad debe ser un número entero mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)

        if cantidad <= 0:
            return Response({'detail': 'La cantidad a retirar debe ser mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)

        if cantidad > lote.cantidad_actual:
            return Response({
                'detail': f'La cantidad a retirar ({cantidad}) supera las existencias disponibles en el lote ({lote.cantidad_actual}).'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not motivo:
            return Response({'detail': 'Debe especificar el motivo o justificación de la merma/baja.'}, status=status.HTTP_400_BAD_REQUEST)

        # Cálculo de pérdida monetaria
        perdida_total = Decimal(str(cantidad)) * lote.costo_unitario

        # 1. Descontar del lote con bloqueo pesimista (SEC-07)
        lote = LoteInventario.objects.select_for_update().get(pk=lote.pk)
        lote.cantidad_actual -= cantidad
        if lote.cantidad_actual == 0:
            lote.is_active = False
        lote.save(update_fields=['cantidad_actual', 'is_active'])

        # 2. Descontar del producto atómicamente a nivel de BD
        producto = lote.producto
        Producto.objects.filter(pk=producto.pk).update(
            stock_total=models.F('stock_total') - cantidad
        )

        # 3. Registrar el Ajuste / Merma
        ajuste = AjusteInventario.objects.create(
            lote=lote,
            tipo=tipo,
            cantidad=cantidad,
            costo_unitario=lote.costo_unitario,
            perdida_total=perdida_total,
            motivo=motivo,
            usuario=request.user
        )

        # 4. Registrar en Auditoría
        ip_addr = request.META.get('REMOTE_ADDR')
        registrar_auditoria(
            usuario=request.user,
            accion='MERMA_INVENTARIO',
            tabla_afectada='lotes_inventario',
            descripcion=f"Baja de inventario: {cantidad} uds del lote #{lote.numero_lote} ({producto.nombre}). Tipo: {tipo}. Motivo: {motivo}. Pérdida: Q{perdida_total:.2f}",
            ip_origen=ip_addr
        )

        return Response({
            'status': 'success',
            'message': f'Se registraron exitosamente {cantidad} unidades dadas de baja por {ajuste.get_tipo_display()}.',
            'ajuste': AjusteInventarioSerializer(ajuste).data,
            'lote': LoteInventarioSerializer(lote).data
        }, status=status.HTTP_201_CREATED)


class AjusteInventarioViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = AjusteInventario.objects.select_related(
        'lote__producto__unidad_medida', 'usuario'
    ).all().order_by('-fecha_ajuste')
    serializer_class = AjusteInventarioSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        tipo = self.request.query_params.get('tipo', None)
        search = self.request.query_params.get('search', None)

        if tipo and tipo != 'ALL':
            qs = qs.filter(tipo=tipo)

        if search:
            s = search.strip()
            qs = qs.filter(
                Q(lote__numero_lote__icontains=s) |
                Q(lote__producto__nombre__icontains=s) |
                Q(motivo__icontains=s)
            )

        return qs

