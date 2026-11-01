import sys
import os
import urllib.parse
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(BASE_DIR / 'apps'))

load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-nohemysys-fallback-secret-key')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', '*').split(',')]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    'apps.autenticacion',
    'apps.catalogos',
    'apps.compras',
    'apps.inventario',
    'apps.ventas',
    'apps.auditoria',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'nohemysys_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nohemysys_core.wsgi.application'

DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    _url = urllib.parse.urlparse(DATABASE_URL)
    _query_params = urllib.parse.parse_qs(_url.query)
    _ssl_mode = _query_params.get('sslmode', [os.getenv('DB_SSLMODE', 'require')])[0]
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': urllib.parse.unquote(_url.path.lstrip('/')),
            'USER': urllib.parse.unquote(_url.username or ''),
            'PASSWORD': urllib.parse.unquote(_url.password or ''),
            'HOST': _url.hostname or '',
            'PORT': str(_url.port or 5432),
            'CONN_MAX_AGE': int(os.getenv('CONN_MAX_AGE', '0')),
            'OPTIONS': {
                'sslmode': _ssl_mode,
            },
        }
    }
else:
    DB_NAME = os.getenv('DB_NAME', 'nohemysys_db')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
    DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
    DB_PORT = '' if DB_HOST.startswith('/') else os.getenv('DB_PORT', '5432')
    _is_local_db = DB_HOST in ('127.0.0.1', 'localhost', 'db')
    _db_sslmode = os.getenv('DB_SSLMODE', 'prefer' if _is_local_db else 'require')

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'CONN_MAX_AGE': int(os.getenv('CONN_MAX_AGE', '0')),
            'OPTIONS': {
                'sslmode': _db_sslmode,
            },
        }
    }

AUTH_USER_MODEL = 'autenticacion.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-gt'
TIME_ZONE = 'America/Guatemala'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'nohemysys_core.utils.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost(:[0-9]+)?$",
    r"^http://127\.0\.0\.1(:[0-9]+)?$",
    r"^http://192\.168\.[0-9]+\.[0-9]+(:[0-9]+)?$",
    r"^http://172\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?$",
    r"^http://10\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?$",
    r"^https://.*\.run\.app$",
    r"^https://.*\.vercel\.app$",
    r"^https://.*\.onrender\.com$",
]

CORS_EXTRA = os.getenv('CORS_ALLOWED_ORIGINS', '')
if CORS_EXTRA:
    CORS_ALLOWED_ORIGINS = [orig.strip() for orig in CORS_EXTRA.split(',') if orig.strip()]

CSRF_TRUSTED_ORIGINS = [
    orig.strip() for orig in os.getenv(
        'CSRF_TRUSTED_ORIGINS',
        'https://*.run.app,https://*.vercel.app,https://*.onrender.com,http://localhost:3000,http://127.0.0.1:3000'
    ).split(',') if orig.strip()
]
