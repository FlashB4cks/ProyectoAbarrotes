from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from decimal import Decimal
from django.contrib.auth import get_user_model

from .models import Cliente, SesionCaja, Venta, DetalleVenta, SalidaLoteVenta, MovimientoFinanciero
from .serializers import (
    ClienteSerializer,
    VentaSerializer,
    VentaCreateSerializer,
    MovimientoFinancieroSerializer,
    SesionCajaSerializer,
)
from apps.auditoria.services import registrar_auditoria


class ClienteViewSet(viewsets.ModelViewSet):
    """
    Gestión de Clientes para el Punto de Venta (POS) y Facturación.
    """
    queryset = Cliente.objects.all().order_by('-is_active', 'nombre_completo')
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.annotate(
            ventas_count=Count('ventas', filter=Q(ventas__estado='COMPLETADA')),
            ventas_sum=Sum('ventas__total', filter=Q(ventas__estado='COMPLETADA'))
        )
        search = self.request.query_params.get('search', None)
        if search:
            s = search.strip()
            qs = qs.filter(
                Q(nombre_completo__icontains=s) |
                Q(nit__icontains=s) |
                Q(dpi__icontains=s) |
                Q(telefono__icontains=s) |
                Q(direccion__icontains=s)
            )
        return qs

    def perform_create(self, serializer):
        cliente = serializer.save()
        registrar_auditoria(
            request=self.request,
            accion='CREAR',
            tabla_afectada='clientes',
            descripcion=f'Registró al cliente "{cliente.nombre_completo}" con NIT: {cliente.nit}'
        )

    def perform_update(self, serializer):
        cliente = serializer.save()
        registrar_auditoria(
            request=self.request,
            accion='EDITAR',
            tabla_afectada='clientes',
            descripcion=f'Actualizó datos del cliente "{cliente.nombre_completo}" (ID: {cliente.id_cliente})'
        )

    def destroy(self, request, *args, **kwargs):
        if not (request.user and (getattr(request.user, 'rol', None) == 'ADMINISTRADOR' or request.user.is_superuser)):
            return Response({'error': 'Solo administradores están autorizados para eliminar registros de clientes.'}, status=status.HTTP_403_FORBIDDEN)
        cliente = self.get_object()
        if cliente.id_cliente == 1 or cliente.nit == 'C/F' or cliente.nombre_completo == 'Consumidor Final':
            return Response(
                {'error': 'La entidad fiscal Consumidor Final (C/F) es un registro protegido del sistema y no puede eliminarse.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='consumidor-final')
    def consumidor_final(self, request):
        """Retorna o crea el cliente por defecto C/F (Consumidor Final)."""
        cliente, _ = Cliente.objects.get_or_create(
            nit='C/F',
            defaults={
                'nombre_completo': 'Consumidor Final',
                'direccion': 'Ciudad',
                'is_active': True,
            }
        )
        serializer = self.get_serializer(cliente)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='consumidor_final')
    def consumidor_final_underscore(self, request):
        return self.consumidor_final(request)

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        if not (request.user and (getattr(request.user, 'rol', None) == 'ADMINISTRADOR' or request.user.is_superuser)):
            return Response({'error': 'Solo administradores están autorizados para cambiar el estado de clientes.'}, status=status.HTTP_403_FORBIDDEN)
        cliente = self.get_object()
        if cliente.id_cliente == 1 or cliente.nit == 'C/F' or cliente.nombre_completo == 'Consumidor Final':
            return Response(
                {'error': 'La entidad fiscal Consumidor Final (C/F) es un registro fijo del sistema y no puede ser dado de baja.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        cliente.is_active = not cliente.is_active
        cliente.save()
        estado = "reactivado" if cliente.is_active else "dado de baja"
        registrar_auditoria(
            request=request,
            accion='ESTADO',
            tabla_afectada='clientes',
            descripcion=f'Cambió estado a {estado} para cliente "{cliente.nombre_completo}" (ID: {cliente.id_cliente})'
        )
        return Response({
            'status': 'success',
            'message': f'Cliente "{cliente.nombre_completo}" {estado} exitosamente.',
            'is_active': cliente.is_active
        }, status=status.HTTP_200_OK)


class VentaViewSet(viewsets.ModelViewSet):
    """
    Punto de Venta (POS) y Facturación con Descuento FIFO Automático.
    """
    queryset = Venta.objects.select_related('cliente', 'vendedor').prefetch_related(
        'detalles__producto__unidad_medida',
        'detalles__salidas_lote__lote'
    ).all().order_by('-fecha_hora')
    serializer_class = VentaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return VentaCreateSerializer
        return VentaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', None)
        estado = self.request.query_params.get('estado', None)
        metodo = self.request.query_params.get('metodo_pago', None)
        fecha = self.request.query_params.get('fecha', None)

        if search:
            s = search.strip()
            qs = qs.filter(
                Q(codigo_factura__icontains=s) |
                Q(cliente__nombre_completo__icontains=s) |
                Q(cliente__nit__icontains=s) |
                Q(vendedor__username__icontains=s) |
                Q(vendedor__first_name__icontains=s) |
                Q(vendedor__last_name__icontains=s)
            )

        if estado:
            qs = qs.filter(estado=estado)

        if metodo:
            qs = qs.filter(metodo_pago=metodo)

        if fecha:
            qs = qs.filter(fecha_hora__date=fecha)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = VentaCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        venta = serializer.save()
        
        # Registrar en Bitácora de Auditoría (RF-07.1)
        registrar_auditoria(
            usuario=request.user,
            accion="VENTA",
            tabla_afectada="ventas",
            descripcion=f"Factura #{venta.codigo_factura} emitida por Q{venta.total} ({venta.metodo_pago}) a cliente {venta.cliente.nombre_completo}",
            request=request
        )

        # Devolver el objeto serializado completo para el comprobante
        read_serializer = VentaSerializer(venta)
        return Response({
            'status': 'success',
            'message': f'Venta #{venta.codigo_factura} procesada exitosamente con rotación FIFO.',
            'venta': read_serializer.data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='anular')
    def anular(self, request, pk=None):
        """
        Anulación de venta con restitución automática de stock en los lotes FIFO correspondientes.
        """
        venta = self.get_object()

        if not (request.user and (getattr(request.user, 'rol', None) == 'ADMINISTRADOR' or request.user.is_superuser)):
            return Response({
                'status': 'error',
                'message': 'Solo un usuario con rol ADMINISTRADOR está autorizado para anular facturas de venta.'
            }, status=status.HTTP_403_FORBIDDEN)

        if venta.estado == Venta.EstadoVenta.ANULADA:
            return Response({
                'status': 'error',
                'message': f'La venta #{venta.codigo_factura} ya se encuentra anulada.'
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Revertir cada salida de lote y reponer stock del producto atómicamente (SEC-07)
            for detalle in venta.detalles.all():
                for salida in detalle.salidas_lote.all():
                    LoteInventario.objects.filter(pk=salida.lote_id).update(
                        cantidad_actual=F('cantidad_actual') + salida.cantidad_descontada
                    )
                    Producto.objects.filter(pk=detalle.producto_id).update(
                        stock_total=F('stock_total') + salida.cantidad_descontada
                    )

            venta.estado = Venta.EstadoVenta.ANULADA
            venta.save(update_fields=['estado'])

            # Registrar Movimiento Financiero de Egreso por anulación
            usuario_anula = request.user if (request.user and request.user.is_authenticated) else get_user_model().objects.filter(is_active=True).first()
            MovimientoFinanciero.objects.create(
                usuario=usuario_anula,
                venta=venta,
                tipo=MovimientoFinanciero.TipoMovimiento.EGRESO,
                monto=venta.total,
                concepto=f"Anulación y Reembolso Factura #{venta.codigo_factura}",
            )

            # Registrar en Bitácora de Auditoría (RF-07.1)
            registrar_auditoria(
                usuario=request.user,
                accion="ANULAR_VENTA",
                tabla_afectada="ventas",
                descripcion=f"Venta #{venta.codigo_factura} por Q{venta.total} fue anulada. Stock FIFO restituido.",
                request=request
            )

        return Response({
            'status': 'success',
            'message': f'Venta #{venta.codigo_factura} anulada. El stock de los lotes fue restituido exitosamente.',
            'venta': VentaSerializer(venta).data,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='resumen_diario')
    def resumen_diario(self, request):
        """Resumen de ventas y caja del día actual."""
        hoy = timezone.localdate()
        ventas_hoy = Venta.objects.filter(fecha_hora__date=hoy, estado=Venta.EstadoVenta.COMPLETADA)

        total_ventas = ventas_hoy.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        conteo_ventas = ventas_hoy.count()

        por_metodo = ventas_hoy.values('metodo_pago').annotate(
            total=Sum('total'),
            cantidad=Count('id_venta')
        )

        return Response({
            'fecha': str(hoy),
            'total_diario': float(total_ventas),
            'conteo_transacciones': conteo_ventas,
            'desglose_metodos': list(por_metodo),
        }, status=status.HTTP_200_OK)


class MovimientoFinancieroViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Bitácora y Flujo de Caja (Movimientos Financieros de Ingreso y Egreso).
    """
    queryset = MovimientoFinanciero.objects.select_related('usuario', 'venta', 'compra').all().order_by('-fecha_hora')
    serializer_class = MovimientoFinancieroSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        tipo = self.request.query_params.get('tipo', None)
        fecha = self.request.query_params.get('fecha', None)
        if tipo:
            qs = qs.filter(tipo=tipo)
        if fecha:
            qs = qs.filter(fecha_hora__date=fecha)
        return qs


class SesionCajaViewSet(viewsets.ModelViewSet):
    """
    Control de Caja (Apertura, Movimientos de Entrada/Salida, Arqueo y Cierre).
    """
    queryset = SesionCaja.objects.select_related('usuario_apertura', 'usuario_cierre').all().order_by('-fecha_apertura')
    serializer_class = SesionCajaSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='activa')
    def activa(self, request):
        """Retorna la sesión de caja actualmente abierta con métricas consolidadas en tiempo real."""
        sesion = SesionCaja.objects.filter(estado=SesionCaja.EstadoCaja.ABIERTA).first()
        if not sesion:
            return Response({
                'abierta': False,
                'mensaje': 'No hay ninguna sesión de caja abierta en este momento.'
            }, status=status.HTTP_200_OK)

        # Calcular métricas dinámicas en tiempo real de esta sesión
        ventas_sesion = Venta.objects.filter(sesion_caja=sesion, estado=Venta.EstadoVenta.COMPLETADA)
        
        ventas_efectivo = ventas_sesion.filter(metodo_pago=Venta.MetodoPago.EFECTIVO).aggregate(t=Sum('total'))['t'] or Decimal('0.00')
        ventas_tarjeta = ventas_sesion.filter(metodo_pago=Venta.MetodoPago.TARJETA).aggregate(t=Sum('total'))['t'] or Decimal('0.00')
        ventas_transferencia = ventas_sesion.filter(metodo_pago=Venta.MetodoPago.TRANSFERENCIA).aggregate(t=Sum('total'))['t'] or Decimal('0.00')
        total_ventas = ventas_efectivo + ventas_tarjeta + ventas_transferencia
        conteo_ventas = ventas_sesion.count()

        # Entradas y salidas manuales de caja (movimientos que no son la venta en sí)
        movimientos_sesion = MovimientoFinanciero.objects.filter(sesion_caja=sesion)
        entradas_manuales = movimientos_sesion.filter(tipo=MovimientoFinanciero.TipoMovimiento.INGRESO, venta__isnull=True).exclude(concepto__startswith='Fondo Inicial').aggregate(t=Sum('monto'))['t'] or Decimal('0.00')
        salidas_manuales = movimientos_sesion.filter(tipo=MovimientoFinanciero.TipoMovimiento.EGRESO).aggregate(t=Sum('monto'))['t'] or Decimal('0.00')

        # Efectivo esperado en gaveta: Fondo Inicial + Ventas Efectivo + Entradas - Salidas
        efectivo_esperado = sesion.monto_inicial + ventas_efectivo + entradas_manuales - salidas_manuales

        # Movimientos recientes para la tabla de flujo de caja
        movimientos_data = MovimientoFinancieroSerializer(movimientos_sesion.order_by('-fecha_hora')[:30], many=True).data

        return Response({
            'abierta': True,
            'sesion': SesionCajaSerializer(sesion).data,
            'metricas': {
                'monto_inicial': float(sesion.monto_inicial),
                'ventas_efectivo': float(ventas_efectivo),
                'ventas_tarjeta': float(ventas_tarjeta),
                'ventas_transferencia': float(ventas_transferencia),
                'total_ventas': float(total_ventas),
                'conteo_ventas': conteo_ventas,
                'entradas_manuales': float(entradas_manuales),
                'salidas_manuales': float(salidas_manuales),
                'efectivo_esperado': float(efectivo_esperado),
            },
            'movimientos': movimientos_data,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='abrir')
    def abrir(self, request):
        """Apertura de turno de caja con fondo inicial."""
        activa = SesionCaja.objects.filter(estado=SesionCaja.EstadoCaja.ABIERTA).first()
        if activa:
            return Response({
                'status': 'error',
                'message': f'Ya existe una sesión de caja abierta (Turno #{activa.id_sesion}) iniciada el {activa.fecha_apertura.strftime("%d/%m/%Y %H:%M")}. Debe cerrarla antes de abrir una nueva.'
            }, status=status.HTTP_400_BAD_REQUEST)

        monto_raw = request.data.get('monto_inicial', 0.00)
        try:
            monto_inicial = Decimal(str(monto_raw))
            if monto_inicial < 0:
                raise ValueError()
        except:
            return Response({'status': 'error', 'message': 'El monto inicial debe ser un número válido mayor o igual a cero.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            sesion = SesionCaja.objects.create(
                usuario_apertura=request.user,
                monto_inicial=monto_inicial,
                estado=SesionCaja.EstadoCaja.ABIERTA,
            )

            # Registrar movimiento de fondo inicial
            MovimientoFinanciero.objects.create(
                usuario=request.user,
                sesion_caja=sesion,
                tipo=MovimientoFinanciero.TipoMovimiento.INGRESO,
                monto=monto_inicial,
                concepto=f"Fondo Inicial de Caja (Apertura Turno #{sesion.id_sesion})"
            )

            registrar_auditoria(
                request=request,
                accion='APERTURA_CAJA',
                tabla_afectada='sesiones_caja',
                descripcion=f'Inició turno en Caja #{sesion.id_sesion} con fondo inicial de Q{monto_inicial:.2f}'
            )

        return Response({
            'status': 'success',
            'message': f'Caja #{sesion.id_sesion} abierta exitosamente con fondo inicial de Q{monto_inicial:.2f}.',
            'sesion': SesionCajaSerializer(sesion).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='movimiento')
    def registrar_movimiento(self, request):
        """Registrar entrada de dinero o salida (gasto menor de caja)."""
        sesion = SesionCaja.objects.filter(estado=SesionCaja.EstadoCaja.ABIERTA).first()
        if not sesion:
            return Response({'status': 'error', 'message': 'No hay ninguna sesión de caja abierta para registrar movimientos.'}, status=status.HTTP_400_BAD_REQUEST)

        tipo = request.data.get('tipo', '').upper()
        if tipo not in ['INGRESO', 'EGRESO']:
            return Response({'status': 'error', 'message': 'El tipo de movimiento debe ser INGRESO o EGRESO.'}, status=status.HTTP_400_BAD_REQUEST)

        monto_raw = request.data.get('monto', 0)
        try:
            monto = Decimal(str(monto_raw))
            if monto <= 0:
                raise ValueError()
        except:
            return Response({'status': 'error', 'message': 'El monto debe ser mayor a Q0.00.'}, status=status.HTTP_400_BAD_REQUEST)

        concepto = (request.data.get('concepto') or '').strip()
        if not concepto:
            return Response({'status': 'error', 'message': 'Debe ingresar un concepto o motivo para el movimiento.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            mov = MovimientoFinanciero.objects.create(
                usuario=request.user,
                sesion_caja=sesion,
                tipo=tipo,
                monto=monto,
                concepto=concepto
            )

            tipo_desc = "Entrada manual de efectivo" if tipo == 'INGRESO' else "Salida / Gasto menor de caja"
            registrar_auditoria(
                request=request,
                accion='MOVIMIENTO_CAJA',
                tabla_afectada='movimientos_financieros',
                descripcion=f'{tipo_desc} por Q{monto:.2f} en Caja #{sesion.id_sesion}: "{concepto}"'
            )

        return Response({
            'status': 'success',
            'message': f'{tipo_desc} registrada exitosamente.',
            'movimiento': MovimientoFinancieroSerializer(mov).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='cerrar')
    def cerrar(self, request):
        """Arqueo y cierre definitivo de turno de caja."""
        sesion = SesionCaja.objects.filter(estado=SesionCaja.EstadoCaja.ABIERTA).first()
        if not sesion:
            return Response({'status': 'error', 'message': 'No hay ninguna sesión de caja abierta para cerrar.'}, status=status.HTTP_400_BAD_REQUEST)

        monto_real_raw = request.data.get('monto_real_efectivo', None)
        if monto_real_raw is None:
            return Response({'status': 'error', 'message': 'Debe ingresar el monto de efectivo físico contado en caja.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            monto_real = Decimal(str(monto_real_raw))
            if monto_real < 0:
                raise ValueError()
        except:
            return Response({'status': 'error', 'message': 'El monto de efectivo contado no puede ser negativo.'}, status=status.HTTP_400_BAD_REQUEST)

        observaciones = (request.data.get('observaciones') or '').strip()

        with transaction.atomic():
            # Consolidar ventas
            ventas_sesion = Venta.objects.filter(sesion_caja=sesion, estado=Venta.EstadoVenta.COMPLETADA)
            ventas_efectivo = ventas_sesion.filter(metodo_pago=Venta.MetodoPago.EFECTIVO).aggregate(t=Sum('total'))['t'] or Decimal('0.00')
            ventas_tarjeta = ventas_sesion.filter(metodo_pago=Venta.MetodoPago.TARJETA).aggregate(t=Sum('total'))['t'] or Decimal('0.00')
            ventas_transferencia = ventas_sesion.filter(metodo_pago=Venta.MetodoPago.TRANSFERENCIA).aggregate(t=Sum('total'))['t'] or Decimal('0.00')

            # Consolidar movimientos
            movimientos_sesion = MovimientoFinanciero.objects.filter(sesion_caja=sesion)
            entradas_manuales = movimientos_sesion.filter(tipo=MovimientoFinanciero.TipoMovimiento.INGRESO, venta__isnull=True).exclude(concepto__startswith='Fondo Inicial').aggregate(t=Sum('monto'))['t'] or Decimal('0.00')
            salidas_manuales = movimientos_sesion.filter(tipo=MovimientoFinanciero.TipoMovimiento.EGRESO).aggregate(t=Sum('monto'))['t'] or Decimal('0.00')

            esperado = sesion.monto_inicial + ventas_efectivo + entradas_manuales - salidas_manuales
            diferencia = monto_real - esperado

            sesion.usuario_cierre = request.user
            sesion.fecha_cierre = timezone.now()
            sesion.estado = SesionCaja.EstadoCaja.CERRADA
            sesion.total_ventas_efectivo = ventas_efectivo
            sesion.total_ventas_tarjeta = ventas_tarjeta
            sesion.total_ventas_transferencia = ventas_transferencia
            sesion.total_ingresos_extra = entradas_manuales
            sesion.total_egresos_extra = salidas_manuales
            sesion.monto_esperado = esperado
            sesion.monto_real_efectivo = monto_real
            sesion.diferencia = diferencia
            sesion.observaciones = observaciones or None
            sesion.save()

            estado_cuadre = "Cuadrada exacta" if diferencia == 0 else (f"Sobrante de Q{diferencia:.2f}" if diferencia > 0 else f"Faltante de Q{abs(diferencia):.2f}")

            registrar_auditoria(
                request=request,
                accion='CIERRE_CAJA',
                tabla_afectada='sesiones_caja',
                descripcion=f'Cierre de Turno en Caja #{sesion.id_sesion}. Esperado: Q{esperado:.2f}, Contado: Q{monto_real:.2f}. Arqueo: {estado_cuadre}'
            )

        return Response({
            'status': 'success',
            'message': f'Caja #{sesion.id_sesion} cerrada exitosamente. Arqueo: {estado_cuadre}.',
            'sesion': SesionCajaSerializer(sesion).data
        }, status=status.HTTP_200_OK)
