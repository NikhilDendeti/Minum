"""Speech in and out behind one interface. Provider chain: SPEECH_PROVIDER first, OpenAI second, pre-recorded last."""
import hashlib
import logging
import os
import time

from django.conf import settings

from .base import SpeechUnavailable
from .numbers import speak_numbers

log = logging.getLogger("munim.speech")


def clip_key(merchant_id, name, lang):
    """Name of a pre-recorded clip. Merchant-specific: one shop's numbers must never play for another."""
    return f"m{merchant_id}_{name}_{lang}"


def _provider(name):
    if name == "sarvam":
        from . import sarvam as mod
    elif name == "openai":
        from . import openai_speech as mod
    else:
        from . import prerecorded as mod
    return mod


def _live_chain():
    chain = []
    for name in (settings.SPEECH_PROVIDER, "openai"):
        if name in ("sarvam", "openai") and name not in chain:
            chain.append(name)
    return chain


def transcribe(audio, content_type, language=None):
    """audio bytes -> {"text", "language"}. Raises SpeechUnavailable when no live provider works."""
    errors = []
    for name in _live_chain():
        t0 = time.time()
        try:
            result = _provider(name).transcribe(audio, content_type, language)
            log.info("stt provider=%s ms=%d", name, (time.time() - t0) * 1000)
            return result
        except SpeechUnavailable as exc:
            errors.append(f"{name}: {exc}")
            log.warning("stt provider=%s failed: %s", name, exc)
    raise SpeechUnavailable("speech-to-text unavailable (" + "; ".join(errors or ["no live provider configured"]) + ")")


CACHE_EXTENSIONS = ("wav", "mp3")


def _voice(name):
    return f"{settings.SARVAM_TTS_MODEL}|{settings.SARVAM_TTS_SPEAKER}" if name == "sarvam" else "tts-1|alloy"


def _cache_base(name, spoken, language):
    """Same provider, voice, language and spoken text always give the same audio, so it is paid for once.
    The folder sits outside every m<merchant>/ folder, so the media view never serves it."""
    digest = hashlib.sha256(f"{name}|{_voice(name)}|{language}|{spoken}".encode("utf-8")).hexdigest()[:40]
    return settings.MEDIA_ROOT / "_tts_cache" / digest


def _cache_get(name, spoken, language):
    base = _cache_base(name, spoken, language)
    for ext in CACHE_EXTENSIONS:
        path = base.with_suffix("." + ext)
        try:
            if path.exists() and path.stat().st_size > 0:
                return path.read_bytes(), ext
        except OSError:
            return None
    return None


def _cache_put(name, spoken, language, audio, ext):
    if not audio or ext not in CACHE_EXTENSIONS:
        return
    path = _cache_base(name, spoken, language).with_suffix("." + ext)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + f".{os.getpid()}.tmp")
        tmp.write_bytes(audio)
        os.replace(tmp, path)  # atomic, so a half-written file is never read
    except OSError as exc:
        log.warning("tts cache write failed: %s", exc)


def synthesize(text, language, key=None):
    """text -> (audio_bytes, extension). `key` names a pre-recorded fallback clip (e.g. 'q_settlement_te-IN')."""
    spoken = speak_numbers(text, language)
    names = _live_chain() if settings.SPEECH_PROVIDER != "prerecorded" else []
    errors = []
    for name in names + ["prerecorded"]:
        t0 = time.time()
        live = name != "prerecorded"
        if live:
            hit = _cache_get(name, spoken, language)
            if hit:
                log.info("tts provider=%s cache hit", name)
                return hit
        try:
            result = _provider(name).synthesize(spoken, language, key)
            log.info("tts provider=%s ms=%d", name, (time.time() - t0) * 1000)
            if live:
                _cache_put(name, spoken, language, *result)
            return result
        except SpeechUnavailable as exc:
            errors.append(f"{name}: {exc}")
            log.warning("tts provider=%s failed: %s", name, exc)
    raise SpeechUnavailable("text-to-speech unavailable (" + "; ".join(errors) + ")")
