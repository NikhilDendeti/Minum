import time
from datetime import date, datetime
from decimal import Decimal
from functools import wraps
import logging

log = logging.getLogger("munim.tools")


def num(x):
    """Decimal/float -> int when whole, else float rounded to 2dp."""
    if x is None:
        return None
    f = float(x)
    return int(f) if f == int(f) else round(f, 2)


def jsonable(v):
    if isinstance(v, Decimal):
        return num(v)
    if isinstance(v, float):
        return num(v)
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [jsonable(x) for x in v]
    return v


def fmt_inr(n):
    """Indian digit grouping: 1420 -> '1,420', 1234567 -> '12,34,567'."""
    n = int(round(float(n)))
    sign = "-" if n < 0 else ""
    s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts + [tail])
    return sign + s


def hour_label(h):
    h24 = h % 24
    return f"{h24 % 12 or 12}{'am' if h24 < 12 else 'pm'}"


def window_label(start, end):
    """(18, 21) -> '6-9 pm'; (11, 13) -> '11 am-1 pm'."""
    a, b = hour_label(start), hour_label(end)
    if a[-2:] == b[-2:]:
        return f"{a[:-2]}-{b[:-2]} {a[-2:]}"
    return f"{a[:-2]} {a[-2:]}-{b[:-2]} {b[-2:]}"


def logged(fn):
    """Structured log line per tool call with its latency."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.time()
        try:
            return fn(*args, **kwargs)
        finally:
            log.info("tool=%s ms=%d", fn.__name__, (time.time() - t0) * 1000)
    return wrapper
