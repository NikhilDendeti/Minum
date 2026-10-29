"""Pure synthetic-data generator (no Django, no database).

Everything is derived from numpy's default_rng(profile.seed) so every run is identical. For a profile with
`stories=True` (Lakshmi) the five planted stories (docs/Munim PRD and API Spec.md, docs/IMPLEMENTATION_PLAN.md
section 1) are injected as explicit overrides after the base pattern is generated.
"""
import hashlib
import math
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import numpy as np

IST = ZoneInfo("Asia/Kolkata")

DAYS = 184  # six months ending the day before DEMO_TODAY
MEAN_TICKET = 103  # R2: ~90 txns/day x ₹103 matches the ₹8,200-9,320 daily earnings
SIGMA = 0.65
WEEKDAY_FACTOR = {0: 1.0, 1: 0.9, 2: 1.0, 3: 1.0, 4: 1.05, 5: 1.1, 6: 1.2}  # Mon..Sun; Sun +20%, Tue -10%
HOUR_W_WEEKDAY = {7: .7, 8: .9, 9: .9, 10: .85, 11: 1.0, 12: 1.0, 13: .9, 14: .8, 15: .8, 16: .8, 17: .8,
                  18: .65, 19: .65, 20: .65, 21: .8}  # story 1: 6-9 pm is 35% below the 11-1 peak
HOUR_W_WEEKEND = {7: .5, 8: .8, 9: .8, 10: .8, 11: 1.0, 12: 1.0, 13: .9, 14: .7, 15: .7, 16: .8, 17: .9,
                  18: 1.0, 19: 1.0, 20: .95, 21: .6}
FESTIVAL = date(2026, 10, 20)
FESTIVAL_FACTOR = 1.6

REGULAR_GAP_MEAN = 4.6  # days between visits for a regular (tuned so 5+ visit customers bring ~55% of revenue)
CASUAL_VISITS = (1, 2, 3, 4)  # a casual customer never reaches visit_count 5
CASUAL_VISIT_P = (0.10, 0.20, 0.30, 0.40)

SETTLEMENT_STORY_DATE = date(2026, 11, 9)
SETTLEMENT_STORY = dict(gross=9870, refunds=(540, 350), mdr_fee=530)
# Story 2: the last four Wednesdays average exactly 9,320; yesterday (a Wednesday) earned 8,200.
WEDNESDAY_TARGETS = [9100, 9450, 9200, 9530]
YESTERDAY_TARGET = 8200


def _hash(prefix, i):
    return hashlib.sha1(f"{prefix}-{i}".encode()).hexdigest()[:16]


def fit_total(amounts, target):
    """Scale integer amounts so they sum to exactly `target` rupees."""
    amounts = np.asarray(amounts, dtype=np.int64)
    scaled = np.maximum(1, np.rint(amounts * (target / amounts.sum()))).astype(np.int64)
    diff = int(target - scaled.sum())
    i = 0
    while diff != 0:
        step = 1 if diff > 0 else -1
        if scaled[i % len(scaled)] + step >= 1:
            scaled[i % len(scaled)] += step
            diff -= step
        i += 1
    return scaled


def _regular_visits(rng, days, today, p):
    """Return dict date -> list[regular index]; the first p.lapsed regulars stop visiting 14+ days before today."""
    start, end = days[0], days[-1]
    cutoff = today - timedelta(days=14)  # lapsed means last_seen < cutoff
    visits = {d: [] for d in days}
    for r in range(p.regulars):
        lapsed = r < p.lapsed
        first = start + timedelta(days=int(rng.integers(0, 25)))
        last = (cutoff - timedelta(days=1 + int(rng.integers(0, 20)))) if lapsed else end
        d, mine = first, []
        while d <= last:
            mine.append(d)
            d += timedelta(days=int(rng.geometric(1 / REGULAR_GAP_MEAN)))
        if not lapsed and (not mine or mine[-1] < cutoff):
            mine.append(cutoff + timedelta(days=int(rng.integers(0, (end - cutoff).days + 1))))
        for d in mine:
            visits[d].append(r)
    return visits


def generate(today, p):
    """p is a demo_merchants.Profile."""
    rng = np.random.default_rng(p.seed)
    end = today - timedelta(days=1)
    start = end - timedelta(days=DAYS - 1)
    days = [start + timedelta(days=i) for i in range(DAYS)]
    visits = _regular_visits(rng, days, today, p)

    fits = {}
    if p.stories:
        fits = {end: YESTERDAY_TARGET, SETTLEMENT_STORY_DATE: SETTLEMENT_STORY["gross"]}
        for d, t in zip([end - timedelta(days=7 * k) for k in range(1, 5)], WEDNESDAY_TARGETS):
            fits[d] = t

    mu = math.log(MEAN_TICKET) - SIGMA ** 2 / 2
    modes = np.array(["upi", "card", "wallet"])
    rows = []  # dicts, date-ordered
    for d in days:
        reg = visits[d]
        factor = WEEKDAY_FACTOR[d.weekday()] * (FESTIVAL_FACTOR if d == FESTIVAL else 1.0)
        target = p.base_daily * factor * rng.lognormal(0, 0.05)
        n = max(int(round(target / MEAN_TICKET)), int(math.ceil(len(reg) / 0.8)), 30)
        amounts = np.maximum(5, np.rint(rng.lognormal(mu, SIGMA, n))).astype(np.int64)
        if d in fits:
            amounts = fit_total(amounts, fits[d])

        weights = HOUR_W_WEEKDAY if d.weekday() < 5 else HOUR_W_WEEKEND
        hrs = np.array(sorted(weights))
        w = np.array([weights[h] for h in hrs], dtype=float)
        hours = rng.choice(hrs, size=n, p=w / w.sum())
        minutes = rng.integers(0, 60, n)
        seconds = rng.integers(0, 60, n)
        mode = rng.choice(modes, size=n, p=[0.85, 0.10, 0.05])
        slots = rng.permutation(n)
        regular_for_slot = {int(s): r for s, r in zip(slots[: len(reg)], rng.permutation(reg))}

        for i in range(n):
            rows.append(dict(
                date=d,
                ts=datetime(d.year, d.month, d.day, int(hours[i]), int(minutes[i]), int(seconds[i]), tzinfo=IST),
                amount=int(amounts[i]),
                reg=regular_for_slot.get(i, -1),
                mode=str(mode[i]),
                status="success",
            ))

        # failed attempts (never counted as sales) and refunds
        for _ in range(int(rng.binomial(n, 0.015))):
            rows.append(dict(date=d, ts=datetime(d.year, d.month, d.day, int(rng.choice(hrs)), int(rng.integers(0, 60)), 0, tzinfo=IST),
                             amount=int(rng.integers(20, 400)), reg=-2, mode=str(rng.choice(modes)), status="failed"))
        if p.stories and d == SETTLEMENT_STORY_DATE:
            for amt in SETTLEMENT_STORY["refunds"]:
                rows.append(dict(date=d, ts=datetime(d.year, d.month, d.day, int(rng.integers(9, 20)), int(rng.integers(0, 60)), 0, tzinfo=IST),
                                 amount=amt, reg=-2, mode="upi", status="refund"))
        elif rng.random() < 0.10:
            rows.append(dict(date=d, ts=datetime(d.year, d.month, d.day, int(rng.integers(9, 20)), int(rng.integers(0, 60)), 0, tzinfo=IST),
                             amount=int(rng.integers(40, 300)), reg=-2, mode="upi", status="refund"))

    # customer hashes: regulars by index, casuals from a pool where nobody exceeds 4 visits
    casual_slots = [r for r in rows if r["reg"] == -1]
    pool = []
    i = 0
    while len(pool) < len(casual_slots):
        pool.extend([_hash(p.prefix + "cas", i)] * int(rng.choice(CASUAL_VISITS, p=CASUAL_VISIT_P)))
        i += 1
    pool = [pool[j] for j in rng.permutation(len(pool))[: len(casual_slots)]]
    for r, h in zip(casual_slots, pool):
        r["customer_hash"] = h
    for r in rows:
        if r["reg"] >= 0:
            r["customer_hash"] = _hash(p.prefix + "reg", r["reg"])
        elif r["reg"] == -2:  # failed / refund rows belong to a random regular
            r["customer_hash"] = _hash(p.prefix + "reg", int(rng.integers(0, p.regulars)))
    rows.sort(key=lambda r: r["ts"])

    return dict(start=start, end=end, rows=rows, settlements=_settlements(rows, days, p), obligations=_obligations(today, p))


def _settlements(rows, days, p):
    by_day = {d: dict(gross=0, refunds=0, card=0, wallet=0) for d in days}
    for r in rows:
        s = by_day[r["date"]]
        if r["status"] == "success":
            s["gross"] += r["amount"]
            if r["mode"] == "card":
                s["card"] += r["amount"]
            elif r["mode"] == "wallet":
                s["wallet"] += r["amount"]
        elif r["status"] == "refund":
            s["refunds"] += r["amount"]
    out = []
    for d in days:
        s = by_day[d]
        mdr = round(s["card"] * 0.018 + s["wallet"] * 0.005, 2)
        if p.stories and d == SETTLEMENT_STORY_DATE:
            mdr = float(SETTLEMENT_STORY["mdr_fee"])  # R5: includes a one-off processing charge
        out.append(dict(date=d, gross=s["gross"], mdr_fee=mdr, refunds=s["refunds"], chargebacks=0,
                        net=round(s["gross"] - mdr - s["refunds"], 2), credited_on=d + timedelta(days=1)))
    return out


def _obligations(today, p):
    if p.stories:
        paid = [("Shop rent", 18000, date(2026, m, 1)) for m in (6, 7, 8, 9, 10, 11)]
        paid += [("Supplier payment - Sri Balaji Traders", a, d) for a, d in
                 [(38000, date(2026, 6, 10)), (41000, date(2026, 7, 22)), (36000, date(2026, 9, 5)), (42000, date(2026, 10, 12))]]
        due = [("Supplier payment - Sri Balaji Traders", 45000, today + timedelta(days=7), False),  # story 5 (R4)
               ("Electricity bill", 3200, today + timedelta(days=11), False),
               ("Shop rent", 18000, date(2026, 12, 1), False)]
    else:  # comfortable cash: no gap, so no credit offer
        paid = [("Shop rent", 14000, date(2026, m, 1)) for m in (6, 7, 8, 9, 10, 11)]
        paid += [("Supplier payment - Gupta Wholesale", a, d) for a, d in
                 [(22000, date(2026, 6, 14)), (24000, date(2026, 8, 3)), (21000, date(2026, 10, 2))]]
        due = [("Supplier payment - Gupta Wholesale", 20000, today + timedelta(days=9), False),
               ("Shop rent", 14000, date(2026, 12, 1), False)]
    return [dict(label=l, amount=a, due_on=d, paid=True) for l, a, d in paid] + \
           [dict(label=l, amount=a, due_on=d, paid=pd) for l, a, d, pd in due]
