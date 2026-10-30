from collections import defaultdict
from datetime import timedelta

from django.conf import settings
from django.db.models import Sum
from django.db.models.functions import TruncDate

from apps.core.models import Transaction

from .util import jsonable, logged

LOOKBACK_WEEKS = 8
HORIZON_DAYS = 7
MIN_UPLIFT_PCT = 10  # a day is only worth a reminder when it usually sells at least this much more than a normal day


@logged
def busy_day(merchant_id, today=None):
    """The busiest upcoming day, from the merchant's own sales. There is no item or stock data in this system, so the
    reminder is about timing, not quantities.

    expected = average sales on that weekday over the last 8 weeks (days without sales count as zero)
    typical  = average sales per day over the same 8 weeks
    Returns None when no day in the next 7 clears MIN_UPLIFT_PCT.
    """
    today = today or settings.DEMO_TODAY
    last = today - timedelta(days=1)
    first = last - timedelta(days=7 * LOOKBACK_WEEKS - 1)
    sales = {r["day"]: float(r["total"]) for r in
             Transaction.objects.filter(merchant_id=merchant_id, status="success", ts__date__gte=first, ts__date__lte=last)
             .values(day=TruncDate("ts"))
             .annotate(total=Sum("amount"))}
    by_weekday = defaultdict(list)
    for i in range(7 * LOOKBACK_WEEKS):
        d = first + timedelta(days=i)
        by_weekday[d.weekday()].append(sales.get(d, 0.0))
    typical = sum(sum(v) for v in by_weekday.values()) / (7 * LOOKBACK_WEEKS)
    if typical <= 0:
        return None
    best = None
    for i in range(1, HORIZON_DAYS + 1):
        d = today + timedelta(days=i)
        samples = by_weekday[d.weekday()]
        expected = sum(samples) / len(samples)
        if best is None or expected > best["expected_sales"]:
            best = {"date": d.isoformat(), "weekday": d.weekday(), "expected_sales": round(expected)}
    uplift = (best["expected_sales"] / typical - 1) * 100
    if uplift < MIN_UPLIFT_PCT:
        return None
    best.update(typical_sales=round(typical), uplift_pct=round(uplift, 1),
                basis=f"Average sales on this weekday over the last {LOOKBACK_WEEKS} weeks, against the average across all days")
    return jsonable(best)
