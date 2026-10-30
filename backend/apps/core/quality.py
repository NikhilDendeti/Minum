"""Data-quality checks for the seeded demo data.

`check()` returns a list of problems (empty means clean). It is used by `seeding.verify` (so a bad seed fails loudly),
by `manage.py check_seed`, and by the tests. Every check is a statement about the data that must hold for any merchant,
not a tuned number, so adding a merchant cannot quietly produce data the product misreads.
"""
from collections import defaultdict
from datetime import timedelta

from django.conf import settings
from django.db import connection
from django.db.models import DecimalField, ExpressionWrapper, F, Sum

from . import seedgen
from .demo_merchants import demo_merchants
from .models import Customer, Merchant, Obligation, Settlement, Transaction

TICKET_TOLERANCE = 0.15  # mean successful ticket within 15% of the profile's target
REGULAR_SHARE = (35, 70)  # percent of revenue from customers with 5+ visits
MAX_FAILED_SHARE = 0.04
MAX_REFUND_SHARE = 0.05
YESTERDAY_BAND = 0.20  # a new shop's yesterday sits within 20% of its usual same weekday


def check(today=None, profiles=None):
    today = today or settings.DEMO_TODAY
    profiles = profiles or demo_merchants()
    problems = []
    add = problems.append

    # --- cross-merchant -------------------------------------------------------------------------------------------
    if {m.id for m in Merchant.objects.all()} != {p.id for p in profiles}:
        add("merchants in the database differ from the profiles")
    with connection.cursor() as cur:
        cur.execute("SELECT customer_hash FROM customers GROUP BY customer_hash HAVING COUNT(DISTINCT merchant_id) > 1 LIMIT 3")
        shared = cur.fetchall()
    if shared:
        add(f"customer hashes shared between merchants: {shared}")

    # --- every settlement balances, everywhere --------------------------------------------------------------------
    broken = Settlement.objects.annotate(
        expect=ExpressionWrapper(F("gross") - F("mdr_fee") - F("refunds") - F("chargebacks"), output_field=DecimalField())
    ).exclude(net=F("expect")).count()
    if broken:
        add(f"{broken} settlements where net != gross - fees - refunds - chargebacks")
    if Transaction.objects.filter(amount__lte=0).exists():
        add("transactions with a non-positive amount")
    if Transaction.objects.filter(ts__date__gte=today).exists():
        add("transactions dated on or after today")
    if Transaction.objects.filter(settlement__isnull=True).exists():
        add("transactions with no settlement")
    if Transaction.objects.exclude(settlement__merchant_id=F("merchant_id")).exists():
        add("transactions linked to another merchant's settlement")

    # --- visit counts are what the transactions say ---------------------------------------------------------------
    with connection.cursor() as cur:
        cur.execute("""SELECT COUNT(*) FROM (
                         SELECT c.merchant_id, c.customer_hash, c.visit_count, c.total_spend,
                                COUNT(DISTINCT t.ts::date) AS days, SUM(t.amount) AS spend
                         FROM customers c JOIN transactions t
                           ON t.merchant_id = c.merchant_id AND t.customer_hash = c.customer_hash AND t.status = 'success'
                         GROUP BY 1, 2, 3, 4) x
                       WHERE x.days <> x.visit_count OR x.spend <> x.total_spend""")
        wrong = cur.fetchone()[0]
    if wrong:
        add(f"{wrong} customers whose visit_count or total_spend disagrees with their transactions")

    # --- per merchant ---------------------------------------------------------------------------------------------
    for p in profiles:
        tag = f"merchant {p.id} ({p.name})"
        end = today - timedelta(days=1)
        n_days = p.days or seedgen.DAYS
        settlements = Settlement.objects.filter(merchant_id=p.id)
        if settlements.count() != n_days:
            add(f"{tag}: {settlements.count()} settlement days, expected {n_days}")
        if settlements.filter(date__gt=end).exists() or not settlements.filter(date=end).exists():
            add(f"{tag}: history does not end yesterday")
        sales = Transaction.objects.filter(merchant_id=p.id, status="success")
        # each day's gross is the sum of that day's successful payments
        per_day = defaultdict(float)
        for r in sales.values("ts__date").annotate(s=Sum("amount")):
            per_day[r["ts__date"]] += float(r["s"])
        off = [s.date for s in settlements if abs(float(s.gross) - per_day.get(s.date, 0.0)) > 0.5]
        if off:
            add(f"{tag}: gross differs from the day's sales on {len(off)} days (e.g. {off[0]})")

        if p.cash != "legacy":  # the new shops should read as ordinary days, not planted ones
            week = [per_day.get(end - timedelta(days=7 * k), 0.0) for k in range(1, 5)]
            baseline = sum(week) / 4
            if not baseline or abs(per_day.get(end, 0.0) - baseline) / baseline > YESTERDAY_BAND:
                add(f"{tag}: yesterday is {per_day.get(end, 0.0):.0f} against a usual {baseline:.0f}, outside {YESTERDAY_BAND:.0%}")
        count = sales.count()
        total = float(sales.aggregate(s=Sum("amount"))["s"] or 0)
        target = p.mean_ticket or seedgen.MEAN_TICKET
        if not count or abs(total / count - target) / target > TICKET_TOLERANCE:
            add(f"{tag}: mean ticket {total / max(count, 1):.0f}, target {target}")
        everything = Transaction.objects.filter(merchant_id=p.id).count()
        failed = Transaction.objects.filter(merchant_id=p.id, status="failed").count()
        refunds = Transaction.objects.filter(merchant_id=p.id, status="refund").count()
        if failed / everything > MAX_FAILED_SHARE:
            add(f"{tag}: {failed / everything:.1%} failed payments")
        if refunds / everything > MAX_REFUND_SHARE:
            add(f"{tag}: {refunds / everything:.1%} refunds")

        regulars = Customer.objects.filter(merchant_id=p.id, visit_count__gte=5)
        if p.regulars and regulars.count() < p.regulars * 0.6:
            add(f"{tag}: only {regulars.count()} regulars for a profile of {p.regulars}")
        revenue = sales.filter(customer_hash__in=regulars.values("customer_hash")).aggregate(s=Sum("amount"))["s"] or 0
        share = float(revenue) / total * 100 if total else 0
        if not REGULAR_SHARE[0] <= share <= REGULAR_SHARE[1]:
            add(f"{tag}: regulars bring {share:.0f}% of revenue, outside {REGULAR_SHARE}")
        lapsed = regulars.filter(last_seen__lt=today - timedelta(days=14)).count()
        if not 0 < lapsed <= p.regulars:
            add(f"{tag}: {lapsed} lapsed regulars")
        if not Obligation.objects.filter(merchant_id=p.id, paid=False, due_on__gt=today).exists():
            add(f"{tag}: no upcoming obligations")
        # no hour outside the shop's own opening hours
        weekday_hours = set(p.hours_weekday or seedgen.HOUR_W_WEEKDAY)
        weekend_hours = set(p.hours_weekend or seedgen.HOUR_W_WEEKEND)
        with connection.cursor() as cur:
            cur.execute("""SELECT EXTRACT(HOUR FROM ts AT TIME ZONE 'Asia/Kolkata')::int, EXTRACT(ISODOW FROM ts AT TIME ZONE 'Asia/Kolkata')::int
                           FROM transactions WHERE merchant_id = %s AND status = 'success'
                           GROUP BY 1, 2""", [p.id])
            outside = [(h, d) for h, d in cur.fetchall() if h not in (weekday_hours if d <= 5 else weekend_hours)]
        if outside:
            add(f"{tag}: sales outside opening hours, e.g. {outside[:3]}")
    return problems
