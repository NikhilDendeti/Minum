"""Fixed wording for the scripted answers, briefing, offers and confirmations.

The sentences live in the language catalogs (apps/i18n/locales/*.json); this module only decides which numbers
go into them. Each builder returns {language code: text}, plus an "en" alias for the English draft that is
stored with every turn. Numbers are always digits taken from tool results; spoken number words are produced
later by apps.speech.numbers (never by a model).
Telugu and Hindi strings should be reviewed by a native speaker before the pitch.
"""
from datetime import date

from apps import i18n
from apps.tools.util import fmt_inr


def all_langs():
    return i18n.codes()


def _all(builder):
    out = {code: builder(code) for code in i18n.codes()}
    out["en"] = out[i18n.DEFAULT]  # the English draft, whatever languages are registered
    return out


def date_label(iso, lang):
    d = date.fromisoformat(str(iso))
    return i18n.t("date_label", lang, day=d.day, month=i18n.months(lang)[d.month - 1])


def pct(x):
    x = abs(float(x))
    return str(int(x)) if x == int(x) else f"{x:.1f}"


def slow_phrase(k, lang):
    """'evenings 6-9 pm' / 'शाम 6 से 9 बजे' / 'సాయంత్రం 6 నుండి 9 వరకు'."""
    a, b = (int(x[:2]) for x in k["slow_window"].split("-"))
    kind = "evening" if a >= 16 else "midday" if a >= 11 else "morning"
    return i18n.t("slow_phrase", lang, period=i18n.t(f"period_{kind}", lang), label=k["slow_window_label"],
                  a=a % 12 or 12, b=b % 12 or 12)


# --- answers ------------------------------------------------------------------------------------------------------

def answer_settlement(r):
    return _all(lambda lang: i18n.t(
        "settlement", lang, date=date_label(r["date"], lang), shortfall=fmt_inr(r["shortfall"]),
        refunds=fmt_inr(r["refunds"]), mdr=fmt_inr(r["mdr_fee"]), n=r["refund_count"]))


def answer_yesterday(k):
    def build(lang):
        word = i18n.t("word_lower" if k["delta_pct"] < 0 else "word_higher", lang)
        return i18n.t("yesterday", lang, earned=fmt_inr(k["earned"]), d=pct(k["delta_pct"]), word=word,
                      wd=i18n.weekdays(lang)[k["weekday"]], slow=slow_phrase(k, lang), lapsed=k["lapsed_regulars"])
    return _all(build)


def answer_cash(fc, offer):
    gap = fc.get("gap")

    def build(lang):
        if not gap:
            return i18n.t("cash_none", lang)
        driver = gap["driver"] or {"amount": 0, "due_on": gap["first_negative_date"]}
        v = dict(gap=date_label(gap["first_negative_date"], lang), name=gap["driver_name"], amt=fmt_inr(driver["amount"]),
                 due=date_label(driver["due_on"], lang), short=fmt_inr(gap["shortfall"]),
                 offer=fmt_inr(offer["amount"]) if offer else "0", tenure=offer["tenure_days"] if offer else 0)
        return i18n.t("cash_body", lang, **v) + (i18n.t("cash_tail", lang, **v) if offer else "")
    return _all(build)


def answer_growth(seg, promo):
    return _all(lambda lang: i18n.t("growth", lang, count=seg["count"], avg=fmt_inr(seg["avg_monthly_spend"]),
                                    disc=promo["discount_pct"], days=promo["valid_days"]))


def answer_other():
    return _all(lambda lang: i18n.t("other", lang))


# --- offers and confirmations ---------------------------------------------------------------------------------------

def promo_text(discount, merchant_name):
    return _all(lambda lang: i18n.t("promo", lang, merchant=merchant_name, discount=discount))


def credit_offer_text(amount, tenure):
    return _all(lambda lang: i18n.t("credit_offer", lang, amount=fmt_inr(amount), tenure=tenure))


def stock_text(day):
    return _all(lambda lang: i18n.t("stock_offer", lang, wd=i18n.weekdays(lang)[date.fromisoformat(day["date"]).weekday()],
                                    date=date_label(day["date"], lang), pct=round(day["uplift_pct"])))


def confirmation(offer_type, approved, payload):
    def build(lang):
        if not approved:
            return i18n.t("confirm_no", lang)
        if offer_type == "stock":
            return i18n.t("confirm_stock", lang)
        if offer_type == "credit":
            return i18n.t("confirm_credit", lang, amount=fmt_inr(payload.get("amount", 0)))
        return i18n.t("confirm_promo", lang, n=payload.get("reach", 0))
    return _all(build)


# --- briefing alerts and user-facing errors -------------------------------------------------------------------------

def alert_settlement(r):
    return _all(lambda lang: i18n.t("alert_settlement", lang, date=date_label(r["date"], lang),
                                    shortfall=fmt_inr(r["shortfall"])))


def alert_cash(gap, offer_amount):
    return _all(lambda lang: i18n.t("alert_cash", lang, date=date_label(gap["first_negative_date"], lang),
                                    amount=fmt_inr(offer_amount)))


def error_text(code, lang):
    try:
        return i18n.t(f"err_{code}", lang)
    except KeyError:
        return i18n.t("err_server_error", lang)


def text_for(offer_payload, lang):
    """Offer text in the viewer's language (offers store every language's wording)."""
    by_lang = offer_payload.get("text_by_lang") or {}
    return by_lang.get(lang) or by_lang.get(i18n.DEFAULT) or offer_payload.get("text_local", "")
