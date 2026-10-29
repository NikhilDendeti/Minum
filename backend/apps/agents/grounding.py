"""Grounding check (F6): every number in the English draft must appear in a tool result of the same turn."""
import re

_MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
_DATES = [re.compile(rf"\b\d{{1,2}}\s+{_MONTH}\b"), re.compile(rf"\b{_MONTH}\s+\d{{1,2}}\b"),
          re.compile(r"\b\d{4}-\d{2}-\d{2}\b")]
_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


def numbers_in(text, strip_dates=True):
    if strip_dates:
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
