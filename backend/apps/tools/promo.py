import logging
import re

from apps.core.models import Merchant
from apps.i18n import LANGUAGES

from .util import logged

log = logging.getLogger("munim.promo")
ALLOWED_DISCOUNTS = (5, 10)
VALID_DAYS = 7


@logged
def draft_promo(merchant_id, segment, language):
    """One LLM call with a fixed template for the local-language text; discount is 5 or 10 only.

    The English draft is always the fixed template (for the audit log). If the LLM is unavailable or
    returns something that does not mention the discount, the fixed local template is used instead.
    """
    from apps.agents import llm, templates

    discount = 10 if segment.get("avg_monthly_spend", 0) >= 500 else 5
    assert discount in ALLOWED_DISCOUNTS
    name = Merchant.objects.get(pk=merchant_id).name
    drafts = templates.promo_text(discount, name)
    local = drafts.get(language) or drafts["en"]
    try:
        prompt = llm.load_prompt("promo").format(language=LANGUAGES[language].name, merchant=name,
                                                 discount=discount, valid_days=VALID_DAYS, count=segment["count"])
        text = llm.chat([{"role": "user", "content": prompt}]).strip().strip('"')
        if re.search(rf"\b{discount}\b", text) and len(text.split()) <= 40:
            local = text
    except Exception as exc:  # no key, timeout, bad output: the template is fine
        log.info("draft_promo using template (%s)", exc)
    return {"discount_pct": discount, "valid_days": VALID_DAYS, "text_en": drafts["en"], "text_local": local,
            "reach": segment["count"]}
