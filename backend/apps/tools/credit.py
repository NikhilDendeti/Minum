from datetime import timedelta

from django.conf import settings
from django.db.models import Avg

from apps.core.models import Merchant, Settlement

from .util import fmt_inr, logged

MULTIPLE = 15
CAP = 50000
TENURE_DAYS = 30


@logged
def credit_eligibility(merchant_id, today=None):
    """amount = round(15 x average daily net inflow over 90 days, -3), capped at 50,000.

    "Net inflow" is settlement net after operating costs (merchant.operating_cost_ratio, see R3).
    Eligible when 90 days of history exist and no settlement netted to zero or less.
    """
    today = today or settings.DEMO_TODAY
    merchant = Merchant.objects.get(pk=merchant_id)
    window = Settlement.objects.filter(merchant=merchant, date__gte=today - timedelta(days=90), date__lt=today)
    days = window.count()
    avg_net = float(window.aggregate(a=Avg("net"))["a"] or 0)
    avg_daily = avg_net * (1 - float(merchant.operating_cost_ratio))
    eligible = days >= 90 and not window.filter(net__lte=0).exists()
    amount = min(CAP, int(round(MULTIPLE * avg_daily, -3))) if eligible else 0
    return {
        "eligible": eligible,
        "amount": amount,
        "tenure_days": TENURE_DAYS,
        "avg_daily_net": round(avg_daily),
        "basis": f"{MULTIPLE} x average daily net inflow (Rs {fmt_inr(avg_daily)})",
    }
