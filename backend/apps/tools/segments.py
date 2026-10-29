from datetime import timedelta

from django.conf import settings

from apps.core.models import Customer

from .util import jsonable, logged

LAPSED_DAYS = 14


@logged
def segment_customers(merchant_id, rule="lapsed_regulars", today=None):
    """visit_count >= 5 and last_seen < today - 14 days."""
    if rule != "lapsed_regulars":
        raise ValueError(f"unknown segment rule: {rule}")
    today = today or settings.DEMO_TODAY
    qs = Customer.objects.filter(merchant_id=merchant_id, visit_count__gte=5,
                                 last_seen__lt=today - timedelta(days=LAPSED_DAYS)).order_by("-total_spend")
    customers = list(qs)
    monthly = []
    for c in customers:
        months = max(1.0, (c.last_seen - c.first_seen).days / 30.4)
        monthly.append(float(c.total_spend) / months)
    return jsonable({
        "name": rule,
        "rule": f"visit_count >= 5 AND last_seen < today - {LAPSED_DAYS} days",
        "count": len(customers),
        "avg_monthly_spend": round(sum(monthly) / len(monthly)) if monthly else 0,
        "customers": [{"customer_hash": c.customer_hash, "last_seen": c.last_seen, "visit_count": c.visit_count,
                       "total_spend": c.total_spend} for c in customers[:10]],
    })
