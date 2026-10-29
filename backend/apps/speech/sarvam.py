"""Sarvam AI speech-to-text (Saaras) and text-to-speech (Bulbul) through the official `sarvamai` SDK.

Model and speaker names change between Sarvam releases (bulbul:v2 is already deprecated), so they come from
env: SARVAM_STT_MODEL (saaras:v3), SARVAM_TTS_MODEL (bulbul:v3), SARVAM_TTS_SPEAKER (ritu, which speaks
Telugu, Hindi and English on bulbul:v3).
"""
import base64
import io
import re
import wave
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from sarvamai import SarvamAI

from apps import i18n

from .base import SpeechUnavailable, audio_filename

TIMEOUT = 8
CHUNK_CHARS = 450
MIN_CHUNK_CHARS = 60


def _client():
    if not settings.SARVAM_API_KEY:
        raise SpeechUnavailable("SARVAM_API_KEY not set")
    return SarvamAI(api_subscription_key=settings.SARVAM_API_KEY, timeout=TIMEOUT)


def _mime(content_type):
    return (content_type or "audio/webm").split(";")[0]  # "audio/webm;codecs=opus" -> "audio/webm"


def transcribe(audio, content_type, language=None):
    code = language if i18n.is_supported(language) else "unknown"
    try:
        r = _client().speech_to_text.transcribe(
            file=(audio_filename(content_type), audio, _mime(content_type)),
            model=settings.SARVAM_STT_MODEL, mode="transcribe", language_code=code)
    except SpeechUnavailable:
        raise
    except Exception as exc:
        raise SpeechUnavailable(f"sarvam stt: {getattr(exc, 'body', exc)}") from exc
    return {"text": (r.transcript or "").strip(), "language": r.language_code or language}


def _chunks(text):
    """One chunk per sentence (short ones merged): Bulbul's time grows with text length, so chunks are synthesised
    in parallel and the wall-clock cost is that of the longest sentence."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?।])\s+", text) if s.strip()]
    out, cur = [], ""
    for s in sentences:
        if cur and (len(cur) >= MIN_CHUNK_CHARS or len(cur) + len(s) + 1 > CHUNK_CHARS):
            out.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
    return out + ([cur] if cur else [])


def _join_wavs(parts):
    if len(parts) == 1:
        return parts[0]
    out = io.BytesIO()
    with wave.open(io.BytesIO(parts[0]), "rb") as first:
        params = first.getparams()
    with wave.open(out, "wb") as dst:
        dst.setparams(params)
        for p in parts:
            with wave.open(io.BytesIO(p), "rb") as src:
                dst.writeframes(src.readframes(src.getnframes()))
    return out.getvalue()


def synthesize(text, language, key=None):
    client = _client()

    def speak(chunk):
        r = client.text_to_speech.convert(
            text=chunk, language_code=language, speaker=settings.SARVAM_TTS_SPEAKER, model=settings.SARVAM_TTS_MODEL,
            pace=1.0, enable_preprocessing=True, output_audio_codec="wav")
        return base64.b64decode(r.audios[0])

    try:
        chunks = _chunks(text)
        with ThreadPoolExecutor(max_workers=min(4, len(chunks))) as pool:
            parts = list(pool.map(speak, chunks))  # map keeps sentence order
        return _join_wavs(parts), "wav"
    except SpeechUnavailable:
        raise
    except Exception as exc:
        raise SpeechUnavailable(f"sarvam tts: {getattr(exc, 'body', exc)}") from exc
