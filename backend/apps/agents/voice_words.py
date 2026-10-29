"""Deterministic yes/no matching for voice approval (no LLM call).

Whole words only, NO is checked before YES ("nahi" must never read as "ha"), and the word lists come from the
language catalogs, including the Devanagari and Telugu spellings that speech-to-text actually returns.
"""
import re

from apps import i18n

_SEPARATORS = re.compile(r"[.,!?;:'\"()\[\]{}।|\-]+")


def tokens(text):
    return [t for t in _SEPARATORS.sub(" ", (text or "").lower()).split() if t]


def match_decision(text):
    """'approve' | 'reject' | None."""
    words = set(tokens(text))
    if words & i18n.no_words():
        return "reject"
    if words & i18n.yes_words():
        return "approve"
    return None
