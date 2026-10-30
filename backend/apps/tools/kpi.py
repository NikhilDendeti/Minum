from datetime import date, timedelta

from django.db.models import Sum
from django.db.models.functions import ExtractHour

from apps.core.models import Customer, Transaction

from .segments import segment_customers
from .sql import run_sql
from .util import jsonable, logged, window_label

WEEKDAYS = [2, 3, 4, 5, 6]  # Django week_day: Monday=2 .. Friday=6


@logged
def kpi_summary(merchant_id, day):
    """Yesterday-vs-baseline numbers behind the briefing; pure ORM, no LLM."""
    day = day if isinstance(day, date) else date.fromisoformat(str(day))
    sales = lambda **f: Transaction.objects.filter(merchant_id=merchant_id, status="success", **f)
    earned_on = lambda d: float(sales(ts__date=d).aggregate(s=Sum("amount"))["s"] or 0)

    earned = earned_on(day)
    baseline_days = [day - timedelta(days=7 * k) for k in range(1, 5)]
    baseline = sum(earned_on(d) for d in baseline_days) / len(baseline_days)
    delta = round((earned - baseline) / baseline * 100, 1) if baseline else 0.0

    # hourly profile of the last 28 days, weekdays only (the evening slump is a weekday story)
    hourly = {r["h"]: float(r["s"]) for r in
              sales(ts__date__gte=day - timedelta(days=27), ts__date__lte=day, ts__week_day__in=WEEKDAYS)
              .annotate(h=ExtractHour("ts")).values("h").annotate(s=Sum("amount")).values("h", "s")}
    h = lambda x: hourly.get(x, 0.0)
    slow = min(range(7, 20), key=lambda s: (h(s) + h(s + 1) + h(s + 2), s))
    peak = max(range(7, 21), key=lambda s: (h(s) + h(s + 1), -s))

    # evening (6-9 pm) vs the 11 am-1 pm lunch peak, per-hour average over 90 weekdays: the story's own definition, and steadier than 28 days
    hourly90 = {r["h"]: float(r["s"]) for r in
                sales(ts__date__gte=day - timedelta(days=89), ts__date__lte=day, ts__week_day__in=WEEKDAYS)
                .annotate(h=ExtractHour("ts")).values("h").annotate(s=Sum("amount")).values("h", "s")}
    evening = sum(hourly90.get(x, 0.0) for x in (18, 19, 20)) / 3
    lunch = sum(hourly90.get(x, 0.0) for x in (11, 12)) / 2
    evening_below = round((1 - evening / lunch) * 100) if lunch else 0

    since = day - timedelta(days=89)
    total = float(sales(ts__date__gte=since, ts__date__lte=day).aggregate(s=Sum("amount"))["s"] or 0)
    regular = float(sales(ts__date__gte=since, ts__date__lte=day,
                          customer_hash__in=Customer.objects.filter(merchant_id=merchant_id, visit_count__gte=5)
                          .values("customer_hash")).aggregate(s=Sum("amount"))["s"] or 0)

    dates = ", ".join(f"'{d.isoformat()}'" for d in [day] + baseline_days)
    sql = ("SELECT ts::date AS day, SUM(amount) AS earned, COUNT(*) AS txns FROM transactions "
           f"WHERE status = 'success' AND ts::date IN ({dates}) GROUP BY 1 ORDER BY 1 DESC")
    result = {
        "date": day.isoformat(),
        "weekday": day.weekday(),
        "earned": earned,
        "baseline_4wk_same_weekday": round(baseline),
        "delta_pct": delta,
        "peak_window": f"{peak:02d}:00-{peak + 2:02d}:00",
        "peak_window_label": window_label(peak, peak + 2),
        "slow_window": f"{slow:02d}:00-{slow + 3:02d}:00",
        "slow_window_label": window_label(slow, slow + 3),
        "evening_below_lunch_pct": evening_below,
        "evening_window_label": window_label(18, 21),
        "lunch_window_label": window_label(11, 13),
        "txn_count": sales(ts__date=day).count(),
        "repeat_share_pct": round(regular / total * 100) if total else 0,
        "lapsed_regulars": segment_customers(merchant_id, today=day + timedelta(days=1))["count"],
    }
    result = jsonable(result)
    result["evidence"] = {"sql": sql, "rows": run_sql(merchant_id, sql)["rows"]}
    return result
