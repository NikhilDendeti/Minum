"""Language registry. One JSON catalog per language in `locales/`; adding a language means adding one file.

Each catalog holds: meta (name, native name, script ranges, yes/no words), month and weekday names, the sentence
templates used for answers/offers/errors, keywords that recognise the scripted demo questions, and example questions.
English (en-IN) is the source and the fallback for any missing string.
"""
import json
from dataclasses import dataclass, field
from pathlib import Path

DEFAULT = "en-IN"
_LOCALES = Path(__file__).parent / "locales"


@dataclass
class Language:
    code: str
    name: str
    native: str
    scripts: list = field(default_factory=list)  # [(first, last)] unicode ranges
    yes: set = field(default_factory=set)
    no: set = field(default_factory=set)
    months: list = field(default_factory=list)
    weekdays: list = field(default_factory=list)
    strings: dict = field(default_factory=dict)
    scripted: dict = field(default_factory=dict)  # qid -> [[terms], [terms]]
    examples: dict = field(default_factory=dict)  # qid -> example question
    phrasings: dict = field(default_factory=dict)  # qid -> [extra phrasings]


def _load():
    out = {}
    for path in sorted(_LOCALES.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        meta = raw["meta"]
        out[meta["code"]] = Language(
            code=meta["code"], name=meta["name"], native=meta["native"],
            scripts=[tuple(r) for r in meta.get("scripts", [])], yes=set(meta.get("yes", [])), no=set(meta.get("no", [])),
            months=raw.get("months", []), weekdays=raw.get("weekdays", []), strings=raw.get("strings", {}),
            scripted=raw.get("scripted", {}), examples=raw.get("examples", {}), phrasings=raw.get("phrasings", {}))
    return out


LANGUAGES = _load()


def codes():
    return list(LANGUAGES)


def is_supported(code):
    return code in LANGUAGES


def normalise(code, default=DEFAULT):
    """Map a client/STT language code to a supported one ('hi' -> 'hi-IN'); otherwise the default."""
    if code in LANGUAGES:
        return code
    if code:
        for known in LANGUAGES:
            if known[:2] == str(code)[:2].lower():
                return known
    return default


def t(key, lang, **values):
    """Sentence template for `lang`, falling back to English, with {placeholders} filled in."""
    template = LANGUAGES.get(lang, LANGUAGES[DEFAULT]).strings.get(key) or LANGUAGES[DEFAULT].strings[key]
    return template.format(**values)


def months(lang):
    return (LANGUAGES.get(lang) or LANGUAGES[DEFAULT]).months or LANGUAGES[DEFAULT].months


def weekdays(lang):
    return (LANGUAGES.get(lang) or LANGUAGES[DEFAULT]).weekdays or LANGUAGES[DEFAULT].weekdays


def detect_script(text):
    """Language whose script appears in `text`, or None for Latin/unknown text."""
    for lang in LANGUAGES.values():
        for first, last in lang.scripts:
            if any(first <= ord(ch) <= last for ch in text or ""):
                return lang.code
    return None


def yes_words():
    return set().union(*(l.yes for l in LANGUAGES.values()))


def no_words():
    return set().union(*(l.no for l in LANGUAGES.values()))


def scripted_groups(qid):
    """Keyword groups for a scripted question: group i is the union of every language's group i."""
    merged = []
    for lang in LANGUAGES.values():
        for i, group in enumerate(lang.scripted.get(qid, [])):
            while len(merged) <= i:
                merged.append(set())
            merged[i] |= set(group)
    return [sorted(g) for g in merged]


def profile():
    """Languages the UI can offer."""
    return [{"code": l.code, "name": l.name, "native": l.native} for l in LANGUAGES.values()]
