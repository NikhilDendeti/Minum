class SpeechUnavailable(Exception):
    """A provider could not do the job (no key, network error, bad response, no recorded clip)."""


def audio_filename(content_type):
    ct = (content_type or "").lower()
    ext = "webm" if "webm" in ct else "ogg" if "ogg" in ct else "wav" if "wav" in ct else "mp3" if "mpeg" in ct or "mp3" in ct else "webm"
    return f"audio.{ext}"
