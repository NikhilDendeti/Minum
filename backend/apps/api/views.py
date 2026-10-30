import logging
import time

from django.conf import settings
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps import i18n
from apps.agents import ask as ask_mod
from apps.agents import briefing as briefing_mod
from apps.agents import cache as scripted
from apps.agents import lang as lang_mod
from apps.agents import llm, templates, voice_words
from apps.agents.decide import decide_offer
from apps.core import seeding
from apps.core.models import Conversation, Merchant, Offer
from apps.speech import SpeechUnavailable, clip_key, synthesize, transcribe
from apps.tools.forecast import forecast
from apps.tools.offers import ensure_credit_offer, ensure_promo_offer, ensure_stock_offer
from apps.tools.segments import segment_customers

from . import auth
from .serializers import serialize_conversation, serialize_merchant, serialize_offer

log = logging.getLogger("munim.api")
MAX_AUDIO_BYTES = 5 * 1024 * 1024
MAX_MESSAGE_CHARS = 300
SESSION_DAYS = 7


def fail(status, code, message, lang=i18n.DEFAULT):
    return Response({"error": {"code": code, "message": message, "message_local": templates.error_text(code, lang)}},
                    status=status)


def _merchant(request):
    """The logged-in merchant (cached for the request). Every query below is scoped to this id."""
    if not hasattr(request, "_merchant"):
        request._merchant = Merchant.objects.get(pk=request.user.merchant_id)
    return request._merchant


def _speak(text, lang, conversation, key=None):
    """Synthesize and store the reply audio; a missing speech provider is not an error (text still shows)."""
    try:
        audio, ext = synthesize(text, lang, key=key)
    except SpeechUnavailable as exc:
        log.warning("no audio for conversation %s: %s", conversation.id, exc)
        return None
    folder = settings.MEDIA_ROOT / f"m{conversation.merchant_id}" / "answers"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{conversation.id}.{ext}").write_bytes(audio)
    return f"/media/m{conversation.merchant_id}/answers/{conversation.id}.{ext}"


def _confirm_key(offer, lang):
    return clip_key(offer.merchant_id, f"confirm_{offer.type}_{'yes' if offer.status in ('approved', 'sent') else 'no'}", lang)


def _ms(t0):
    return int((time.time() - t0) * 1000)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """For the hosting platform's health check: the process is up and the database answers."""
    from django.db import connection

    with connection.cursor() as cur:
        cur.execute("SELECT 1")
    return Response({"ok": True})


# --- auth (no session needed) ---------------------------------------------------------------------------------------

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def demo_accounts(request):
    """Accounts offered as one-tap logins on the demo login screen (DEMO_MODE only)."""
    if not settings.DEMO_MODE:
        return Response([])
    return Response([{"phone": m.phone, "name": m.name, "city": m.city, "language": m.language}
                     for m in Merchant.objects.order_by("id")])


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def request_otp(request):
    phone = auth.normalise_phone(request.data.get("phone"))
    if not phone:
        return fail(400, "bad_request", "Enter a 10-digit mobile number.")
    try:
        return Response(auth.issue_otp(phone))
    except auth.OtpError as exc:
        return fail(exc.status, exc.code, "Too many codes requested.")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def verify(request):
    phone = auth.normalise_phone(request.data.get("phone"))
    try:
        merchant = auth.verify_otp(phone, request.data.get("otp"))
    except auth.OtpError as exc:
        return fail(exc.status, exc.code, "Login code rejected.")
    request.session.flush()  # new session id on login
    request.session["merchant_id"] = merchant.id
    request.session.set_expiry(SESSION_DAYS * 24 * 3600)
    get_token(request)  # makes Django set the csrftoken cookie for the frontend
    return Response(serialize_merchant(merchant))


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def logout(request):
    request.session.flush()
    return Response({"ok": True})


@api_view(["GET", "PATCH"])
def me(request):
    merchant = _merchant(request)
    if request.method == "PATCH":
        language = request.data.get("language")
        if not i18n.is_supported(language):
            return fail(400, "bad_request", f"Unsupported language: {language!r}", merchant.language)
        merchant.language = language
        merchant.save(update_fields=["language"])
    get_token(request)
    return Response(serialize_merchant(merchant))


# --- the app --------------------------------------------------------------------------------------------------------

@api_view(["GET"])
def briefing(request):
    merchant = _merchant(request)
    lang = lang_mod.normalise(request.query_params.get("language"), merchant.language)
    return Response(briefing_mod.get(merchant.id, lang))


@api_view(["POST"])
def ask(request):
    merchant = _merchant(request)
    audio = request.FILES.get("audio")
    text = (request.data.get("text") or "").strip()
    hint = request.data.get("language") or "auto"
    latency = {"stt": 0, "agent": 0, "tts": 0}

    if audio:
        if audio.size > MAX_AUDIO_BYTES:
            return fail(413, "audio_too_large", "Audio is too long; keep it under 20 seconds.", merchant.language)
        t0 = time.time()
        try:
            heard = transcribe(audio.read(), audio.content_type, hint if i18n.is_supported(hint) else None)
        except SpeechUnavailable as exc:
            return fail(503, "stt_unavailable", str(exc), merchant.language)
        latency["stt"] = _ms(t0)
        transcript, hint = heard["text"], heard.get("language")
    else:
        transcript = text
    if not transcript:
        return fail(422, "no_speech", "I could not hear any speech.", merchant.language)
    lang = lang_mod.detect(transcript, hint if i18n.is_supported(hint) else None, merchant.language)

    # a bare "yes"/"no" while a proposal is waiting is an approval, not a new question
    # (only proposals made in a spoken/typed turn count; the cards on the Cash and Grow tabs are decided there)
    waiting = next((o for o in Offer.objects.filter(merchant_id=merchant.id, status="proposed").order_by("-id")
                    if str(o.payload.get("thread_id", "")).startswith("ask-")), None)
    verdict = voice_words.match_decision(transcript)
    if waiting and verdict and len(voice_words.tokens(transcript)) <= 4:
        return _ask_approval(merchant, waiting, verdict, transcript, lang, latency)

    t0 = time.time()
    try:
        values = ask_mod.run_turn(merchant.id, transcript, lang)
    except llm.LLMUnavailable as exc:
        if exc.timeout:
            return fail(504, "llm_timeout", str(exc), lang)
        return fail(503, "llm_unavailable", str(exc), lang)
    latency["agent"] = _ms(t0)

    evidence = ask_mod.build_evidence(merchant.id, values)
    conversation = Conversation.objects.create(
        merchant_id=merchant.id, transcript=transcript, language=lang, intent=values.get("intent", ""),
        agent=values.get("agent", ""), sql=evidence["sql"], rows=evidence["rows"],
        answer_en=values.get("answer_en", ""), answer_local=values.get("answer_local", ""))
    qid = values.get("scripted_id")
    t0 = time.time()
    audio_url = _speak(conversation.answer_local, lang, conversation, key=clip_key(merchant.id, qid, lang) if qid else None)
    latency["tts"] = _ms(t0)
    conversation.latency_ms = latency
    conversation.save(update_fields=["latency_ms"])

    proposal = Offer.objects.filter(pk=values["proposal_id"], merchant_id=merchant.id).first() if values.get("proposal_id") else None
    return Response({
        "conversation_id": conversation.id, "transcript": transcript, "language": lang,
        "intent": conversation.intent, "agent": conversation.agent,
        "answer_local": conversation.answer_local, "answer_en": conversation.answer_en, "audio_url": audio_url,
        "evidence": evidence, "proposal": serialize_offer(proposal, lang), "latency_ms": latency,
    })


def _ask_approval(merchant, offer, verdict, transcript, lang, latency):
    values = decide_offer(offer, verdict == "approve", via="voice", transcript=transcript, language=lang)
    offer.refresh_from_db()
    conversation = Conversation.objects.create(
        merchant_id=merchant.id, transcript=transcript, language=lang, intent="approval", agent="executor",
        answer_en=values["confirmation_en"], answer_local=values["confirmation_local"], latency_ms=latency)
    audio_url = _speak(conversation.answer_local, lang, conversation, key=_confirm_key(offer, lang))
    return Response({
        "conversation_id": conversation.id, "transcript": transcript, "language": lang, "intent": "approval",
        "agent": "executor", "answer_local": conversation.answer_local, "answer_en": conversation.answer_en,
        "audio_url": audio_url, "evidence": {"sql": "", "rows": [], "tool": None},
        "proposal": serialize_offer(offer, lang), "latency_ms": latency})


@api_view(["GET"])
def forecast_view(request):
    merchant = _merchant(request)
    offer = ensure_credit_offer(merchant.id)
    credit = offer.payload["amount"] if offer and offer.status == "approved" else 0
    fc = forecast(merchant.id, 14, credit=credit)
    return Response({"as_of": fc["as_of"], "days": fc["days"], "gap": fc["gap"], "obligations": fc["obligations"],
                     "credit_applied": credit, "offer": serialize_offer(offer, merchant.language)})


@api_view(["GET"])
def growth_view(request):
    merchant = _merchant(request)
    segment = segment_customers(merchant.id)
    offer = ensure_promo_offer(merchant.id, merchant.language)
    return Response({
        "segment": {k: segment[k] for k in ("name", "rule", "count", "avg_monthly_spend")},
        "offer": serialize_offer(offer, merchant.language),
        "stock": serialize_offer(ensure_stock_offer(merchant.id), merchant.language)})


@api_view(["POST"])
def decide(request, offer_id):
    merchant = _merchant(request)
    offer = get_object_or_404(Offer, pk=offer_id, merchant_id=merchant.id)  # another merchant's offer is a 404
    via = request.data.get("via") or "tap"
    transcript = (request.data.get("transcript") or "").strip()
    lang = merchant.language

    audio = request.FILES.get("audio") or request.FILES.get("transcript_audio")
    if audio:
        via = "voice"
        try:
            transcript = transcribe(audio.read(), audio.content_type, lang)["text"]
        except SpeechUnavailable as exc:
            return fail(503, "stt_unavailable", str(exc), lang)
    if via == "voice":
        lang = lang_mod.detect(transcript, None, lang)
        verdict = voice_words.match_decision(transcript)
        if verdict is None:
            return fail(422, "undecided", f"Could not tell yes from no in: {transcript!r}", lang)
        decision = verdict
    else:
        decision = request.data.get("decision")
        if decision not in ("approve", "reject"):
            return fail(400, "bad_decision", "decision must be 'approve' or 'reject'", lang)

    if offer.status == "proposed":
        # the merchant may have reworded a promo before approving it: keep the wording that was actually approved
        message = (request.data.get("message") or "").strip()[:MAX_MESSAGE_CHARS]
        if message and offer.type == "promo" and decision == "approve":
            by_lang = {**offer.payload.get("text_by_lang", {}), merchant.language: message}
            offer.payload = {**offer.payload, "text_by_lang": by_lang}
            offer.save(update_fields=["payload"])
        values = decide_offer(offer, decision == "approve", via=via, transcript=transcript, language=lang)
        offer.refresh_from_db()
        words_en, words_local = values["confirmation_en"], values["confirmation_local"]
    else:  # already decided: report the current state instead of acting twice
        words = templates.confirmation(offer.type, offer.status in ("approved", "sent"), offer.payload)
        words_en, words_local = words["en"], words[lang]

    conversation = Conversation.objects.create(
        merchant_id=merchant.id, transcript=transcript or f"[{via}] {decision}", language=lang,
        intent="approval", agent="executor", answer_en=words_en, answer_local=words_local)
    audio_url = _speak(words_local, lang, conversation, key=_confirm_key(offer, lang))
    return Response({
        "id": offer.id, "status": offer.status, "decided_at": offer.decided_at or timezone.now(),
        "decided_via": offer.decided_via, "confirmation_local": words_local, "confirmation_en": words_en,
        "audio_url": audio_url, "simulated": True, "transcript": transcript})


@api_view(["GET"])
def conversation(request, conversation_id):
    merchant = _merchant(request)
    return Response(serialize_conversation(get_object_or_404(Conversation, pk=conversation_id, merchant_id=merchant.id)))


@api_view(["GET"])
def suggestions(request):
    """Example questions per scripted intent; the UI shows them as buttons (and uses them when speech is offline)."""
    merchant = _merchant(request)
    lang = lang_mod.normalise(request.query_params.get("language"), merchant.language)
    return Response([{"id": qid, "text": text} for qid, text in scripted.examples(lang).items()])


@api_view(["POST"])
def reset(request):
    merchant = _merchant(request)
    if not settings.DEMO_MODE:
        return fail(403, "forbidden", "Reset is only available when DEMO_MODE=true.", merchant.language)
    result = seeding.run()
    # only the caller's briefing is rebuilt now (keeps reset near 10 s); other merchants' are built on first use
    me_now = Merchant.objects.get(pk=merchant.id)
    briefing_mod.generate(me_now.id, me_now.language)
    return Response({"seeded": True, "seconds": result["seconds"], "stories": result["stories"]})
