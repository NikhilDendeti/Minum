"""Record the offline fallback clips while online:  python scripts/record_fallbacks.py [--all-languages]

Synthesizes each merchant's briefing and scripted answers with the configured live speech provider and saves
them to assets/fallback/m<merchant>_<name>_<language>.<ext>, which SPEECH_PROVIDER=prerecorded then serves.
By default only each merchant's own language is recorded; --all-languages records every registered language.
--merchants 1,2 limits it to those merchant ids. Everything spoken is also saved in the speech cache, so the live app
replays it for free.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "munim.settings")

import django  # noqa: E402

django.setup()

from django.conf import settings  # noqa: E402

from apps import i18n  # noqa: E402
from apps.agents import briefing, templates  # noqa: E402
from apps.agents.cashflow import run_cashflow  # noqa: E402
from apps.agents.growth import run_growth  # noqa: E402
from apps.agents.insights import scripted_insight  # noqa: E402
from apps.core.models import Merchant  # noqa: E402
from apps.speech import SpeechUnavailable, clip_key, synthesize  # noqa: E402

if settings.SPEECH_PROVIDER == "prerecorded":
    sys.exit("Set SPEECH_PROVIDER to sarvam or openai first; prerecorded cannot record.")

out_dir = settings.ASSETS_DIR / "fallback"
out_dir.mkdir(parents=True, exist_ok=True)


def save(merchant_id, name, text, lang):
    key = clip_key(merchant_id, name, lang)
    try:
        audio, ext = synthesize(text, lang)
    except SpeechUnavailable as exc:
        print(f"FAILED {key}: {exc}")
        return
    (out_dir / f"{key}.{ext}").write_bytes(audio)
    print(f"saved  {key}.{ext}")


only = None
if "--merchants" in sys.argv:  # e.g. --merchants 1,2 records just the demo merchants
    only = {int(x) for x in sys.argv[sys.argv.index("--merchants") + 1].split(",")}

for merchant in Merchant.objects.order_by("id"):
    if only is not None and merchant.id not in only:
        continue
    langs = i18n.codes() if "--all-languages" in sys.argv else [merchant.language]
    for lang in langs:
        mid = merchant.id
        save(mid, "briefing", briefing.build(mid, lang)["text_local"], lang)
        for qid in ("q_settlement", "q_yesterday"):
            _, answers = scripted_insight(mid, qid)
            save(mid, qid, answers[lang], lang)
        state = {"merchant_id": mid, "language": lang, "thread_id": ""}
        save(mid, "q_cash", run_cashflow(state)["answer_local"], lang)
        save(mid, "q_growth", run_growth(state)["answer_local"], lang)
        for kind in ("promo", "credit", "stock"):
            for approved in (True, False):
                words = templates.confirmation(kind, approved, {"reach": 40, "amount": 30000})
                save(mid, f"confirm_{kind}_{'yes' if approved else 'no'}", words[lang], lang)
