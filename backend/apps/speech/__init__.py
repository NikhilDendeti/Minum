"""Speech in and out behind one interface. Provider chain: SPEECH_PROVIDER first, OpenAI second, pre-recorded last."""
import logging
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


def synthesize(text, language, key=None):
    """text -> (audio_bytes, extension). `key` names a pre-recorded fallback clip (e.g. 'q_settlement_te-IN')."""
    spoken = speak_numbers(text, language)
    names = _live_chain() if settings.SPEECH_PROVIDER != "prerecorded" else []
    errors = []
    for name in names + ["prerecorded"]:
        t0 = time.time()
        try:
            result = _provider(name).synthesize(spoken, language, key)
            log.info("tts provider=%s ms=%d", name, (time.time() - t0) * 1000)
            return result
        except SpeechUnavailable as exc:
            errors.append(f"{name}: {exc}")
            log.warning("tts provider=%s failed: %s", name, exc)
    raise SpeechUnavailable("text-to-speech unavailable (" + "; ".join(errors) + ")")
