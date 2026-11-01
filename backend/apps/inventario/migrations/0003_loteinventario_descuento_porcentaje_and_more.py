from decimal import Decimal
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0002_ajusteinventario'),
    ]

    operations = [
        migrations.AddField(
            model_name='loteinventario',
            name='descuento_porcentaje',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=5, verbose_name='Descuento del Lote (%)'),
        ),
        migrations.AddField(
            model_name='loteinventario',
            name='motivo_descuento',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Motivo del Descuento'),
        ),
    ]
