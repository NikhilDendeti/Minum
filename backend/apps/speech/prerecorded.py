"""Offline fallback: serves clips recorded earlier (scripts/record_fallbacks.py) from assets/fallback/<key>.<ext>."""
from django.conf import settings

from .base import SpeechUnavailable

EXTENSIONS = ("mp3", "wav")


def transcribe(audio, content_type, language=None):
    raise SpeechUnavailable("pre-recorded mode cannot transcribe; use the suggested-question buttons")


def synthesize(text, language, key=None):
    if not key:
        raise SpeechUnavailable("no pre-recorded clip for this answer")
    for ext in EXTENSIONS:
        path = settings.ASSETS_DIR / "fallback" / f"{key}.{ext}"
        if path.exists():
            return path.read_bytes(), ext
    raise SpeechUnavailable(f"no pre-recorded clip named {key}")
