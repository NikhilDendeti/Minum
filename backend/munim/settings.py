import os
import re
from datetime import date
from pathlib import Path
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
load_dotenv(REPO_ROOT / ".env")


def env(name, default=""):
    value = os.environ.get(name, default)
    # allow a trailing " # comment" (as in .env.example); a '#' inside a password or key is kept
    return re.split(r"\s+#", value, maxsplit=1)[0].strip() if isinstance(value, str) else value


def env_bool(name, default=False):
    return env(name, str(default)).lower() in ("1", "true", "yes", "on")


def db_from_url(url):
    p = urlparse(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": p.path.lstrip("/"),
        "USER": unquote(p.username or ""),
        "PASSWORD": unquote(p.password or ""),
        "HOST": p.hostname or "localhost",
        "PORT": str(p.port or 5432),
        "TIME_ZONE": "Asia/Kolkata",
    }


DEBUG = env_bool("DEBUG", False)  # off unless explicitly enabled (.env.example turns it on for local work)
SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-only-secret")
if not DEBUG and SECRET_KEY in ("", "dev-only-secret", "change-me"):
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY to a long random value when DEBUG is off.")
DEMO_MODE = env_bool("DEMO_MODE", False)
# Local work accepts any host; in production list them (the private ".railway.internal" name is always allowed
# so the frontend's proxy can reach the backend).
ALLOWED_HOSTS = ["*"] if DEBUG else [h.strip() for h in
                                     env("ALLOWED_HOSTS", "").split(",") if h.strip()] + [".railway.internal", "localhost", "127.0.0.1"]

# --- demo constants: change in one place -------------------------------------
DEMO_TODAY = date.fromisoformat(env("DEMO_TODAY", "2026-11-12"))
MERCHANT_LANGUAGE = env("MERCHANT_LANGUAGE", "te-IN")  # Lakshmi's language when the demo data is seeded
SEED = 42
# Calibration targets planted by seed_demo (see docs/IMPLEMENTATION_PLAN.md, R3/R4).
TARGET_DAILY_NET_INFLOW = 2010
TARGET_MIN_BALANCE = -12800

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "apps.core",
    "apps.tools",
    "apps.agents",
    "apps.speech",
    "apps.i18n",
    "apps.api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]

# --- login: mobile number + OTP, signed-cookie session (see apps/api/auth.py) ---------------------------------
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
SESSION_COOKIE_NAME = "munim_session"
SESSION_COOKIE_AGE = 7 * 24 * 3600
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = "Lax"
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # trust the proxy: the browser spoke https
OTP_TTL_S = 300
OTP_MAX_ATTEMPTS = 5
OTP_MAX_REQUESTS = 5  # codes per phone per 10 minutes
DEMO_OTP = "123456"  # used only when DEMO_MODE=true; real deployments send a random code by SMS

ROOT_URLCONF = "munim.urls"
WSGI_APPLICATION = "munim.wsgi.application"
TEMPLATES = []

_default_url = env("DATABASE_URL", "postgres://munim:munim@localhost:5433/munim")
_readonly_url = env("READONLY_DATABASE_URL", "postgres://munim_ro:munim_ro@localhost:5433/munim")
DATABASES = {
    "default": db_from_url(_default_url),
    "readonly": {**db_from_url(_readonly_url), "TEST": {"MIRROR": "default"}},
}
DATABASE_ROUTERS = ["munim.routers.ReadonlyRouter"]
READONLY_ALIAS = "readonly"  # tests override this to "default"
READONLY_DB_USER = DATABASES["readonly"]["USER"]
READONLY_DB_PASSWORD = DATABASES["readonly"]["PASSWORD"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_TZ = True

STATIC_URL = "/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(env("MEDIA_ROOT", str(REPO_ROOT / "media")))  # point at a volume in production
ASSETS_DIR = REPO_ROOT / "assets"
LANGGRAPH_DB = Path(env("LANGGRAPH_DB", str(BASE_DIR / "langgraph.sqlite")))  # paused approvals; keep on the same volume

CORS_ALLOWED_ORIGINS = [o.strip() for o in env("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [o.strip() for o in env("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()] or CORS_ALLOWED_ORIGINS

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.api.auth.MerchantSessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["apps.api.auth.IsMerchant"],
    "EXCEPTION_HANDLER": "apps.api.errors.api_exception_handler",
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "UNAUTHENTICATED_USER": None,
}

# --- LLM ----------------------------------------------------------------------
LLM_MODEL = env("LLM_MODEL", "gpt-4o")
LLM_FALLBACK_MODEL = env("LLM_FALLBACK_MODEL", "gpt-4o-mini")
LLM_TIMEOUT_S = float(env("LLM_TIMEOUT_S", "10"))
OPENAI_API_KEY = env("OPENAI_API_KEY")

# --- Speech -------------------------------------------------------------------
SPEECH_PROVIDER = env("SPEECH_PROVIDER", "sarvam")  # sarvam | openai | prerecorded
SARVAM_API_KEY = env("SARVAM_API_KEY")
SARVAM_STT_MODEL = env("SARVAM_STT_MODEL", "saaras:v3")
SARVAM_TTS_MODEL = env("SARVAM_TTS_MODEL", "bulbul:v3")
SARVAM_TTS_SPEAKER = env("SARVAM_TTS_SPEAKER", "ritu")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "loggers": {
        "munim": {"handlers": ["console"], "level": "INFO"},
        # without these, a 500 in production leaves no traceback anywhere
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "django.security": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
}
