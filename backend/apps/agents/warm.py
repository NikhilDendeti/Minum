"""Warm the demo: create the opening offers and pay for the suggestion-chip audio once, before anyone asks.

The chip questions never reach the language model (they are answered from fixed templates), so the only slow part of
a chip is speech synthesis. Text and audio are cached; the tools still run on every ask, so the SQL panel stays real.
"""
import logging
from concurrent.futures import ThreadPoolExecutor

from apps import i18n
from apps.core.models import Merchant
from apps.speech import SpeechUnavailable, clip_key, synthesize
from apps.tools.credit import credit_eligibility
from apps.tools.forecast import forecast
from apps.tools.offers import ensure_credit_offer, ensure_promo_offer, ensure_stock_offer
from apps.tools.segments import segment_customers

from . import templates
from .cache import MATCH_ORDER
from .insights import scripted_insight

log = logging.getLogger("munim.warm")


def chip_answers(merchant_id):
    """{(question id, language): spoken text}, exactly as /api/ask will say them while the offers are still undecided."""
    out = {}
    for qid in ("q_settlement", "q_yesterday"):
        _, answers = scripted_insight(merchant_id, qid)
        out.update({(qid, lang): answers[lang] for lang in i18n.codes()})
    credit = ensure_credit_offer(merchant_id)
    pending = credit if credit and credit.status == "proposed" else None
    cash = templates.answer_cash(forecast(merchant_id, 14), credit_eligibility(merchant_id) if pending else None)
    out.update({("q_cash", lang): cash[lang] for lang in i18n.codes()})
    promo = ensure_promo_offer(merchant_id, Merchant.objects.get(pk=merchant_id).language)
    if promo is not None and promo.status == "proposed":
        growth = templates.answer_growth(segment_customers(merchant_id), promo.payload)
        out.update({("q_growth", lang): growth[lang] for lang in i18n.codes()})
    assert {qid for qid, _ in out} <= set(MATCH_ORDER)
    return out


def warm_merchant(merchant_id):
    """Create the opening offers and synthesise every chip answer in every language. Returns how many clips are ready."""
    ensure_stock_offer(merchant_id)
    answers = chip_answers(merchant_id)

    def speak(item):
        (qid, lang), text = item
        try:
            synthesize(text, lang, key=clip_key(merchant_id, qid, lang))
            return True
        except SpeechUnavailable as exc:
            log.warning("chip %s/%s not warmed: %s", qid, lang, exc)
            return False

    with ThreadPoolExecutor(max_workers=4) as pool:
        return sum(pool.map(speak, answers.items()))
