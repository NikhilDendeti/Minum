from apps import i18n
from apps.agents import templates
from apps.tools.util import jsonable


def serialize_offer(offer, lang=i18n.DEFAULT):
    """Offer for the UI, with `payload.text_local` resolved to the viewer's language."""
    if offer is None:
        return None
    payload = {k: v for k, v in offer.payload.items() if k not in ("thread_id", "text_by_lang")}
    payload["text_local"] = templates.text_for(offer.payload, lang)
    return jsonable({"id": offer.id, "type": offer.type, "status": offer.status, "payload": payload,
                     "decided_at": offer.decided_at, "decided_via": offer.decided_via})


def serialize_conversation(c):
    return jsonable({"id": c.id, "ts": c.ts, "transcript": c.transcript, "language": c.language, "intent": c.intent,
                     "agent": c.agent, "sql": c.sql, "rows": c.rows, "answer_en": c.answer_en,
                     "answer_local": c.answer_local, "latency_ms": c.latency_ms})


def serialize_merchant(m):
    return {"id": m.id, "name": m.name, "category": m.category, "city": m.city, "language": m.language,
            "phone": f"{m.phone[:2]}******{m.phone[-2:]}", "languages": i18n.profile()}
