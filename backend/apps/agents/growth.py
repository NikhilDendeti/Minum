from apps.tools.offers import ensure_promo_offer, set_thread
from apps.tools.segments import segment_customers

from . import templates


def run_growth(state):
    """Lapsed-regulars segment + drafted promo, deterministic. Proposes the promo while it is still undecided."""
    merchant_id, lang = state["merchant_id"], state["language"]
    segment = segment_customers(merchant_id)
    offer = ensure_promo_offer(merchant_id, lang)
    if offer is None:
        answers = templates.answer_other()
        return {"tool_calls": [{"name": "segment_customers", "args": {}, "result": segment}],
                "answer_en": answers["en"], "answer_local": answers[lang]}
    promo = {k: offer.payload[k] for k in ("discount_pct", "valid_days", "text_en", "text_local", "reach")}
    calls = [{"name": "segment_customers", "args": {"rule": "lapsed_regulars"}, "result": segment},
             {"name": "draft_promo", "args": {"language": lang}, "result": promo}]
    if offer.status != "proposed":
        done = templates.confirmation("promo", offer.status == "sent", offer.payload)
        return {"tool_calls": calls, "answer_en": done["en"], "answer_local": done[lang]}
    answers = templates.answer_growth(segment, promo)
    set_thread(offer, state.get("thread_id", ""))
    return {"tool_calls": calls, "answer_en": answers["en"], "answer_local": answers[lang], "proposal_id": offer.id}
