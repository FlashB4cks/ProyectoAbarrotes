from django.test import TestCase
from django.db.utils import IntegrityError
from apps.catalogos.models import Categoria, UnidadMedida, Marca, Producto

class CatalogosTestCase(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre='Bebidas y Refrescos',
            descripcion='Bebidas gaseosas, jugos y aguas purificadas'
        )
        self.unidad = UnidadMedida.objects.create(
            nombre='Unidad',
            simbolo='und'
        )
        self.marca = Marca.objects.create(
            nombre='Coca-Cola'
        )
        self.producto = Producto.objects.create(
            codigo_barras='7401005101234',
            nombre='Coca-Cola Desechable 500ml',
            categoria=self.categoria,
            unidad_medida=self.unidad,
            marca=self.marca,
            precio_venta=8.00,
            stock_minimo=12
        )

    def test_creacion_producto_y_codigo_barras(self):
        """CP-04: Verifica el registro exitoso del producto con su código de barras único."""
        self.assertEqual(self.producto.codigo_barras, '7401005101234')
        self.assertEqual(self.producto.nombre, 'Coca-Cola Desechable 500ml')
        self.assertEqual(float(self.producto.precio_venta), 8.00)
        self.assertTrue(self.producto.is_active)

    def test_codigo_barras_duplicado_rechazado(self):
        """Impide registrar dos productos distintos con el mismo código de barras EAN-13."""
        with self.assertRaises(IntegrityError):
            Producto.objects.create(
                codigo_barras='7401005101234',
                nombre='Coca-Cola Copia',
                categoria=self.categoria,
                precio_venta=9.00
            )

    def test_busqueda_producto_por_codigo_barras(self):
        """Escenario POS: Localización inmediata por lectura óptica de código de barras."""
        prod = Producto.objects.get(codigo_barras='7401005101234')
        self.assertEqual(prod.id_producto, self.producto.id_producto)
        self.assertEqual(prod.categoria.nombre, 'Bebidas y Refrescos')

    def test_borrado_logico_producto(self):
        """Verifica que el borrado lógico preserva la integridad referencial sin eliminar el registro."""
        self.producto.is_active = False
        self.producto.save()
        prod_db = Producto.objects.get(id_producto=self.producto.id_producto)
        self.assertFalse(prod_db.is_active)
