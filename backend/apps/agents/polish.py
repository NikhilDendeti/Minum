"""Final tidy of a free-form English answer before it is translated and spoken.

The model sometimes writes "Rs 12285" or "2026-11-08". The voice reads those digit by digit, so amounts get Indian
grouping and ISO dates become "Sunday 8 Nov". Only formatting changes: every digit that matters stays, so the
grounding and translation number checks are unaffected.
"""
import re
from datetime import date

from apps.tools.util import fmt_inr

_ISO = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_MONEY = re.compile(r"(?P<pre>(?:Rs\.?|₹)\s?)(?P<n>\d{4,})(?![\d,]|\.\d)")
_WESTERN = re.compile(r"(?<![\w,.\-])\d{1,3}(?:,\d{3}){2,}(?![\w,]|\.\d)|(?<![\w,.\-])\d{3},\d{3}(?![\w,]|\.\d)")  # 292,675 / 12,345,678
_BARE = re.compile(r"(?<![\w,.\-])(?P<n>\d{4,})(?![\w,]|\.\d)")


def _day(m):
    try:
        d = date(int(m[1]), int(m[2]), int(m[3]))
    except ValueError:
        return m[0]
    return f"{d:%A} {d.day} {d:%b}"


def _bare(m):
    digits = m["n"]
    if len(digits) == 4 and 1900 <= int(digits) <= 2100:  # most likely a year
        return digits
    return fmt_inr(digits)


def polish(text):
    """Regroup Western-style amounts (292,675 -> 2,92,675) and fix bare digits, dates and rupee amounts."""
    text = _ISO.sub(_day, text or "")
    text = _WESTERN.sub(lambda m: fmt_inr(m.group(0).replace(",", "")), text)
    text = _MONEY.sub(lambda m: m["pre"] + fmt_inr(m["n"]), text)
    return _BARE.sub(_bare, text)
