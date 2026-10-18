from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal

from .models import Venta, DetalleVenta, SalidaLoteVenta, MovimientoFinanciero
from apps.inventario.models import LoteInventario, AjusteInventario
from apps.catalogos.models import Categoria, Producto
from apps.autenticacion.permissions import IsAdminUserRole


def parse_date_range(request):
    """
    Parsea parámetros de período o rango de fechas:
    periodo: 'hoy', 'semana', 'mes', 'anio', 'todo', 'personalizado'
    fecha_inicio, fecha_fin: 'YYYY-MM-DD'
    """
    hoy = timezone.localdate()
    params = getattr(request, 'query_params', request.GET)
    periodo = params.get('periodo', 'mes').lower()
    fecha_inicio_str = params.get('fecha_inicio', None)
    fecha_fin_str = params.get('fecha_fin', None)

    if periodo == 'hoy':
        inicio = hoy
        fin = hoy
    elif periodo == 'semana':
        inicio = hoy - timedelta(days=6)
        fin = hoy
    elif periodo == 'mes':
        inicio = hoy.replace(day=1)
        fin = hoy
    elif periodo == 'anio':
        inicio = hoy.replace(month=1, day=1)
        fin = hoy
    elif periodo == 'personalizado' and fecha_inicio_str and fecha_fin_str:
        try:
            inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
        except ValueError:
            inicio = hoy - timedelta(days=30)
            fin = hoy
    else: # 'todo' o por defecto
        primera_venta = Venta.objects.order_by('fecha_hora').first()
        inicio = primera_venta.fecha_hora.date() if primera_venta else hoy - timedelta(days=30)
        fin = hoy

    return inicio, fin, periodo


class ReporteFinancieroViewSet(viewsets.ViewSet):
    """
    Consolida informes financieros, margen de utilidad y ventas (RF-07.2).
    """
    permission_classes = [IsAdminUserRole]

    def list(self, request):
        inicio, fin, periodo = parse_date_range(request)

        # Filtro base de ventas completadas en el rango
        ventas_qs = Venta.objects.filter(
            fecha_hora__date__gte=inicio,
            fecha_hora__date__lte=fin,
            estado=Venta.EstadoVenta.COMPLETADA
        )

        total_ventas = ventas_qs.aggregate(t=Sum('total'))['t'] or Decimal('0.00')
        total_subtotal = ventas_qs.aggregate(s=Sum('subtotal'))['s'] or Decimal('0.00')
        total_descuentos = ventas_qs.aggregate(d=Sum('descuento'))['d'] or Decimal('0.00')
        total_transacciones = ventas_qs.count()

        ticket_promedio = (total_ventas / total_transacciones) if total_transacciones > 0 else Decimal('0.00')

        # Costo de Ventas (COGS) calculado a partir de las salidas FIFO de lotes
        salidas_qs = SalidaLoteVenta.objects.filter(
            detalle_venta__venta__in=ventas_qs
        ).select_related('lote', 'detalle_venta__venta')

        total_costo = sum(
            (s.cantidad_descontada * s.lote.costo_unitario for s in salidas_qs),
            Decimal('0.00')
        )

        utilidad_bruta = total_ventas - total_costo
        margen_porcentaje = float((utilidad_bruta / total_ventas) * 100) if total_ventas > Decimal('0.00') else 0.0

        # Desglose por Método de Pago
        pagos_raw = ventas_qs.values('metodo_pago').annotate(
            total=Sum('total'),
            cantidad=Count('id_venta')
        )
        desglose_pagos = []
        for p in pagos_raw:
            tot_p = p['total'] or Decimal('0.00')
            pct = float((tot_p / total_ventas) * 100) if total_ventas > Decimal('0.00') else 0.0
            desglose_pagos.append({
                'metodo': p['metodo_pago'],
                'total': float(tot_p),
                'conteo': p['cantidad'],
                'porcentaje': round(pct, 1)
            })

        # Ventas por Categoría
        detalles_qs = DetalleVenta.objects.filter(venta__in=ventas_qs).select_related('producto__categoria')
        categorias_dict = {}
        for d in detalles_qs:
            cat_nom = d.producto.categoria.nombre if d.producto.categoria else 'Sin Categoría'
            if cat_nom not in categorias_dict:
                categorias_dict[cat_nom] = {'total': Decimal('0.00'), 'unidades': 0}
            categorias_dict[cat_nom]['total'] += d.subtotal
            categorias_dict[cat_nom]['unidades'] += d.cantidad

        ventas_por_categoria = []
        for cat_nom, vals in categorias_dict.items():
            pct = float((vals['total'] / total_ventas) * 100) if total_ventas > Decimal('0.00') else 0.0
            ventas_por_categoria.append({
                'categoria': cat_nom,
                'total': float(vals['total']),
                'unidades': vals['unidades'],
                'porcentaje': round(pct, 1)
            })
        ventas_por_categoria.sort(key=lambda x: x['total'], reverse=True)

        # Top 10 Productos Más Vendidos
        top_prods_raw = detalles_qs.values(
            'producto__id_producto',
            'producto__nombre',
            'producto__codigo_barras',
            'producto__categoria__nombre'
        ).annotate(
            unidades=Sum('cantidad'),
            ingresos=Sum('subtotal')
        ).order_by('-ingresos')[:10]

        top_productos = []
        for p in top_prods_raw:
            prod_id = p['producto__id_producto']
            salidas_prod = [s for s in salidas_qs if s.detalle_venta.producto_id == prod_id]
            costo_p = sum((s.cantidad_descontada * s.lote.costo_unitario for s in salidas_prod), Decimal('0.00'))
            ingreso_p = p['ingresos'] or Decimal('0.00')
            ganancia_p = ingreso_p - costo_p
            top_productos.append({
                'id_producto': prod_id,
                'nombre': p['producto__nombre'],
                'codigo_barras': p['producto__codigo_barras'],
                'categoria': p['producto__categoria__nombre'] or 'Sin Categoría',
                'unidades_vendidas': p['unidades'],
                'ingresos': float(ingreso_p),
                'costo': float(costo_p),
                'ganancia': float(ganancia_p),
            })

        # Flujo Temporal Adaptativo para Gráficas de Inteligencia de Negocios (RF-07.2)
        flujo_temporal = []
        dias_es = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
        meses_es = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

        if periodo == 'hoy':
            # Vista Intradiaria por Horas Comerciales (07:00 a 21:00)
            for h in range(7, 22):
                hora_str = f"{h:02d}:00"
                ventas_h = [v for v in ventas_qs if timezone.localtime(v.fecha_hora).hour == h]
                total_h = sum((v.total for v in ventas_h), Decimal('0.00'))
                salidas_h = [s for s in salidas_qs if timezone.localtime(s.detalle_venta.venta.fecha_hora).hour == h]
                costo_h = sum((s.cantidad_descontada * s.lote.costo_unitario for s in salidas_h), Decimal('0.00'))
                flujo_temporal.append({
                    'fecha': f"{inicio} {hora_str}",
                    'dia_label': hora_str,
                    'ventas': float(total_h),
                    'costo': float(costo_h),
                    'utilidad': float(total_h - costo_h),
                    'transacciones': len(ventas_h)
                })

        elif periodo == 'anio':
            # Vista Anual: Agrupación por Mes (Ene a Dic)
            anio_actual = inicio.year
            for m in range(1, 13):
                ventas_m = [v for v in ventas_qs if v.fecha_hora.year == anio_actual and v.fecha_hora.month == m]
                total_m = sum((v.total for v in ventas_m), Decimal('0.00'))
                salidas_m = [s for s in salidas_qs if s.detalle_venta.venta.fecha_hora.year == anio_actual and s.detalle_venta.venta.fecha_hora.month == m]
                costo_m = sum((s.cantidad_descontada * s.lote.costo_unitario for s in salidas_m), Decimal('0.00'))
                flujo_temporal.append({
                    'fecha': f"{anio_actual}-{m:02d}",
                    'dia_label': meses_es[m - 1],
                    'ventas': float(total_m),
                    'costo': float(costo_m),
                    'utilidad': float(total_m - costo_m),
                    'transacciones': len(ventas_m)
                })

        elif periodo == 'todo':
            # Vista Histórica Completa: Agrupación por Mes/Año
            curr = inicio.replace(day=1)
            fin_mes = fin.replace(day=1)
            while curr <= fin_mes:
                y = curr.year
                m = curr.month
                ventas_m = [v for v in ventas_qs if v.fecha_hora.year == y and v.fecha_hora.month == m]
                total_m = sum((v.total for v in ventas_m), Decimal('0.00'))
                salidas_m = [s for s in salidas_qs if s.detalle_venta.venta.fecha_hora.year == y and s.detalle_venta.venta.fecha_hora.month == m]
                costo_m = sum((s.cantidad_descontada * s.lote.costo_unitario for s in salidas_m), Decimal('0.00'))
                flujo_temporal.append({
                    'fecha': f"{y}-{m:02d}",
                    'dia_label': f"{meses_es[m - 1]} '{str(y)[2:]}",
                    'ventas': float(total_m),
                    'costo': float(costo_m),
                    'utilidad': float(total_m - costo_m),
                    'transacciones': len(ventas_m)
                })
                if m == 12:
                    curr = curr.replace(year=y + 1, month=1)
                else:
                    curr = curr.replace(month=m + 1)

        else:
            # Vista Diaria: 'semana', 'mes', 'personalizado'
            curr = inicio
            while curr <= fin:
                ventas_dia = [v for v in ventas_qs if v.fecha_hora.date() == curr]
                total_dia = sum((v.total for v in ventas_dia), Decimal('0.00'))
                salidas_dia = [s for s in salidas_qs if s.detalle_venta.venta.fecha_hora.date() == curr]
                costo_dia = sum((s.cantidad_descontada * s.lote.costo_unitario for s in salidas_dia), Decimal('0.00'))
                label = f"{dias_es[curr.weekday()]} {curr.day}" if periodo == 'semana' else f"{dias_es[curr.weekday()][:1]} {curr.day}"
                flujo_temporal.append({
                    'fecha': str(curr),
                    'dia_label': label,
                    'ventas': float(total_dia),
                    'costo': float(costo_dia),
                    'utilidad': float(total_dia - costo_dia),
                    'transacciones': len(ventas_dia)
                })
                curr += timedelta(days=1)

        # Mermas Registradas en el período
        mermas_qs = AjusteInventario.objects.filter(
            fecha_ajuste__date__gte=inicio,
            fecha_ajuste__date__lte=fin
        )
        total_mermas_costo = mermas_qs.aggregate(p=Sum('perdida_total'))['p'] or Decimal('0.00')
        conteo_mermas = mermas_qs.count()

        return Response({
            'periodo': {
                'tipo': periodo,
                'fecha_inicio': str(inicio),
                'fecha_fin': str(fin),
            },
            'kpis': {
                'total_ventas': float(total_ventas),
                'total_subtotal': float(total_subtotal),
                'total_descuentos': float(total_descuentos),
                'total_transacciones': total_transacciones,
                'ticket_promedio': float(round(ticket_promedio, 2)),
                'costo_total': float(total_costo),
                'utilidad_bruta': float(utilidad_bruta),
                'margen_porcentaje': round(margen_porcentaje, 2),
                'total_mermas_costo': float(total_mermas_costo),
                'conteo_mermas': conteo_mermas,
            },
            'desglose_pagos': desglose_pagos,
            'ventas_por_categoria': ventas_por_categoria,
            'top_productos': top_productos,
            'flujo_temporal': flujo_temporal,
        }, status=status.HTTP_200_OK)


class ReporteMermasFIFOViewSet(viewsets.ViewSet):
    """
    Informe de Auditoría y Mermas Evitadas mediante el algoritmo PEPS/FIFO (RF-07.2).
    """
    permission_classes = [IsAdminUserRole]

    def list(self, request):
        hoy = timezone.localdate()

        # Todas las salidas de lote efectuadas en ventas completadas
        salidas_fifo = SalidaLoteVenta.objects.filter(
            detalle_venta__venta__estado=Venta.EstadoVenta.COMPLETADA
        ).select_related('lote', 'lote__producto', 'detalle_venta')

        unidades_salvadas = sum(s.cantidad_descontada for s in salidas_fifo)
        valor_costo_salvado = sum(
            (s.cantidad_descontada * s.lote.costo_unitario for s in salidas_fifo),
            Decimal('0.00')
        )
        valor_venta_salvado = sum(
            (s.cantidad_descontada * s.detalle_venta.precio_unitario for s in salidas_fifo),
            Decimal('0.00')
        )

        # Lotes que se agotaron o rotaron antes de expirar
        lotes_rotados_exitosamente = LoteInventario.objects.filter(
            fecha_vencimiento__gte=hoy,
            cantidad_actual__lt=F('cantidad_inicial')
        ).count()

        # Mermas Reales Registradas (pérdidas efectivas)
        mermas_qs = AjusteInventario.objects.all()
        mermas_vencimiento = mermas_qs.filter(tipo=AjusteInventario.TipoAjuste.VENCIMIENTO)
        mermas_dano = mermas_qs.filter(tipo=AjusteInventario.TipoAjuste.ROTURA)
        mermas_conteo = mermas_qs.filter(tipo=AjusteInventario.TipoAjuste.AJUSTE_FISICO)

        perdida_vencimiento = mermas_vencimiento.aggregate(p=Sum('perdida_total'))['p'] or Decimal('0.00')
        perdida_dano = mermas_dano.aggregate(p=Sum('perdida_total'))['p'] or Decimal('0.00')
        perdida_conteo = mermas_conteo.aggregate(p=Sum('perdida_total'))['p'] or Decimal('0.00')
        perdida_total_real = perdida_vencimiento + perdida_dano + perdida_conteo

        unidades_mermadas = mermas_qs.aggregate(u=Sum('cantidad'))['u'] or 0

        # Tasa de Eficiencia de Preservación FIFO
        # Eficiencia = (Valor Salvado por FIFO / (Valor Salvado + Pérdidas Reales)) * 100
        denominador = valor_costo_salvado + perdida_total_real
        tasa_eficiencia = float((valor_costo_salvado / denominador) * 100) if denominador > Decimal('0.00') else 100.0

        # Estado del inventario actual en almacén (Semáforo Global)
        lotes_activos = LoteInventario.objects.filter(is_active=True, cantidad_actual__gt=0)
        limite_proximo = hoy + timedelta(days=30)

        vencidos_count = lotes_activos.filter(fecha_vencimiento__lt=hoy).count()
        vencidos_unidades = lotes_activos.filter(fecha_vencimiento__lt=hoy).aggregate(u=Sum('cantidad_actual'))['u'] or 0

        proximos_count = lotes_activos.filter(fecha_vencimiento__gte=hoy, fecha_vencimiento__lte=limite_proximo).count()
        proximos_unidades = lotes_activos.filter(fecha_vencimiento__gte=hoy, fecha_vencimiento__lte=limite_proximo).aggregate(u=Sum('cantidad_actual'))['u'] or 0

        vigentes_count = lotes_activos.filter(fecha_vencimiento__gt=limite_proximo).count()
        vigentes_unidades = lotes_activos.filter(fecha_vencimiento__gt=limite_proximo).aggregate(u=Sum('cantidad_actual'))['u'] or 0

        # Detalle de lotes que fueron rotados mediante FIFO con sus fechas
        historial_salidas_fifo = []
        for s in salidas_fifo.order_by('-fecha_descuento')[:15]:
            historial_salidas_fifo.append({
                'id_salida': s.id_salida,
                'producto_nombre': s.lote.producto.nombre,
                'lote_numero': s.lote.numero_lote,
                'fecha_vencimiento': str(s.lote.fecha_vencimiento),
                'fecha_salida': s.fecha_descuento.strftime('%Y-%m-%d %H:%M'),
                'cantidad_descontada': s.cantidad_descontada,
                'costo_unitario': float(s.lote.costo_unitario),
                'valor_preservado': float(s.cantidad_descontada * s.lote.costo_unitario),
                'factura_codigo': s.detalle_venta.venta.codigo_factura,
            })

        return Response({
            'kpis_fifo': {
                'unidades_salvadas_fifo': unidades_salvadas,
                'valor_costo_salvado': float(valor_costo_salvado),
                'valor_venta_salvado': float(valor_venta_salvado),
                'lotes_rotados_exitosamente': lotes_rotados_exitosamente,
                'perdida_total_real': float(perdida_total_real),
                'perdida_vencimiento': float(perdida_vencimiento),
                'perdida_dano': float(perdida_dano),
                'perdida_conteo': float(perdida_conteo),
                'unidades_mermadas': unidades_mermadas,
                'tasa_eficiencia_fifo': round(tasa_eficiencia, 1),
            },
            'semaforo_actual': {
                'vencidos': {'lotes': vencidos_count, 'unidades': vencidos_unidades},
                'proximos': {'lotes': proximos_count, 'unidades': proximos_unidades},
                'vigentes': {'lotes': vigentes_count, 'unidades': vigentes_unidades},
            },
            'historial_salidas_fifo': historial_salidas_fifo,
        }, status=status.HTTP_200_OK)
