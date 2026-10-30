"""Loads the generated data into Postgres, calibrates the forecast inputs and verifies the planted stories."""
import shutil
import time
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import connection, transaction
from django.db.models import Sum
from django.db.models.functions import ExtractHour

from apps import i18n

from . import quality, seedgen
from .demo_merchants import demo_merchants
from .grants import grant_readonly
from .models import Conversation, Customer, Merchant, Obligation, Offer, Settlement, Transaction

TABLES = ["otp_challenges", "conversations", "offers", "obligations", "customers", "transactions", "settlements", "merchants"]
STORY_MERCHANT = 1


def _truncate():
    with connection.cursor() as cur:
        cur.execute("TRUNCATE " + ", ".join(TABLES) + " RESTART IDENTITY CASCADE")


def clear_runtime_state():
    """Forget conversations and offers without regenerating data."""
    Conversation.objects.all().delete()
    Offer.objects.all().delete()


def clear_media():
    """Cached briefings and answer audio belong to the previous data set."""
    for folder in settings.MEDIA_ROOT.glob("m*"):
        shutil.rmtree(folder, ignore_errors=True)


def run(today=None):
    """Regenerate every demo merchant. Returns {'seconds', 'stories'}; raises AssertionError if a story is missing."""
    from apps.tools import credit, forecast  # imported lazily: tools depend on models

    t0 = time.time()
    today = today or settings.DEMO_TODAY
    profiles = demo_merchants()
    generated = {p.id: seedgen.generate(today, p) for p in profiles}

    with transaction.atomic():
        _truncate()
        merchants = {p.id: _insert(p, generated[p.id]) for p in profiles}
        with connection.cursor() as cur:  # explicit ids above: keep the sequence ahead of them
            cur.execute("SELECT setval(pg_get_serial_sequence('merchants', 'id'), (SELECT MAX(id) FROM merchants))")
        for p in profiles:
            _calibrate(merchants[p.id], p, today, forecast)
    grant_readonly()
    clear_media()
    stories = verify(today, forecast, credit, profiles)
    return {"seconds": round(time.time() - t0, 1), "stories": stories}


def reset_demo(today=None):
    """Back to the opening state of the demo: reseed every merchant, empty offers and conversations, and rebuild the
    cached briefing (text + audio) for each merchant in their own language, and for the story merchant in every language."""
    from apps.agents import briefing  # lazy: agents depend on models

    t0 = time.time()
    result = run(today)
    clear_runtime_state()  # run() already truncated both; kept explicit so a future change to run() cannot leave rows behind
    for merchant in Merchant.objects.order_by("id"):
        langs = i18n.codes() if merchant.id == STORY_MERCHANT else [merchant.language]
        for lang in dict.fromkeys([merchant.language, *langs]):
            briefing.generate(merchant.id, lang)
    return {"seeded": True, "seconds": round(time.time() - t0, 1), "stories": result["stories"]}


def _insert(p, data):
    merchant = Merchant.objects.create(
        id=p.id, name=p.name, category=p.category, city=p.city, phone=p.phone, language=p.language,
        onboarded_on=data["start"] - timedelta(days=200))
    settlement_rows = Settlement.objects.bulk_create(
        [Settlement(merchant=merchant, **s) for s in data["settlements"]], batch_size=5000)
    sid = {s.date: s.id for s in settlement_rows}
    Transaction.objects.bulk_create([
        Transaction(merchant=merchant, ts=r["ts"], amount=r["amount"], customer_hash=r["customer_hash"],
                    mode=r["mode"], status=r["status"], settlement_id=sid[r["date"]])
        for r in data["rows"]], batch_size=5000)
    Obligation.objects.bulk_create([Obligation(merchant=merchant, **o) for o in data["obligations"]])
    agg = defaultdict(lambda: {"days": set(), "spend": 0})
    for r in data["rows"]:
        if r["status"] == "success":
            a = agg[r["customer_hash"]]
            a["days"].add(r["date"])
            a["spend"] += r["amount"]
    Customer.objects.bulk_create([
        Customer(customer_hash=h, merchant=merchant, first_seen=min(a["days"]), last_seen=max(a["days"]),
                 visit_count=len(a["days"]), total_spend=a["spend"])
        for h, a in agg.items()], batch_size=5000)
    return merchant


def _calibrate(merchant, p, today, forecast):
    """R3/R4. Lakshmi: choose operating_cost_ratio so daily net inflow = 2,010 and cash_balance so the lowest balance
    is -12,800. The second shop just gets comfortable fixed values (no cash gap)."""
    legacy = p.cash == "legacy"
    if p.cash == "comfortable" or (legacy and not p.stories):
        merchant.operating_cost_ratio = Decimal("0.8000")
        merchant.cash_balance = Decimal(30000 if legacy else 6 * p.base_daily)  # far above any 14-day need: no gap
        merchant.save()
        return
    target_net = settings.TARGET_DAILY_NET_INFLOW if legacy else p.daily_net
    target_min = settings.TARGET_MIN_BALANCE if legacy else p.min_balance
    window = Settlement.objects.filter(merchant=merchant, date__gte=today - timedelta(days=90), date__lt=today)
    mean_net = float(window.aggregate(s=Sum("net"))["s"]) / window.count()
    merchant.operating_cost_ratio = Decimal(str(round(1 - target_net / mean_net, 4)))
    merchant.cash_balance = Decimal(0)
    merchant.save()
    base = forecast.forecast(merchant.id, 14, today=today, merchant=merchant)
    lowest = min(d["balance"] for d in base["days"])
    merchant.cash_balance = Decimal(target_min - lowest)
    merchant.save()


def verify(today, forecast, credit, profiles):
    """Check each planted story against the database. Returns one line per story."""
    mid = STORY_MERCHANT
    end = today - timedelta(days=1)
    lines = []
    sales = Transaction.objects.filter(merchant_id=mid, status="success")

    by_hour = {r["h"]: float(r["s"]) for r in
               sales.filter(ts__week_day__in=[2, 3, 4, 5, 6]).annotate(h=ExtractHour("ts")).values("h")
               .annotate(s=Sum("amount")).values("h", "s")}
    ratio = (sum(by_hour[h] for h in (18, 19, 20)) / 3) / (sum(by_hour[h] for h in (11, 12)) / 2)
    assert 0.60 <= ratio <= 0.70, f"evening/peak ratio {ratio:.2f}"
    lines.append(f"Story 1: weekday 6-9 pm sales are {round((1 - ratio) * 100)}% below the 11-1 peak")

    day_sum = lambda d: float(sales.filter(ts__date=d).aggregate(s=Sum("amount"))["s"])
    base = sum(day_sum(end - timedelta(days=7 * k)) for k in range(1, 5)) / 4
    earned = day_sum(end)
    assert round(earned) == 8200 and round(base) == 9320, (earned, base)
    lines.append(f"Story 2: {end} earned {earned:.0f} vs 4-week Wednesday average {base:.0f} ({(earned - base) / base * 100:.1f}%)")

    s = Settlement.objects.get(merchant_id=mid, date=seedgen.SETTLEMENT_STORY_DATE)
    short = s.gross - s.net
    assert short == Decimal("1420.00") and s.refunds == 890 and s.mdr_fee == 530, (short, s.refunds, s.mdr_fee)
    lines.append(f"Story 3: settlement {s.date} short by {short} (refunds {s.refunds}, fees {s.mdr_fee})")

    customers = Customer.objects.filter(merchant_id=mid)
    lapsed = customers.filter(visit_count__gte=5, last_seen__lt=today - timedelta(days=14)).count()
    regular_rev = sales.filter(customer_hash__in=customers.filter(visit_count__gte=5).values("customer_hash")
                               ).aggregate(s=Sum("amount"))["s"]
    share = float(regular_rev) / float(sales.aggregate(s=Sum("amount"))["s"]) * 100
    assert lapsed == 40 and 50 <= share <= 62, (lapsed, share)
    lines.append(f"Story 4: {lapsed} lapsed regulars; customers with 5+ visits bring {share:.0f}% of revenue ({customers.count()} customers)")

    gap = forecast.forecast(mid, 14, today=today)["gap"]
    offer = credit.credit_eligibility(mid, today=today)
    assert gap and gap["first_negative_date"] == str(today + timedelta(days=7)), gap
    assert abs(gap["min_balance"] - settings.TARGET_MIN_BALANCE) <= 50 and offer["amount"] == 30000, (gap, offer)
    lines.append(f"Story 5: balance first negative {gap['first_negative_date']} (min {gap['min_balance']}), "
                 f"{gap['driver']['label']} {gap['driver']['amount']}; pre-approved credit {offer['amount']}")

    n = Transaction.objects.filter(merchant_id=mid).count()
    assert 14000 <= n <= 19000, n
    lines.append(f"Data: {n} transactions for merchant {mid}; {Transaction.objects.count()} in total")
    for p in profiles:
        if p.stories:
            continue
        fc = forecast.forecast(p.id, 14, today=today)
        n = Transaction.objects.filter(merchant_id=p.id).count()
        assert n > 5000, p.name
        if p.cash == "tight":
            gap = fc["gap"]
            offer = credit.credit_eligibility(p.id, today=today)
            assert gap and gap["first_negative_date"] == str(today + timedelta(days=p.supplier_due_days)), (p.name, gap)
            assert abs(gap["min_balance"] - p.min_balance) <= 50 and offer["eligible"] and offer["amount"] > 0, (p.name, gap, offer)
            outlook = f"cash gap on {gap['first_negative_date']} (min {gap['min_balance']}), credit offer {offer['amount']}"
        else:
            assert fc["gap"] is None, (p.name, fc["gap"])
            outlook = "no cash gap"
        lines.append(f"Merchant {p.id} ({p.name}, {p.language}): {n} transactions, {outlook}")

    problems = quality.check(today, profiles)
    assert not problems, "data quality failed:\n  - " + "\n  - ".join(problems)
    lines.append(f"Quality: {len(profiles)} merchants pass every data-quality check")
    return lines
