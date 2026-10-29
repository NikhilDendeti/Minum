"""Which language to answer in. Thin layer over the registry in apps.i18n."""
from apps import i18n

SUPPORTED = tuple(i18n.codes())


def normalise(code, default=i18n.DEFAULT):
    return i18n.normalise(code, default)


def detect(text, hint=None, default=i18n.DEFAULT):
    """Follow the speaker: a script we know (Telugu, Devanagari) wins, else the STT hint, else the merchant's language.

    Devanagari could be Hindi or Marathi once Marathi is added; the STT hint then decides (see `hint_wins`).
    """
    script = i18n.detect_script(text)
    if script and not (hint in i18n.LANGUAGES and i18n.LANGUAGES[hint].scripts == i18n.LANGUAGES[script].scripts):
        return script
    if hint in i18n.LANGUAGES:
        return hint
    return script or default
