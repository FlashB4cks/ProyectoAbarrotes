from django.db import models

class Departamento(models.Model):
    id_departamento = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Departamento")

    class Meta:
        db_table = 'departamentos'
        verbose_name = 'Departamento'
        verbose_name_plural = 'Departamentos'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Municipio(models.Model):
    id_municipio = models.BigAutoField(primary_key=True)
    departamento = models.ForeignKey(Departamento, on_delete=models.CASCADE, related_name='municipios', verbose_name="Departamento")
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Municipio")

    class Meta:
        db_table = 'municipios'
        verbose_name = 'Municipio'
        verbose_name_plural = 'Municipios'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre}, {self.departamento.nombre}"


class Direccion(models.Model):
    id_direccion = models.BigAutoField(primary_key=True)
    municipio = models.ForeignKey(Municipio, on_delete=models.PROTECT, related_name='direcciones', verbose_name="Municipio")
    linea1 = models.CharField(max_length=200, verbose_name="Dirección Línea 1")
    referencia = models.CharField(max_length=200, null=True, blank=True, verbose_name="Referencia / Zona")

    class Meta:
        db_table = 'direcciones'
        verbose_name = 'Dirección'
        verbose_name_plural = 'Direcciones'

    def __str__(self):
        return f"{self.linea1} ({self.municipio.nombre})"


class Categoria(models.Model):
    id_categoria = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre de Categoría")
    descripcion = models.TextField(null=True, blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        db_table = 'categorias'
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class UnidadMedida(models.Model):
    id_unidad = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=50, unique=True, verbose_name="Nombre de Unidad")
    simbolo = models.CharField(max_length=10, verbose_name="Símbolo")
    is_active = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        db_table = 'unidades_medida'
        verbose_name = 'Unidad de Medida'
        verbose_name_plural = 'Unidades de Medida'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.simbolo})"


class Proveedor(models.Model):
    id_proveedor = models.BigAutoField(primary_key=True)
    nombre_empresa = models.CharField(max_length=150, verbose_name="Nombre de Empresa")
    contacto = models.CharField(max_length=100, null=True, blank=True, verbose_name="Persona de Contacto")
    telefono = models.CharField(max_length=20, null=True, blank=True, verbose_name="Teléfono")
    email = models.EmailField(null=True, blank=True, verbose_name="Correo Electrónico")
    nit = models.CharField(max_length=20, null=True, blank=True, verbose_name="NIT")
    direccion_rel = models.ForeignKey(Direccion, on_delete=models.SET_NULL, null=True, blank=True, related_name='proveedores', verbose_name="Dirección Geográfica")
    direccion = models.CharField(max_length=255, null=True, blank=True, verbose_name="Dirección Texto")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")

    class Meta:
        db_table = 'proveedores'
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['nombre_empresa']

    def __str__(self):
        return self.nombre_empresa


class Marca(models.Model):
    id_marca = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre de la Marca")
    descripcion = models.TextField(null=True, blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")

    class Meta:
        db_table = 'marcas'
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    id_producto = models.BigAutoField(primary_key=True)
    codigo_barras = models.CharField(max_length=50, unique=True, verbose_name="Código de Barras")
    nombre = models.CharField(max_length=150, verbose_name="Nombre del Producto")
    descripcion = models.TextField(null=True, blank=True, verbose_name="Descripción")
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='productos', verbose_name="Categoría")
    marca = models.ForeignKey(Marca, on_delete=models.SET_NULL, null=True, blank=True, related_name='productos', verbose_name="Marca")
    unidad_medida = models.ForeignKey(UnidadMedida, on_delete=models.SET_NULL, null=True, blank=True, related_name='productos', verbose_name="Unidad de Medida")
    proveedor = models.ForeignKey(Proveedor, on_delete=models.SET_NULL, null=True, blank=True, related_name='productos', verbose_name="Proveedor Principal")
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio de Venta (GTQ)")
    stock_total = models.IntegerField(default=0, verbose_name="Stock Total Acumulado")
    stock_minimo = models.IntegerField(default=10, verbose_name="Stock Mínimo Alerta")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")

    class Meta:
        db_table = 'productos'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} (@{self.codigo_barras})"
