"""Backend tests. They seed the test database once (the same logic as seed_demo) and run entirely offline:
scripted questions never call an LLM, and no speech provider is needed."""
import tempfile
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.signals import request_finished
from django.db import close_old_connections, connection
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps import i18n
from apps.agents import grounding, llm, voice_words
from apps.agents.ask import build_evidence, run_turn
from apps.agents.cache import INTENTS, MATCH_ORDER, match_scripted
from apps.agents.cashflow import run_cashflow
from apps.agents.growth import run_growth
from apps.agents.insights import scripted_insight
from apps.core import seeding
from apps.speech.numbers import hindi_words, speak_numbers
from apps.tools import sql
from apps.tools.credit import credit_eligibility
from apps.tools.forecast import forecast
from apps.tools.kpi import kpi_summary
from apps.tools.settlement import explain_settlement
from apps.tools.util import fmt_inr

LAKSHMI, SHARMA = "9876500001", "9876500002"


def login(phone):
    client = APIClient()
    code = client.post("/api/auth/request-otp", {"phone": phone}, format="json").json()["dev_otp"]
    response = client.post("/api/auth/verify", {"phone": phone, "otp": code}, format="json")
    assert response.status_code == 200, response.content
    return client


OFFLINE = dict(SARVAM_API_KEY="", OPENAI_API_KEY="")  # tests never call a paid API


@override_settings(READONLY_ALIAS="default", **OFFLINE)
class MunimTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.seed = seeding.run()

    # --- data and tools ---------------------------------------------------------------------------------------
    def test_seed_plants_five_stories_and_a_second_merchant(self):
        self.assertEqual(len([l for l in self.seed["stories"] if l.startswith("Story")]), 5)
        self.assertTrue(any(l.startswith("Merchant 2") for l in self.seed["stories"]))

    def test_settlement_story(self):
        r = explain_settlement(1)
        self.assertEqual((r["shortfall"], r["refunds"], r["mdr_fee"], r["refund_count"]), (1420, 890, 530, 2))
        self.assertIn("2026-11-09", r["evidence"]["sql"])

    def test_yesterday_story(self):
        k = kpi_summary(1, settings.DEMO_TODAY - timedelta(days=1))
        self.assertEqual((k["earned"], k["baseline_4wk_same_weekday"], k["delta_pct"]), (8200, 9320, -12.0))
        self.assertEqual(k["slow_window"], "18:00-21:00")
        self.assertEqual(k["lapsed_regulars"], 40)

    def test_forecast_gap_and_credit(self):
        fc = forecast(1, 14)
        self.assertEqual(len(fc["days"]), 14)
        self.assertEqual(fc["gap"]["first_negative_date"], str(settings.DEMO_TODAY + timedelta(days=7)))
        self.assertEqual(fc["gap"]["min_balance"], -12800)
        offer = credit_eligibility(1)
        self.assertEqual((offer["eligible"], offer["amount"], offer["tenure_days"]), (True, 30000, 30))
        self.assertIsNone(forecast(1, 14, credit=offer["amount"])["gap"])

    def test_second_merchant_has_its_own_numbers(self):
        k1 = kpi_summary(1, settings.DEMO_TODAY - timedelta(days=1))
        k2 = kpi_summary(2, settings.DEMO_TODAY - timedelta(days=1))
        self.assertNotEqual(k1["earned"], k2["earned"])
        self.assertIsNone(forecast(2, 14)["gap"])

    # --- run_sql guard ----------------------------------------------------------------------------------------
    def test_run_sql_accepts_select(self):
        out = sql.run_sql(1, "SELECT COUNT(*) AS n FROM customers WHERE visit_count >= 5")
        self.assertEqual(out["row_count"], 1)

    def test_run_sql_rejects_everything_else(self):
        for bad in ("DROP TABLE offers", "SELECT 1; SELECT 2", "UPDATE offers SET status='sent'", "SELECT 1 -- x",
                    "WITH x AS (DELETE FROM offers RETURNING *) SELECT * FROM x", "", "SELECT * INTO t FROM offers",
                    "SELECT current_setting('app.merchant_id')"):
            with self.assertRaises(sql.SqlRejected, msg=bad):
                sql.run_sql(1, bad)

    def test_run_sql_caps_rows(self):
        out = sql.run_sql(1, "SELECT id FROM transactions")
        self.assertEqual((out["row_count"], out["truncated"]), (50, True))

    def test_row_level_security_fences_the_read_only_role(self):
        """The read-only role sees only the merchant named in app.merchant_id (and nothing when it is unset)."""
        with connection.cursor() as cur:
            cur.execute("SET LOCAL ROLE munim_ro")
            cur.execute("SELECT set_config('app.merchant_id', '2', true)")
            cur.execute("SELECT count(*) FROM transactions WHERE merchant_id = 1")
            self.assertEqual(cur.fetchone()[0], 0, "merchant 2 must not see merchant 1's transactions")
            cur.execute("SELECT count(*) FROM transactions")
            own = cur.fetchone()[0]
            self.assertGreater(own, 5000)
            cur.execute("SELECT count(*) FROM merchants")
            self.assertEqual(cur.fetchone()[0], 1)
            cur.execute("SELECT set_config('app.merchant_id', '', true)")
            cur.execute("SELECT count(*) FROM settlements")
            self.assertEqual(cur.fetchone()[0], 0, "no merchant set means no rows")
            cur.execute("RESET ROLE")

    # --- voice words (R8) ------------------------------------------------------------------------------------
    def test_voice_words(self):
        yes = ["avunu", "Haan!", "haan ji", "ok", "theek hai", "yes", "sari", "हाँ", "అవును", "సరే", "ठीक है"]
        no = ["nahi", "Nahin.", "kaadu", "no", "ledu", "mat karo", "नहीं", "కాదు", "లేదు", "nahi nahi"]
        for t in yes:
            self.assertEqual(voice_words.match_decision(t), "approve", t)
        for t in no:
            self.assertEqual(voice_words.match_decision(t), "reject", t)
        self.assertIsNone(voice_words.match_decision("mera settlement kam kyun aaya"))
        self.assertIsNone(voice_words.match_decision(""))

    # --- scripted questions + grounding (F6) -----------------------------------------------------------------
    def test_scripted_phrasings_match_in_every_language(self):
        for lang in i18n.LANGUAGES.values():
            for qid, example in lang.examples.items():
                self.assertEqual(match_scripted(example), qid, f"{lang.code}: {example}")
            for qid, extra in lang.phrasings.items():
                for text in extra:
                    self.assertEqual(match_scripted(text), qid, f"{lang.code}: {text}")
        self.assertIsNone(match_scripted("what is the weather"))

    def test_scripted_answers_are_grounded_in_every_language(self):
        for qid in ("q_settlement", "q_yesterday"):
            calls, answers = scripted_insight(1, qid)
            self.assertEqual(grounding.ungrounded(answers["en"], calls), [], answers["en"])
            for code in i18n.codes():
                self.assertEqual(sorted(grounding.numbers_in(answers[code], strip_dates=False)),
                                 sorted(grounding.numbers_in(answers["en"], strip_dates=False)),
                                 f"{code} changed a number in {qid}")
        for run in (run_cashflow, run_growth):
            for lang in i18n.codes():
                update = run({"merchant_id": 1, "language": lang, "thread_id": "t"})
                self.assertEqual(grounding.ungrounded(update["answer_en"], update["tool_calls"]), [], update["answer_en"])

    def test_grounding_catches_invented_numbers(self):
        calls = [{"name": "x", "args": {}, "result": {"earned": 8200}}]
        self.assertEqual(grounding.ungrounded("You earned Rs 8,200.", calls), [])
        self.assertEqual(grounding.ungrounded("You earned Rs 9,100.", calls), [9100.0])

    def test_graph_answers_settlement_question(self):
        values = run_turn(1, "Mera settlement kam kyun aaya?", "hi-IN")
        self.assertIn("1,420", values["answer_en"])
        evidence = build_evidence(1, values)
        self.assertIn("FROM settlements", evidence["sql"])
        self.assertEqual(evidence["rows"][0]["shortfall"], 1420)

    # --- language catalogs ---------------------------------------------------------------------------------------
    def test_catalogs_are_complete(self):
        english = set(i18n.LANGUAGES[i18n.DEFAULT].strings)
        for lang in i18n.LANGUAGES.values():
            self.assertEqual(set(lang.strings), english, f"{lang.code} strings differ from English")
            self.assertEqual(set(lang.examples), set(MATCH_ORDER), lang.code)
            self.assertEqual(len(lang.months), 12, lang.code)
            self.assertEqual(len(lang.weekdays), 7, lang.code)
            self.assertTrue(lang.yes and lang.no, lang.code)
        self.assertEqual(set(INTENTS), set(MATCH_ORDER))

    def test_language_detection_follows_the_speaker(self):
        from apps.agents import lang as lang_mod

        self.assertEqual(lang_mod.detect("మా సెటిల్మెంట్", None, "hi-IN"), "te-IN")
        self.assertEqual(lang_mod.detect("मेरा सेटलमेंट", None, "te-IN"), "hi-IN")
        self.assertEqual(lang_mod.detect("hello", None, "hi-IN"), "hi-IN")
        self.assertEqual(lang_mod.detect("hello", "te-IN", "hi-IN"), "te-IN")

    # --- formatting ----------------------------------------------------------------------------------------------
    def test_number_words(self):
        self.assertEqual(hindi_words(8200), "आठ हज़ार दो सौ")
        self.assertEqual(speak_numbers("1,420 रुपये", "hi-IN"), "एक हज़ार चार सौ बीस रुपये")
        self.assertEqual(speak_numbers("Rs 1,420", "te-IN"), "Rs 1420")
        self.assertEqual(fmt_inr(1234567), "12,34,567")


@override_settings(READONLY_ALIAS="default", DEMO_MODE=True, **OFFLINE)
class AuthAndTenancyTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seeding.run()

    def test_unauthenticated_requests_are_rejected(self):
        client = APIClient()
        for method, path in (("get", "/api/briefing"), ("get", "/api/forecast"), ("get", "/api/growth"), ("get", "/api/me"),
                             ("post", "/api/ask"), ("get", "/api/suggestions"), ("post", "/api/reset"),
                             ("post", "/api/offers/1/decide"), ("get", "/api/conversations/1")):
            r = getattr(client, method)(path)
            self.assertEqual(r.status_code, 401, path)
            self.assertEqual(r.json()["error"]["code"], "unauthenticated")

    def test_otp_login_and_logout(self):
        client = APIClient()
        r = client.post("/api/auth/request-otp", {"phone": "98765 00001"}, format="json")
        self.assertEqual(r.status_code, 200)
        r = client.post("/api/auth/verify", {"phone": LAKSHMI, "otp": r.json()["dev_otp"]}, format="json")
        self.assertEqual(r.json()["name"], "Lakshmi Kirana")
        self.assertEqual(client.get("/api/me").json()["phone"], "98******01")
        client.post("/api/auth/logout")
        self.assertEqual(client.get("/api/me").status_code, 401)

    def test_wrong_code_locks_after_five_tries(self):
        client = APIClient()
        client.post("/api/auth/request-otp", {"phone": LAKSHMI}, format="json")
        for _ in range(5):
            r = client.post("/api/auth/verify", {"phone": LAKSHMI, "otp": "000000"}, format="json")
            self.assertEqual((r.status_code, r.json()["error"]["code"]), (400, "invalid_otp"))
        r = client.post("/api/auth/verify", {"phone": LAKSHMI, "otp": settings.DEMO_OTP}, format="json")
        self.assertEqual((r.status_code, r.json()["error"]["code"]), (429, "too_many_attempts"))

    def test_code_is_single_use_and_unknown_numbers_look_the_same(self):
        client = APIClient()
        code = client.post("/api/auth/request-otp", {"phone": LAKSHMI}, format="json").json()["dev_otp"]
        self.assertEqual(client.post("/api/auth/verify", {"phone": LAKSHMI, "otp": code}, format="json").status_code, 200)
        self.assertEqual(client.post("/api/auth/verify", {"phone": LAKSHMI, "otp": code}, format="json").status_code, 400)
        r = client.post("/api/auth/request-otp", {"phone": "9000000000"}, format="json")
        self.assertEqual((r.status_code, r.json()), (200, {"sent": True}))
        self.assertEqual(client.post("/api/auth/verify", {"phone": "9000000000", "otp": "123456"}, format="json").status_code, 400)

    def test_code_requests_are_rate_limited(self):
        client = APIClient()
        codes = [client.post("/api/auth/request-otp", {"phone": SHARMA}, format="json").status_code for _ in range(7)]
        self.assertEqual(codes[:5], [200] * 5)
        self.assertEqual(codes[5:], [429, 429])

    def test_merchants_cannot_see_each_others_data(self):
        lakshmi, sharma = login(LAKSHMI), login(SHARMA)
        offer = lakshmi.get("/api/growth").json()["offer"]
        turn = lakshmi.post("/api/ask", {"text": "Kal kitna hua?"}, format="multipart").json()

        self.assertEqual(sharma.post(f"/api/offers/{offer['id']}/decide", {"decision": "approve", "via": "tap"}, format="json").status_code, 404)
        self.assertEqual(sharma.get(f"/api/conversations/{turn['conversation_id']}").status_code, 404)
        self.assertEqual(lakshmi.get("/api/growth").json()["offer"]["status"], "proposed")  # untouched
        self.assertIn("8,200", turn["answer_en"])
        mine = sharma.post("/api/ask", {"text": "Kal kitna hua?"}, format="multipart").json()
        self.assertNotIn("8,200", mine["answer_en"])
        self.assertEqual(sharma.get("/api/forecast").json()["gap"], None)

    def test_media_is_served_only_to_its_owner(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "m1").mkdir()
            (Path(tmp) / "m1" / "clip.wav").write_bytes(b"RIFF")
            def status(client):
                # Closing a streamed file response fires request_finished -> close_old_connections, which would
                # close the test's database connection; detach that handler while we release the file handle.
                response = client.get("/media/m1/clip.wav")
                request_finished.disconnect(close_old_connections)
                try:
                    response.close()  # Windows cannot delete a temp dir while the file is open
                finally:
                    request_finished.connect(close_old_connections)
                return response.status_code

            with override_settings(MEDIA_ROOT=Path(tmp)):
                self.assertEqual(status(login(LAKSHMI)), 200)
                self.assertEqual(status(login(SHARMA)), 404)
                self.assertEqual(status(APIClient()), 404)

    def test_llm_failures_use_the_documented_error_codes(self):
        import httpx
        from unittest import mock

        from openai import APITimeoutError

        client = login(LAKSHMI)
        free_form = {"text": "Which hour has the most sales?"}
        # no key: 503 llm_unavailable, scripted questions still work
        r = client.post("/api/ask", free_form, format="multipart")
        self.assertEqual((r.status_code, r.json()["error"]["code"]), (503, "llm_unavailable"))
        self.assertEqual(client.post("/api/ask", {"text": "Kal kitna hua?"}, format="multipart").status_code, 200)
        # a timed-out model call: 504 llm_timeout, with a message in the merchant's language
        fake = mock.MagicMock()
        fake.chat.completions.create.side_effect = APITimeoutError(request=httpx.Request("POST", "https://api.openai.com"))
        with override_settings(OPENAI_API_KEY="test"), mock.patch("apps.agents.llm.OpenAI", return_value=fake):
            r = client.post("/api/ask", free_form, format="multipart")
        self.assertEqual((r.status_code, r.json()["error"]["code"]), (504, "llm_timeout"))
        self.assertEqual(fake.chat.completions.create.call_count, 2, "primary model, then one retry on the fallback")
        # circuit breaker: the next question fails at once instead of waiting through more timeouts
        with override_settings(OPENAI_API_KEY="test"), mock.patch("apps.agents.llm.OpenAI", return_value=fake):
            r = client.post("/api/ask", free_form, format="multipart")
        self.assertEqual(r.status_code, 504)
        self.assertEqual(fake.chat.completions.create.call_count, 2, "no new model calls while the breaker is open")
        llm._down_until = 0.0  # close the breaker for the other tests

    def test_deployment_helpers(self):
        import os
        from unittest import mock

        from django.core.management import call_command
        from django.core.management.base import CommandError

        from munim.settings import env

        # health check: no login, touches the database
        self.assertEqual(APIClient().get("/api/health").json(), {"ok": True})
        # the read-only role can be (re)created from READONLY_DATABASE_URL on a host with no init script
        call_command("ensure_readonly_role", verbosity=0)
        # seed_demo refuses to wipe a database when DEMO_MODE is off
        with override_settings(DEMO_MODE=False), self.assertRaises(CommandError):
            call_command("seed_demo", verbosity=0)
        # a '#' inside a password survives; a trailing " # comment" is stripped
        with mock.patch.dict(os.environ, {"T_PW": "ab#cd", "T_C": "value   # a comment"}):
            self.assertEqual((env("T_PW"), env("T_C")), ("ab#cd", "value"))

    def test_language_preference_changes_answers_and_briefing(self):
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=Path(tmp)):
            client = login(LAKSHMI)
            self.assertEqual(client.get("/api/me").json()["language"], "te-IN")
            self.assertEqual(client.patch("/api/me", {"language": "en-IN"}, format="json").json()["language"], "en-IN")
            briefing = client.get("/api/briefing").json()
            self.assertEqual(briefing["language"], "en-IN")
            self.assertTrue(briefing["text_local"].startswith("Yesterday you earned Rs 8,200"))
            answer = client.post("/api/ask", {"text": "Why is my settlement short?"}, format="multipart").json()
            self.assertEqual(answer["language"], "en-IN")
            self.assertTrue(answer["answer_local"].startswith("Your 9 Nov settlement"))
            client.patch("/api/me", {"language": "hi-IN"}, format="json")
            self.assertIn("रुपये", client.get("/api/briefing").json()["text_local"])
            self.assertEqual(client.patch("/api/me", {"language": "xx-XX"}, format="json").status_code, 400)
