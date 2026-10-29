from datetime import date, timedelta

from django.conf import settings
from django.utils import timezone

from apps.core.models import Settlement, Transaction

from .sql import run_sql
from .util import jsonable, logged


@logged
def explain_settlement(merchant_id, day=None):
    """Why a settlement came in below gross sales. With no date, picks the largest shortfall in the last 7 days."""
    today = settings.DEMO_TODAY
    qs = Settlement.objects.filter(merchant_id=merchant_id)
    if day:
        s = qs.filter(date=date.fromisoformat(str(day))).first()
    else:
        recent = qs.filter(date__gte=today - timedelta(days=7), date__lt=today)
        s = max(recent, key=lambda x: x.gross - x.net, default=None)
    if s is None:
        return {"error": "no settlement found for that date"}

    refunds = Transaction.objects.filter(merchant_id=merchant_id, status="refund", ts__date=s.date).order_by("ts")
    result = {
        "date": s.date.isoformat(),
        "gross": s.gross, "mdr_fee": s.mdr_fee, "refunds": s.refunds, "chargebacks": s.chargebacks, "net": s.net,
        "shortfall": s.gross - s.net,
        "refund_count": refunds.count(),
        "refund_txns": [{"time": timezone.localtime(t.ts).strftime("%H:%M"), "amount": t.amount} for t in refunds],
    }
    sql = ("SELECT date, gross, refunds, mdr_fee, chargebacks, net, gross - net AS shortfall "
           f"FROM settlements WHERE date = '{s.date.isoformat()}'")
    result = jsonable(result)
    result["evidence"] = {"sql": sql, "rows": run_sql(merchant_id, sql)["rows"]}
    return result
