from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal
from apps.catalogos.models import Categoria, UnidadMedida, Producto
from apps.inventario.models import LoteInventario, AjusteInventario

User = get_user_model()

class InventarioTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='almacenero_test',
            password='Password123!',
            rol=User.Role.ALMACENERO
        )
        self.categoria = Categoria.objects.create(nombre='Lácteos y Derivados')
        self.unidad = UnidadMedida.objects.create(nombre='Litro', simbolo='L')
        self.producto = Producto.objects.create(
            codigo_barras='7401005202020',
            nombre='Leche Pasteurizada 1L',
            categoria=self.categoria,
            unidad_medida=self.unidad,
            precio_venta=Decimal('16.00')
        )

        # Lote 1: Vence en 5 días (debe salir primero en PEPS/FIFO)
        self.lote_cercano = LoteInventario.objects.create(
            producto=self.producto,
            numero_lote='LOT-2026-001',
            fecha_vencimiento=date.today() + timedelta(days=5),
            cantidad_inicial=20,
            cantidad_actual=20,
            costo_unitario=Decimal('12.00')
        )

        # Lote 2: Vence en 30 días
        self.lote_lejano = LoteInventario.objects.create(
            producto=self.producto,
            numero_lote='LOT-2026-002',
            fecha_vencimiento=date.today() + timedelta(days=30),
            cantidad_inicial=50,
            cantidad_actual=50,
            costo_unitario=Decimal('12.00')
        )

    def test_ordenamiento_estricto_fifo_por_caducidad(self):
        """Verifica que el modelo de lotes se ordene por fecha de vencimiento ascendente."""
        lotes = list(LoteInventario.objects.filter(producto=self.producto, cantidad_actual__gt=0))
        self.assertEqual(len(lotes), 2)
        self.assertEqual(lotes[0].numero_lote, 'LOT-2026-001')
        self.assertEqual(lotes[1].numero_lote, 'LOT-2026-002')
        self.assertTrue(lotes[0].fecha_vencimiento < lotes[1].fecha_vencimiento)

    def test_descuento_preventivo_por_proximidad_de_caducidad(self):
        """Aplica un porcentaje de descuento a un lote próximo a caducar y valida el precio con descuento."""
        self.lote_cercano.descuento_porcentaje = Decimal('20.00')
        self.lote_cercano.motivo_descuento = 'Próximo a vencer en 5 días'
        self.lote_cercano.save()

        # Precio regular: 16.00. Con 20% de descuento: 16.00 * 0.8 = 12.80
        self.assertEqual(self.lote_cercano.precio_venta_descuento, Decimal('12.80'))

    def test_ajuste_merma_por_vencimiento(self):
        """Registra un ajuste por producto caducado y descuenta stock del lote correspondiente."""
        ajuste = AjusteInventario.objects.create(
            lote=self.lote_cercano,
            tipo=AjusteInventario.TipoAjuste.VENCIMIENTO,
            cantidad=3,
            costo_unitario=self.lote_cercano.costo_unitario,
            perdida_total=Decimal('3') * self.lote_cercano.costo_unitario,
            motivo='Caducado en anaquel por falta de rotación oportuna',
            usuario=self.user
        )
        self.lote_cercano.cantidad_actual -= ajuste.cantidad
        self.lote_cercano.save()

        self.assertEqual(ajuste.perdida_total, Decimal('36.00'))
        self.lote_cercano.refresh_from_db()
        self.assertEqual(self.lote_cercano.cantidad_actual, 17)
