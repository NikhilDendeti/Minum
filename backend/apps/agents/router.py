import json
import logging

from . import llm
from .cache import INTENTS, match_scripted

log = logging.getLogger("munim.router")
INTENT_AGENT = {"briefing": "insights", "question": "insights", "forecast": "cashflow", "growth": "growth",
                "approval": "insights", "other": "insights"}


def _keyword_intent(text):
    t = text.lower()
    if any(w in t for w in ("cash", "credit", "loan", "forecast", "balance", "paise", "पैसे", "నగదు")):
        return "forecast"
    if any(w in t for w in ("promo", "offer", "marketing", "come back", "wapas", "वापस", "తిరిగి")):
        return "growth"
    return "question"


def route(transcript):
    """Return {"intent", "agent", "scripted_id"}. Scripted questions never reach the LLM."""
    qid = match_scripted(transcript)
    if qid:
        intent, agent = INTENTS[qid]
        return {"intent": intent, "agent": agent, "scripted_id": qid}
    try:
        reply = llm.chat([{"role": "system", "content": llm.load_prompt("router")},
                          {"role": "user", "content": transcript}], json_mode=True)
        intent = json.loads(reply).get("intent", "question")
    except (llm.LLMUnavailable, ValueError) as exc:
        log.info("router fell back to keywords (%s)", exc)
        intent = _keyword_intent(transcript)
    if intent not in INTENT_AGENT:
        intent = "question"
    return {"intent": intent, "agent": INTENT_AGENT[intent], "scripted_id": None}
