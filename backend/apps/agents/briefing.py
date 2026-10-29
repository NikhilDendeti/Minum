"""Daily briefing: computed from kpi_summary, spoken once and cached per merchant and language with its audio."""
import json
import logging
import time
from datetime import timedelta

from django.conf import settings

from apps.speech import SpeechUnavailable, clip_key, synthesize
from apps.tools.forecast import forecast
from apps.tools.kpi import kpi_summary
from apps.tools.offers import ensure_credit_offer
from apps.tools.settlement import explain_settlement

from . import templates

log = logging.getLogger("munim.briefing")
SHORT_SETTLEMENT = 1000  # a settlement this far below gross is worth an alert
RETRY_AUDIO_S = 60


def _folder(merchant_id):
    return settings.MEDIA_ROOT / f"m{merchant_id}"


def _cache_path(merchant_id, lang):
    return _folder(merchant_id) / f"briefing_{lang}.json"


def build(merchant_id, lang):
    day = settings.DEMO_TODAY - timedelta(days=1)
    k = kpi_summary(merchant_id, day)
    yesterday = templates.answer_yesterday(k)
    settlement = explain_settlement(merchant_id)
    short = None if "error" in settlement or settlement["shortfall"] < SHORT_SETTLEMENT else templates.alert_settlement(settlement)
    # the spoken briefing is yesterday's numbers plus one alert (the short settlement)
    text = {code: yesterday[code] + (" " + short[code] if short else "") for code in yesterday}
    return {
        "date": settings.DEMO_TODAY.isoformat(),
        "language": lang,
        "text_local": text[lang],
        "text_en": text["en"],
        "kpis": {"yesterday": k["earned"], "baseline": k["baseline_4wk_same_weekday"], "delta_pct": k["delta_pct"],
                 "slow_window": k["slow_window"], "repeat_share_pct": k["repeat_share_pct"],
                 "lapsed_regulars": k["lapsed_regulars"]},
    }


def generate(merchant_id, lang):
    """Build the briefing, synthesise its audio (best effort) and cache both under MEDIA_ROOT/m<id>/."""
    data = build(merchant_id, lang)
    folder = _folder(merchant_id)
    folder.mkdir(parents=True, exist_ok=True)
    data["audio_url"] = None
    data["generated_at"] = time.time()
    try:
        audio, ext = synthesize(data["text_local"], lang, key=clip_key(merchant_id, "briefing", lang))
        path = folder / f"briefing_{lang}.{ext}"
        path.write_bytes(audio)
        data["audio_url"] = f"/media/m{merchant_id}/{path.name}?v={int(path.stat().st_mtime)}"
    except SpeechUnavailable as exc:
        log.warning("briefing audio unavailable (%s); text only", exc)
    _cache_path(merchant_id, lang).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def get(merchant_id, lang):
    """Cached briefing, plus live alerts (so offer ids and statuses are never stale)."""
    path = _cache_path(merchant_id, lang)
    data = None
    if path.exists():
        cached = json.loads(path.read_text(encoding="utf-8"))
        fresh = cached.get("date") == settings.DEMO_TODAY.isoformat()
        # a text-only cache (speech was unavailable) is retried at most once a minute
        stale_silent = not cached.get("audio_url") and time.time() - cached.get("generated_at", 0) > RETRY_AUDIO_S
        if fresh and not stale_silent:
            data = cached
    if data is None:
        data = generate(merchant_id, lang)
    return {**data, "alerts": alerts(merchant_id, lang)}


def alerts(merchant_id, lang):
    out = []
    settlement = explain_settlement(merchant_id)
    if "error" not in settlement and settlement["shortfall"] >= SHORT_SETTLEMENT:
        out.append({"type": "settlement_short", "offer_id": None, "text_local": templates.alert_settlement(settlement)[lang]})
    offer = ensure_credit_offer(merchant_id)
    if offer and offer.status == "proposed":
        gap = forecast(merchant_id, 14)["gap"]
        if gap:
            out.append({"type": "cash_gap", "offer_id": offer.id,
                        "text_local": templates.alert_cash(gap, offer.payload["amount"])[lang]})
    return out
