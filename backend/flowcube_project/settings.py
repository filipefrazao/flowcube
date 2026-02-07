'''
Django settings for FlowCube

Note: Keep secrets out of this file. Use environment variables.
'''

import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def _env(name: str, default: str | None = None, *, required: bool = False) -> str:
    value = os.environ.get(name, default)
    if required and (value is None or value == ''):
        raise ImproperlyConfigured(f'Missing required environment variable: {name}')
    return value or ''


DEBUG = _env('DEBUG', _env('DJANGO_DEBUG', 'False')).lower() == 'true'

# Security
_secret_key = _env('DJANGO_SECRET_KEY', os.environ.get('SECRET_KEY', ''))
if not _secret_key and DEBUG:
    _secret_key = 'dev-secret-key-change-in-production'
if not _secret_key and not DEBUG:
    raise ImproperlyConfigured('Missing required environment variable: DJANGO_SECRET_KEY or SECRET_KEY')
SECRET_KEY = _secret_key

_cred_key = _env("CREDENTIAL_ENCRYPTION_KEY", "")
if _cred_key:
    CREDENTIAL_ENCRYPTION_KEY = _cred_key
elif not DEBUG:
    raise ImproperlyConfigured("Missing required environment variable: CREDENTIAL_ENCRYPTION_KEY")


_allowed_hosts_raw = _env('ALLOWED_HOSTS', 'flowcube.frzgroup.com.br,localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_raw.split(',') if h.strip()]


INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',
    'django_ratelimit',
    'django_celery_beat',
    # Plugin framework (must load before plugins)
    'flowcube_core',
    'funnelcube',
    # Core apps (not yet extracted as plugins)
    'flowcube',
    'workflows',
    # Apps (future plugins - will migrate to FlowCubePluginConfig)
    'telegram_integration',
    'billing',
    'ai',
    'achievements',
    'chatcube',
]


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'csp.middleware.CSPMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'flowcube_project.middleware.RealIPMiddleware',
    'flowcube_project.middleware.LoginRateLimitMiddleware',
    'flowcube_project.middleware.RatelimitExceptionMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'flowcube_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    }
]

WSGI_APPLICATION = 'flowcube_project.wsgi.application'
ASGI_APPLICATION = 'flowcube_project.asgi.application'

# Database
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=60),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': _env('POSTGRES_DB', 'flowcube'),
            'USER': _env('POSTGRES_USER', 'flowcube'),
            'PASSWORD': _env('POSTGRES_PASSWORD', ''),
            'HOST': _env('POSTGRES_HOST', 'localhost'),
            'PORT': _env('POSTGRES_PORT', '5432'),
        }
    }

# Redis
REDIS_HOST = _env('REDIS_HOST', 'localhost')
REDIS_PASSWORD = _env('REDIS_PASSWORD', '')

# Channels
_redis_auth = f':{REDIS_PASSWORD}@' if REDIS_PASSWORD else ''
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [f'redis://{_redis_auth}{REDIS_HOST}:6379/0'],
        },
    },
}

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:6379/2' if REDIS_PASSWORD else f'redis://{REDIS_HOST}:6379/2',
    }
}

RATELIMIT_USE_CACHE = 'default'


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (admin, etc)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://flowcube.frzgroup.com.br',
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '5/minute',
    },
}

# Celery
CELERY_BROKER_URL = _env('CELERY_BROKER_URL', f'redis://{_redis_auth}{REDIS_HOST}:6379/0')
CELERY_RESULT_BACKEND = _env('CELERY_RESULT_BACKEND', f'redis://{_redis_auth}{REDIS_HOST}:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# External services (no secrets in defaults)
EVOLUTION_API_URL = _env('EVOLUTION_API_URL', 'https://evolution.frzgroup.com.br')
EVOLUTION_API_KEY = _env('EVOLUTION_API_KEY', '')

SALESCUBE_API_URL = _env('SALESCUBE_API_URL', 'https://api.frzglobal.com.br')
SALESCUBE_API_TOKEN = _env('SALESCUBE_API_TOKEN', '')

N8N_WEBHOOK_URL = _env('N8N_WEBHOOK_URL', 'https://n8n.frzgroup.com.br/webhook')

# AI providers
OPENAI_API_KEY = _env('OPENAI_API_KEY', '')
ANTHROPIC_API_KEY = _env('ANTHROPIC_API_KEY', '')

FLOWCUBE_WEBHOOK_BASE_URL = _env('FLOWCUBE_WEBHOOK_BASE_URL', 'https://flowcube.frzgroup.com.br')

# Stripe
STRIPE_SECRET_KEY = _env('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = _env('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = _env('STRIPE_WEBHOOK_SECRET', '')

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

RUNNING_TESTS = len(sys.argv) > 1 and sys.argv[1] == "test"
SECURE_SSL_REDIRECT = (not DEBUG) and (not RUNNING_TESTS)
SESSION_COOKIE_SECURE = (not DEBUG) and (not RUNNING_TESTS)
CSRF_COOKIE_SECURE = (not DEBUG) and (not RUNNING_TESTS)

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "data:")
CSP_CONNECT_SRC = ("'self'",)

# Proxy
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
NUM_PROXIES = int(_env('NUM_PROXIES', '1'))
