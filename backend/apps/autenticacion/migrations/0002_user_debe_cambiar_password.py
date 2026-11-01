
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('autenticacion', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='debe_cambiar_password',
            field=models.BooleanField(default=True, verbose_name='Debe Cambiar Contraseña'),
        ),
    ]
