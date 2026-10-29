from collections import defaultdict
from datetime import timedelta

from django.conf import settings

from apps.core.models import Merchant, Obligation, Settlement

from .util import jsonable, logged


@logged
def forecast(merchant_id, days=14, today=None, credit=0, merchant=None):
    """Day-by-day projected balance.

    inflow   = mean settlement net of the same weekday over the last 8 weeks
    outflow  = operating costs (operating_cost_ratio x inflow) + obligations due that day
    balance  = running total from merchant.cash_balance; `credit` (an approved offer) lands on the first day.
    """
    merchant = merchant or Merchant.objects.get(pk=merchant_id)
    today = today or settings.DEMO_TODAY
    last = today - timedelta(days=1)

    nets = defaultdict(list)
    for s in Settlement.objects.filter(merchant=merchant, date__gt=last - timedelta(days=56), date__lte=last):
        nets[s.date.weekday()].append(float(s.net))
    obligations = list(Obligation.objects.filter(merchant=merchant, paid=False, due_on__gt=today,
                                                 due_on__lte=today + timedelta(days=days)).order_by("due_on"))
    ratio = float(merchant.operating_cost_ratio)
    balance = float(merchant.cash_balance)

    rows = []
    for i in range(1, days + 1):
        d = today + timedelta(days=i)
        samples = nets[d.weekday()]
        inflow = sum(samples) / len(samples) if samples else 0.0
        due = sum(float(o.amount) for o in obligations if o.due_on == d)
        balance += inflow - inflow * ratio - due + (float(credit) if i == 1 else 0.0)
        rows.append({"date": d.isoformat(), "inflow": round(inflow), "outflow": round(inflow * ratio + due),
                     "balance": round(balance)})

    gap = driver = None
    negative = [r for r in rows if r["balance"] < 0]
    if negative:
        low = min(r["balance"] for r in rows)
        driver_ob = max(obligations, key=lambda o: o.amount) if obligations else None
        driver = None if driver_ob is None else {"label": driver_ob.label, "amount": driver_ob.amount,
                                                  "due_on": driver_ob.due_on}
        gap = {"first_negative_date": negative[0]["date"], "min_balance": low, "shortfall": abs(low),
               "driver": driver,
               "driver_name": driver_ob.label.split(" - ", 1)[-1] if driver_ob else ""}
    return jsonable({
        "as_of": today.isoformat(),
        "days": rows,
        "gap": gap,
        "driver": driver,
        "obligations": [{"id": o.id, "label": o.label, "amount": o.amount, "due_on": o.due_on} for o in obligations],
    })
