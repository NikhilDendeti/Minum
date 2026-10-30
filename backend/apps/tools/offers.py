"""Idempotent creation of the one open proposal per type (R11): reloading a screen never makes new offers."""
from apps.core.models import Offer

from .credit import credit_eligibility
from .forecast import forecast
from .promo import draft_promo
from .segments import segment_customers
from .stock import busy_day


def _latest(merchant_id, offer_type):
    return Offer.objects.filter(merchant_id=merchant_id, type=offer_type).order_by("-id").first()


def ensure_credit_offer(merchant_id):
    """Latest credit offer, creating one when a cash gap exists and the merchant is eligible."""
    from apps.agents import templates

    offer = _latest(merchant_id, "credit")
    if offer:
        return offer
    fc = forecast(merchant_id, 14)
    eligibility = credit_eligibility(merchant_id)
    if not fc["gap"] or not eligibility["eligible"] or not eligibility["amount"]:
        return None
    text = templates.credit_offer_text(eligibility["amount"], eligibility["tenure_days"])
    return Offer.objects.create(merchant_id=merchant_id, type="credit", payload={
        "amount": eligibility["amount"], "tenure_days": eligibility["tenure_days"], "basis": eligibility["basis"],
        "gap_date": fc["gap"]["first_negative_date"], "text_en": text["en"], "text_by_lang": text})


def ensure_promo_offer(merchant_id, language):
    """Latest promo offer, creating one for the lapsed-regulars segment if none exists."""
    offer = _latest(merchant_id, "promo")
    if offer:
        return offer
    segment = segment_customers(merchant_id)
    if not segment["count"]:
        return None
    from apps.agents import templates
    from apps.core.models import Merchant

    promo = draft_promo(merchant_id, segment, language)
    by_lang = templates.promo_text(promo["discount_pct"], Merchant.objects.get(pk=merchant_id).name)
    by_lang[language] = promo["text_local"]
    return Offer.objects.create(merchant_id=merchant_id, type="promo", payload={
        **promo, "channel": "paytm_app_notification", "segment": segment["name"], "text_by_lang": by_lang})


def set_thread(offer, thread_id):
    """Remember which paused LangGraph thread holds this offer's approval gate."""
    offer.payload = {**offer.payload, "thread_id": thread_id}
    offer.save(update_fields=["payload"])


def ensure_stock_offer(merchant_id):
    """Latest restock reminder, creating one when a clearly busier day is coming up. Timing only: no stock data exists."""
    offer = _latest(merchant_id, "stock")
    if offer:
        return offer
    day = busy_day(merchant_id)
    if not day:
        return None
    from apps.agents import templates

    text = templates.stock_text(day)
    return Offer.objects.create(merchant_id=merchant_id, type="stock", payload={
        **day, "text_en": text["en"], "text_by_lang": text})
