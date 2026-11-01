from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from datetime import date, timedelta
from decimal import Decimal
from apps.catalogos.models import Categoria, UnidadMedida, Producto
from apps.inventario.models import LoteInventario
from apps.ventas.models import Cliente, SesionCaja, Venta
from apps.ventas.serializers import VentaCreateSerializer

User = get_user_model()

class VentasTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='cajera_nohemy',
            password='Password123!',
            rol=User.Role.VENDEDOR
        )
        self.categoria = Categoria.objects.create(nombre='Abarrotes Generales')
        self.unidad = UnidadMedida.objects.create(nombre='Unidad', simbolo='und')
        self.producto = Producto.objects.create(
            codigo_barras='7401005888888',
            nombre='Aceite Vegetal 800ml',
            categoria=self.categoria,
            unidad_medida=self.unidad,
            precio_venta=Decimal('15.00'),
            stock_total=30
        )

        # Lote A (Próximo a expirar): 10 unidades, vence en 4 días
        self.lote_a = LoteInventario.objects.create(
            producto=self.producto,
            numero_lote='LOTE-OIL-01',
            fecha_vencimiento=date.today() + timedelta(days=4),
            cantidad_inicial=10,
            cantidad_actual=10,
            costo_unitario=Decimal('11.00')
        )

        # Lote B (Caducidad lejana): 20 unidades, vence en 45 días
        self.lote_b = LoteInventario.objects.create(
            producto=self.producto,
            numero_lote='LOTE-OIL-02',
            fecha_vencimiento=date.today() + timedelta(days=45),
            cantidad_inicial=20,
            cantidad_actual=20,
            costo_unitario=Decimal('11.00')
        )

    def test_apertura_y_cierre_sesion_caja(self):
        """Verifica la apertura de turno de caja y el posterior cierre."""
        sesion = SesionCaja.objects.create(
            usuario_apertura=self.user,
            monto_inicial=Decimal('200.00'),
            estado=SesionCaja.EstadoCaja.ABIERTA
        )
        self.assertEqual(sesion.estado, SesionCaja.EstadoCaja.ABIERTA)
        self.assertEqual(sesion.monto_inicial, Decimal('200.00'))

        # Cierre de caja
        sesion.estado = SesionCaja.EstadoCaja.CERRADA
        sesion.usuario_cierre = self.user
        sesion.save()
        self.assertEqual(sesion.estado, SesionCaja.EstadoCaja.CERRADA)

    def test_venta_bloqueada_sin_caja_abierta(self):
        """Impide procesar cualquier venta si no hay un turno de caja activo."""
        SesionCaja.objects.filter(estado=SesionCaja.EstadoCaja.ABIERTA).delete()
        data = {
            'items': [{'producto_id': self.producto.id_producto, 'cantidad': 1}],
            'metodo_pago': 'EFECTIVO',
            'monto_recibido': Decimal('20.00')
        }
        serializer = VentaCreateSerializer(data=data)
        with self.assertRaises(ValidationError) as ctx:
            serializer.is_valid(raise_exception=True)
        self.assertIn("no hay ningún turno de caja abierto", str(ctx.exception))

    def test_deduccion_estricta_peps_fifo(self):
        """CP-06: Venta de 12 unidades agota lote cercano (10) y descuenta 2 del lote lejano."""
        # Abrir caja para permitir facturación
        SesionCaja.objects.create(
            usuario_apertura=self.user,
            monto_inicial=Decimal('100.00'),
            estado=SesionCaja.EstadoCaja.ABIERTA
        )

        data = {
            'items': [{'producto_id': self.producto.id_producto, 'cantidad': 12}],
            'metodo_pago': 'EFECTIVO',
            'monto_recibido': Decimal('200.00')
        }
        serializer = VentaCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        venta = serializer.save()

        # Validaciones de la venta
        self.assertEqual(venta.total, Decimal('180.00')) # 12 * 15.00
        self.assertEqual(venta.cambio_entregado, Decimal('20.00')) # 200 - 180

        # Verificación estricta PEPS/FIFO en la base de datos
        self.lote_a.refresh_from_db()
        self.lote_b.refresh_from_db()

        self.assertEqual(self.lote_a.cantidad_actual, 0, "El lote A (vencimiento próximo) debió agotarse completamente.")
        self.assertEqual(self.lote_b.cantidad_actual, 18, "El lote B debió cubrir las 2 unidades restantes (20 - 2 = 18).")

    def test_bloqueo_por_stock_insuficiente(self):
        """CP-07: Intento de vender más unidades que el stock total en lotes lanza error."""
        SesionCaja.objects.create(
            usuario_apertura=self.user,
            monto_inicial=Decimal('100.00'),
            estado=SesionCaja.EstadoCaja.ABIERTA
        )

        # Stock disponible en ambos lotes: 10 + 20 = 30 unidades. Se solicitan 35.
        data = {
            'items': [{'producto_id': self.producto.id_producto, 'cantidad': 35}],
            'metodo_pago': 'EFECTIVO',
            'monto_recibido': Decimal('600.00')
        }
        serializer = VentaCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        with self.assertRaises(ValidationError) as ctx:
            serializer.save()
        self.assertIn("Stock insuficiente", str(ctx.exception))

    def test_calculo_cambio_monetario_pos(self):
        """CP-05: Valida cálculo exacto de vuelto al registrar pago en efectivo."""
        SesionCaja.objects.create(
            usuario_apertura=self.user,
            monto_inicial=Decimal('100.00'),
            estado=SesionCaja.EstadoCaja.ABIERTA
        )

        # 3 unidades a 15.00 = 45.00. Pago con 100.00. Cambio esperado: 55.00
        data = {
            'items': [{'producto_id': self.producto.id_producto, 'cantidad': 3}],
            'metodo_pago': 'EFECTIVO',
            'monto_recibido': Decimal('100.00')
        }
        serializer = VentaCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        venta = serializer.save()

        self.assertEqual(venta.total, Decimal('45.00'))
        self.assertEqual(venta.monto_recibido, Decimal('100.00'))
        self.assertEqual(venta.cambio_entregado, Decimal('55.00'))
