from apps.tools.credit import credit_eligibility
from apps.tools.forecast import forecast
from apps.tools.offers import ensure_credit_offer, set_thread

from . import templates


def run_cashflow(state):
    """Forecast + credit eligibility, deterministic. Proposes the credit offer while it is still undecided."""
    merchant_id = state["merchant_id"]
    offer = ensure_credit_offer(merchant_id)
    credit = offer.payload["amount"] if offer and offer.status == "approved" else 0
    fc = forecast(merchant_id, 14, credit=credit)
    eligibility = credit_eligibility(merchant_id)
    calls = [{"name": "forecast", "args": {"days": 14}, "result": fc},
             {"name": "credit_eligibility", "args": {}, "result": eligibility}]
    pending = offer if offer and offer.status == "proposed" else None
    answers = templates.answer_cash(fc, eligibility if pending else None)
    update = {"tool_calls": calls, "answer_en": answers["en"], "answer_local": answers[state["language"]]}
    if pending:
        set_thread(pending, state.get("thread_id", ""))
        update["proposal_id"] = pending.id
    return update
