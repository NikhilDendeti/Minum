"""Grounding check (F6): every number in the English draft must appear in a tool result of the same turn."""
import logging
import re

log = logging.getLogger("munim.grounding")

_MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
_DATES = [re.compile(rf"\b\d{{1,2}}\s+{_MONTH}\b"), re.compile(rf"\b{_MONTH}\s+\d{{1,2}}\b"),
          re.compile(r"\b\d{4}-\d{2}-\d{2}\b")]
_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")
_LIST_MARK = re.compile(r"(?m)^\s*\d{1,2}[.)]\s+")  # "1. Ravi", "2) Asha"


def numbers_in(text, strip_dates=True):
    if strip_dates:
        text = _LIST_MARK.sub(" ", text)
        for pattern in _DATES:
            text = pattern.sub(" ", text)
    out = []
    for tok in _NUMBER.findall(text):
        try:
            out.append(float(tok.replace(",", "")))
        except ValueError:
            pass
    return out


def result_numbers(obj):
    found = set()

    def walk(v):
        if isinstance(v, bool):
            return
        if isinstance(v, (int, float)):
            found.add(abs(float(v)))
        elif isinstance(v, str):
            found.update(numbers_in(v, strip_dates=False))
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)
        elif isinstance(v, (list, tuple)):
            for x in v:
                walk(x)

    walk(obj)
    return found


def ungrounded(answer_en, tool_calls):
    """Numbers in the answer that no tool result contains (empty list = grounded)."""
    allowed = set()
    for call in tool_calls:
        allowed |= result_numbers(call.get("result"))
    return [n for n in numbers_in(answer_en)
            if not any(abs(n - a) < 1e-6 or round(a) == n for a in allowed)]


# --- sentence-level clean-up ------------------------------------------------------------------------------------------
# A sentence ends at . ! ? or । followed by whitespace, except after "Rs." and list numbers ("1. Ravi").
_SPLIT = re.compile(r"(?<!\bRs\.)(?<!\b\d\.)(?<!\b\d\d\.)(?<=[.!?।])(\s+)")
_CLOSERS = ".!?।\"')”"


def _pieces(text):
    """[(sentence, whitespace that followed it), ...] so a sentence can be removed without disturbing the rest."""
    parts = _SPLIT.split((text or "").strip())
    return [(parts[i], parts[i + 1] if i + 1 < len(parts) else "") for i in range(0, len(parts), 2)]


def _join(pieces):
    return "".join(s + sep for s, sep in pieces).strip()


def complete_sentences(text):
    """Remove a trailing fragment that does not end like a sentence (a cut-off answer). Whole sentences only; text with a
    single unfinished sentence is returned as it is, since there is nothing complete to keep."""
    pieces = _pieces(text)
    if len(pieces) > 1 and not pieces[-1][0].rstrip().endswith(tuple(_CLOSERS)):
        log.warning("dropped a dangling fragment: %r", pieces[-1][0])
        pieces = pieces[:-1]
    return _join(pieces)


def drop_ungrounded(answer_en, tool_calls):
    """Remove each whole sentence that states a number no tool result contains. Returns (clean answer, removed sentences)."""
    kept, removed = [], []
    for sentence, sep in _pieces(answer_en):
        (removed if ungrounded(sentence, tool_calls) else kept).append((sentence, sep))
    if removed:
        log.warning("grounding removed %d sentence(s): %s", len(removed), [s for s, _ in removed])
    return _join(kept), [s for s, _ in removed]
