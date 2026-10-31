"""Write the complete synthetic dataset to data/seed/ as CSV files, one per table, for all six demo merchants.

    python scripts/export_seed_data.py

It runs the same seeded generator the app seeds its database from (apps/core/seedgen.py), so the files match what the
database holds: same seed, same rows. It needs no database. Two calibrated merchant fields (cash_balance and
operating_cost_ratio) are set by the forecast after seeding and are not part of the raw data, so they are left out.
"""
import csv
import os
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "munim.settings")

import django  # noqa: E402

django.setup()

from datetime import timedelta  # noqa: E402

from django.conf import settings  # noqa: E402

from apps.core import seedgen  # noqa: E402
from apps.core.demo_merchants import demo_merchants  # noqa: E402

OUT = ROOT / "data" / "seed"
OUT.mkdir(parents=True, exist_ok=True)
today = settings.DEMO_TODAY
profiles = demo_merchants()

tables = {"merchants": [], "settlements": [], "transactions": [], "customers": [], "obligations": []}
counts = {}

for p in profiles:
    data = seedgen.generate(today, p)
    tables["merchants"].append({
        "id": p.id, "name": p.name, "category": p.category, "city": p.city, "phone": p.phone,
        "language": p.language, "onboarded_on": (data["start"] - timedelta(days=200)).isoformat()})
    for s in data["settlements"]:
        tables["settlements"].append({"merchant_id": p.id, **s})
    for r in data["rows"]:
        tables["transactions"].append({
            "merchant_id": p.id, "ts": r["ts"].isoformat(), "amount": r["amount"], "customer_hash": r["customer_hash"],
            "mode": r["mode"], "status": r["status"], "settlement_date": r["date"].isoformat()})
    for o in data["obligations"]:
        tables["obligations"].append({"merchant_id": p.id, **o})
    agg = defaultdict(lambda: {"days": set(), "spend": 0})
    for r in data["rows"]:
        if r["status"] == "success":
            a = agg[r["customer_hash"]]
            a["days"].add(r["date"])
            a["spend"] += r["amount"]
    for h, a in agg.items():
        tables["customers"].append({
            "merchant_id": p.id, "customer_hash": h, "first_seen": min(a["days"]).isoformat(),
            "last_seen": max(a["days"]).isoformat(), "visit_count": len(a["days"]), "total_spend": a["spend"]})

for name, rows in tables.items():
    with open(OUT / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    counts[name] = len(rows)
    print(f"{name}.csv  {len(rows):>7} rows  {(OUT / f'{name}.csv').stat().st_size / 1024:>8.0f} KB")
