"""Planning tools: a 3-day stock plan and a new-branch suggestion. Read-only, deterministic, and kept apart from the
agents and the approval gate, so they cannot change how the existing demo behaves.

stock_plan      next 3 days of products to stock = the merchant's own weekday sales pattern x a festival uplift for
                that shop type x a product list for that shop type. The product list and uplift are assumptions.
expansion_plan  a simulated spend map around the shop and the three areas with the most spend per existing shop.

Both are labelled simulated in the API: Paytm's item-level and location data would replace the assumptions.
"""
import math
from collections import defaultdict
from datetime import timedelta

import numpy as np
from django.conf import settings
from django.db.models import Sum
from django.db.models.functions import TruncDate

from apps.core.models import Merchant, Obligation, Transaction

from . import plan_data as D
from .util import jsonable, logged

LOOKBACK_WEEKS = 8
HORIZON_DAYS = 3
UPCOMING_DAYS = 14
GRID = 7  # 7 x 7 cells
CELL_M = 500  # each cell is 500 m across


def _lang(code):
    short = (code or "en")[:2]
    return short if short in D.LANGS else "en"


def category_key(merchant, override=None):
    if override in D.CATEGORY_LABELS:
        return override
    return D.CATEGORY_KEYS.get(merchant.category)


def _in_region(event, city):
    return event["regions"] is None or any(r.lower() in (city or "").lower() for r in event["regions"])


def _units(x):
    if x < 0.5:
        return 0
    if x < 20:
        return int(math.floor(x + 0.5))
    return int(5 * math.floor(x / 5 + 0.5))


def _weekday_sales(merchant_id, today):
    """(typical sales per day, expected sales per weekday) over the last 8 weeks; days without sales count as zero."""
    last = today - timedelta(days=1)
    first = last - timedelta(days=7 * LOOKBACK_WEEKS - 1)
    daily = {r["day"]: float(r["total"]) for r in
             Transaction.objects.filter(merchant_id=merchant_id, status="success", ts__date__gte=first, ts__date__lte=last)
             .values(day=TruncDate("ts")).annotate(total=Sum("amount"))}
    by_weekday = defaultdict(list)
    for i in range(7 * LOOKBACK_WEEKS):
        d = first + timedelta(days=i)
        by_weekday[d.weekday()].append(daily.get(d, 0.0))
    typical = sum(sum(v) for v in by_weekday.values()) / (7 * LOOKBACK_WEEKS)
    return typical, {wd: sum(v) / len(v) for wd, v in by_weekday.items()}


def _round_to(x, step):
    return int(step * math.floor(x / step + 0.5))


def area_rent(merchant_rent, expected_sales, merchant_sales):
    """The new shop's monthly rent: the merchant's own rent scaled by expected sales against her own sales, kept between
    MIN_AREA_RENT and her own rent. Without her own sales figure the full rent is used."""
    if not merchant_sales or merchant_sales <= 0:
        return float(merchant_rent)
    scaled = merchant_rent * expected_sales / merchant_sales
    return float(min(merchant_rent, max(D.MIN_AREA_RENT, scaled)))


def payback_estimate(spend, shops, margin, rent, merchant_sales=None):
    """What a new shop in an area might earn, and how long it takes to pay back. Pure arithmetic on assumed constants.

    sales   = spend / (shops + 1) x NEW_SHOP_FACTOR
    rent    = the merchant's rent x sales / her own 30-day sales, kept between MIN_AREA_RENT and her rent
    profit  = sales x margin - rent
    setup   = DEPOSIT_MONTHS x rent + OPENING_STOCK_DAYS of sales + FITOUT
    payback = setup / profit, in months (None when profit is not above zero)
    Sales and profit are rounded to Rs 500 and setup to Rs 5,000, and payback is worked out from the rounded figures,
    so anyone can check the displayed numbers against each other.
    """
    sales_raw = spend / (shops + 1) * D.NEW_SHOP_FACTOR
    rent_new = area_rent(rent, sales_raw, merchant_sales)
    profit_raw = sales_raw * margin - rent_new
    setup_raw = D.DEPOSIT_MONTHS * rent_new + sales_raw / 30 * D.OPENING_STOCK_DAYS + D.FITOUT
    sales, profit = _round_to(sales_raw, D.SALES_ROUND), _round_to(profit_raw, D.SALES_ROUND)
    setup = _round_to(setup_raw, D.SETUP_ROUND)
    out = {"expected_monthly_sales": sales, "expected_monthly_profit": profit, "setup_cost": setup, "area_rent": round(rent_new)}
    if profit <= 0:
        return {**out, "payback_months": None, "verdict": "not_recommended", "can_request": False}
    months = round(setup / profit, 1)
    return {**out, "payback_months": months, "verdict": "recommended" if months <= D.MAX_PAYBACK_MONTHS else "slow",
            "can_request": months <= D.REQUEST_MAX_PAYBACK_MONTHS}


def _shop_rent(merchant_id):
    """The merchant's own recurring shop rent, used as a stand-in for a comparable shop's rent; (amount, source)."""
    row = Obligation.objects.filter(merchant_id=merchant_id, label="Shop rent").order_by("-due_on").first()
    return (float(row.amount), "own") if row else (float(D.DEFAULT_RENT), "assumed")


def _categories(lang):
    return [{"key": k, "label": v[lang]} for k, v in D.CATEGORY_LABELS.items()]


@logged
def stock_plan(merchant_id, today=None, category=None, language=None):
    merchant = Merchant.objects.get(pk=merchant_id)
    lang = _lang(language or merchant.language)
    today = today or settings.DEMO_TODAY
    key = category_key(merchant, category)
    base = {"categories": _categories(lang), "simulated": True, "note": D.CALENDAR_NOTE[lang]}
    typical, expected = _weekday_sales(merchant_id, today)
    if key is None or typical <= 0:
        return jsonable({"available": False, **base})
    scale = typical / 10_000  # the product list is quoted per Rs 10,000 of daily sales

    days = []
    for i in range(1, HORIZON_DAYS + 1):
        d = today + timedelta(days=i)
        factor = expected[d.weekday()] / typical
        events = [e for e in D.EVENTS if e["start"] <= d <= e["end"] and _in_region(e, merchant.city)]
        days.append({"date": d, "factor": factor, "events": events})

    items = []
    for sku, names, unit, per10k, tags in D.CATALOG[key]:
        per_day, reasons = [], []
        for idx, day in enumerate(days):
            boost, cause = 1.0, None
            for e in day["events"]:
                b = max((e["boosts"].get(t, 1.0) for t in tags), default=1.0)
                if b > boost:
                    boost, cause = b, e
            per_day.append(_units(per10k * scale * day["factor"] * boost))
            if cause:
                reasons.append({"day": idx, "event_id": cause["id"], "event": cause["names"][lang], "pct": round((boost - 1) * 100)})
        items.append({"sku": sku, "name": names[D.LANGS.index(lang)], "unit": unit, "unit_label": D.UNIT_LABELS[unit][lang],
                      "per_day": per_day, "total": sum(per_day), "boosted": bool(reasons), "reasons": reasons})
    items.sort(key=lambda it: (not it["boosted"], -it["total"]))

    upcoming = []
    horizon_end = today + timedelta(days=HORIZON_DAYS)
    for e in D.EVENTS:
        if not (horizon_end < e["start"] <= today + timedelta(days=UPCOMING_DAYS)) or not _in_region(e, merchant.city):
            continue
        affected = [names[D.LANGS.index(lang)] for _, names, _, _, tags in D.CATALOG[key]
                    if any(t in e["boosts"] for t in tags)]
        if affected:
            upcoming.append({"id": e["id"], "name": e["names"][lang], "date": e["start"], "days_away": (e["start"] - today).days,
                             "items": affected[:3]})

    return jsonable({
        "available": True, "as_of": today, "category": key, "category_label": D.CATEGORY_LABELS[key][lang],
        "typical_daily_sales": round(typical),
        "days": [{"date": d["date"], "weekday": d["date"].weekday(), "expected_sales": round(expected[d["date"].weekday()]),
                  "vs_typical_pct": round((d["factor"] - 1) * 100),
                  "events": [{"id": e["id"], "name": e["names"][lang]} for e in d["events"]]} for d in days],
        "items": items, "upcoming": upcoming, **base,
    })


@logged
def expansion_plan(merchant_id, today=None, category=None, language=None):
    """Where a second branch could earn the most. The spend map is generated (seeded by the merchant), not real."""
    merchant = Merchant.objects.get(pk=merchant_id)
    lang = _lang(language or merchant.language)
    today = today or settings.DEMO_TODAY
    key = category_key(merchant, category)
    note = {"en": "Simulated map. Paytm's merchant location and spend data would replace it.",
            "hi": "यह डेमो नक्शा है। Paytm का असली लोकेशन और ख़र्च डेटा इसकी जगह लेगा।",
            "te": "ఇది డెమో మ్యాప్. Paytm యొక్క అసలైన లొకేషన్, ఖర్చు డేటా దీని స్థానంలో వస్తుంది."}[lang]
    monthly = float(Transaction.objects.filter(
        merchant_id=merchant_id, status="success", ts__date__gte=today - timedelta(days=30), ts__date__lt=today
    ).aggregate(s=Sum("amount"))["s"] or 0)
    if key is None or monthly <= 0 or merchant_id not in D.LOCATIONS:
        return jsonable({"available": False, "simulated": True, "note": note})

    rng = np.random.default_rng(7000 + merchant_id)  # same map on every run
    centres = rng.uniform(0, GRID - 1, size=(3, 2))
    weights = rng.uniform(0.6, 1.0, size=3)
    mid = GRID // 2
    cells = []
    for r in range(GRID):
        for c in range(GRID):
            density = 0.3 + sum(w * math.exp(-((r - cy) ** 2 + (c - cx) ** 2) / (2 * 1.2 ** 2)) for (cy, cx), w in zip(centres, weights))
            spend = monthly * (0.5 + density * 1.2) * float(rng.uniform(0.9, 1.1))
            shops = int(density * 2.6 + float(rng.uniform(0, 1.0)))
            you = r == mid and c == mid
            if you:
                shops = max(1, shops)
            cells.append({"row": r, "col": c, "spend": int(round(spend / 5000) * 5000), "shops": shops, "you": you, "rank": 0})
    for cell in cells:
        cell["score"] = round(cell["spend"] / (cell["shops"] + 1))
    ranked = sorted((c for c in cells if not c["you"]), key=lambda c: -c["score"])[:3]
    top = []
    for rank, cell in enumerate(ranked, start=1):
        cell["rank"] = rank
        dx, dy = cell["col"] - mid, mid - cell["row"]  # east, north
        bearing = math.degrees(math.atan2(dx, dy)) % 360
        top.append({"rank": rank, "row": cell["row"], "col": cell["col"], "spend": cell["spend"], "shops": cell["shops"],
                    "distance_m": int(round(math.hypot(dx, dy) * CELL_M / 100) * 100),
                    "direction": D.DIRECTIONS[int(round(bearing / 45)) % 8][lang]})
    rent, rent_source = _shop_rent(merchant_id)
    margin = D.MARGIN[key]
    for area in top:  # additive: the ranking and every existing field above are untouched
        area.update(payback_estimate(area["spend"], area["shops"], margin, rent, monthly))
    assumptions = {"new_shop_factor": D.NEW_SHOP_FACTOR, "margin": margin, "rent": round(rent), "rent_source": rent_source,
                   "deposit_months": D.DEPOSIT_MONTHS, "opening_stock_days": D.OPENING_STOCK_DAYS, "fitout": D.FITOUT,
                   "max_payback_months": D.MAX_PAYBACK_MONTHS, "max_request_months": D.REQUEST_MAX_PAYBACK_MONTHS,
                   "min_rent": D.MIN_AREA_RENT}
    return jsonable({
        "available": True, "category": key, "category_label": D.CATEGORY_LABELS[key][lang], "categories": _categories(lang),
        "grid": GRID, "cell_m": CELL_M, "monthly_sales": round(monthly), "cells": cells, "top": top,
        "assumptions": assumptions, "simulated": True, "note": note,
    })
