"""Scripted demo questions: recognised from the transcript without an LLM, then answered from fixed templates.

A hit still runs the real tools (so the SQL panel shows a real query and rows); it only skips the language
model. The keyword groups and example phrasings live in each language's catalog; all terms in a group are
alternatives across every language, and every group must match.
"""
import re

from apps import i18n

_PUNCT = re.compile(r"[.,!?;:'\"()\[\]{}।|\-]+")

INTENTS = {
    "q_settlement": ("question", "insights"),
    "q_yesterday": ("question", "insights"),
    "q_cash": ("forecast", "cashflow"),
    "q_growth": ("growth", "growth"),
}
MATCH_ORDER = ["q_settlement", "q_yesterday", "q_cash", "q_growth"]


def normalise(text):
    return " ".join(_PUNCT.sub(" ", (text or "").lower()).split())


def _hit(term, text, words):
    # short Latin terms must be whole words ("kam" must not match "kamal"); other scripts use substrings
    return term in words if term.isascii() and " " not in term else term in text


def match_scripted(text):
    """Return the scripted question id for a transcript, or None."""
    text = normalise(text)
    words = set(text.split())
    for qid in MATCH_ORDER:
        groups = i18n.scripted_groups(qid)
        if groups and all(any(_hit(t, text, words) for t in group) for group in groups):
            return qid
    return None


def examples(lang):
    """Example question per scripted id, in `lang` (English when the language has none)."""
    own = i18n.LANGUAGES.get(lang)
    return {qid: (own.examples.get(qid) if own else None) or i18n.LANGUAGES[i18n.DEFAULT].examples[qid]
            for qid in MATCH_ORDER}
