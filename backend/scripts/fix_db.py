import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nohemysys_core.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dpi VARCHAR(13);")
    cursor.execute("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nit VARCHAR(20);")
    cursor.execute("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);")
    cursor.execute("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);")
    
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='usuarios';")
    cols = cursor.fetchall()
    print("UPDATED COLUMNS IN usuarios TABLE:")
    for c in cols:
        print(" -", c[0], ":", c[1])
