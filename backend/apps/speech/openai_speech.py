"""OpenAI Whisper (speech-to-text) and tts-1 (text-to-speech): the first fallback. Telugu TTS quality is poor."""
from django.conf import settings
from openai import OpenAI

from apps import i18n

from .base import SpeechUnavailable, audio_filename


def _client():
    if not settings.OPENAI_API_KEY:
        raise SpeechUnavailable("OPENAI_API_KEY not set")
    return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=8, max_retries=0)


def transcribe(audio, content_type, language=None):
    kwargs = {"language": language[:2]} if i18n.is_supported(language) else {}
    try:
        result = _client().audio.transcriptions.create(
            model="whisper-1", file=(audio_filename(content_type), audio, content_type or "audio/webm"), **kwargs)
    except SpeechUnavailable:
        raise
    except Exception as exc:
        raise SpeechUnavailable(f"openai stt: {exc}") from exc
    return {"text": (result.text or "").strip(), "language": language}


def synthesize(text, language, key=None):
    try:
        response = _client().audio.speech.create(model="tts-1", voice="alloy", input=text)
        return response.content, "mp3"
    except SpeechUnavailable:
        raise
    except Exception as exc:
        raise SpeechUnavailable(f"openai tts: {exc}") from exc
